import os
import re
import uuid
import logging
from django.conf import settings
from rest_framework.exceptions import ValidationError
import cloudinary
import cloudinary.uploader
import cloudinary.api

logger = logging.getLogger(__name__)

# Allowed target folders in Cloudinary to prevent arbitrary path traversal
ALLOWED_CLOUDINARY_FOLDERS = {
    "products": "corvun/products",
    "brands": "corvun/brands",
    "banners": "corvun/banners",
}

DEFAULT_MAX_IMAGE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB

DEFAULT_ALLOWED_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".avif",
    ".gif",
    ".svg",
    ".bmp",
    ".ico",
}


def is_cloudinary_url(url: str) -> bool:
    """
    Checks if a URL string points to a Cloudinary-hosted asset.
    """
    if not url or not isinstance(url, str):
        return False
    return "res.cloudinary.com" in url or "cloudinary.com" in url


def extract_public_id_from_url(url: str) -> str | None:
    """
    Extracts the Cloudinary public_id (including folder path) from a secure URL.
    E.g.:
    https://res.cloudinary.com/xyz/image/upload/v1740000000/corvun/products/abc123_intel.png
    -> 'corvun/products/abc123_intel'
    """
    if not is_cloudinary_url(url):
        return None

    # Match /image/upload/(optional v\d+/)(corvun/(products|brands|banners)/<id>)
    match = re.search(
        r"/image/upload/(?:v\d+/)?(corvun/(?:products|brands|banners)/.+?)(?:\.[a-zA-Z0-9]+)?(?:\?|$)",
        url,
    )
    if match:
        return match.group(1)

    # General fallback for any folder structure under /image/upload/
    match_general = re.search(
        r"/image/upload/(?:v\d+/)?(.+?)(?:\.[a-zA-Z0-9]+)?(?:\?|$)",
        url,
    )
    if match_general:
        return match_general.group(1)

    return None


def sanitize_filename(filename: str, max_length: int = 50) -> str:
    """
    Sanitizes filename removing extension, spaces, and special characters.
    """
    base_name = os.path.splitext(os.path.basename(filename))[0]
    clean = re.sub(r"[^a-zA-Z0-9_\-]", "_", base_name)
    clean = re.sub(r"_+", "_", clean).strip("_")
    return clean[:max_length] if clean else "image"


def upload_image_to_cloudinary(
    file_obj,
    folder_type: str = "products",
    allowed_extensions: set[str] | list[str] | None = None,
    max_size_bytes: int = DEFAULT_MAX_IMAGE_SIZE_BYTES,
) -> dict:
    """
    Validates an uploaded image and uploads it securely to Cloudinary.

    :param file_obj: Django UploadedFile, file-like object, or filepath string
    :param folder_type: Target category ("products", "brands", "banners")
    :param allowed_extensions: Set/list of permitted file extensions (e.g. {'.png', '.jpg'})
    :param max_size_bytes: Maximum allowed size in bytes (default: 25MB)
    :return: dict with keys {"secure_url": str, "public_id": str}
    :raises: ValidationError if file is invalid or upload fails
    """
    if not file_obj:
        raise ValidationError("No image file provided.")

    folder = ALLOWED_CLOUDINARY_FOLDERS.get(folder_type)
    if not folder:
        raise ValidationError(f"Invalid upload destination: {folder_type}")

    # Determine filename and size
    filename = getattr(file_obj, "name", None) or (
        os.path.basename(file_obj) if isinstance(file_obj, str) else "upload.jpg"
    )
    ext = os.path.splitext(filename)[1].lower()

    valid_exts = set(allowed_extensions or DEFAULT_ALLOWED_EXTENSIONS)
    if ext not in valid_exts:
        raise ValidationError(
            f"Unsupported file format '{ext}'. Allowed formats: {', '.join(sorted(valid_exts))}"
        )

    # Validate file size
    file_size = getattr(file_obj, "size", None)
    if file_size is None and isinstance(file_obj, str) and os.path.isfile(file_obj):
        file_size = os.path.getsize(file_obj)

    if file_size and file_size > max_size_bytes:
        limit_mb = max_size_bytes / (1024 * 1024)
        actual_mb = file_size / (1024 * 1024)
        raise ValidationError(
            f"File size ({actual_mb:.1f}MB) exceeds the maximum limit of {limit_mb:.0f}MB."
        )

    # Validate MIME type if available on uploaded file
    content_type = getattr(file_obj, "content_type", "")
    if content_type and not content_type.startswith("image/") and ext != ".svg":
        raise ValidationError("Uploaded file must be a valid image.")

    # Generate a unique, deterministic public ID
    clean_name = sanitize_filename(filename)
    unique_suffix = uuid.uuid4().hex[:10]
    public_id = f"{unique_suffix}_{clean_name}"

    try:
        # Rewind file pointer if supported
        if hasattr(file_obj, "seek") and callable(file_obj.seek):
            file_obj.seek(0)

        upload_result = cloudinary.uploader.upload(
            file_obj,
            folder=folder,
            public_id=public_id,
            overwrite=True,
            resource_type="image",
            use_filename=False,
            unique_filename=False,
        )

        secure_url = upload_result.get("secure_url") or upload_result.get("url")
        full_public_id = upload_result.get("public_id") or f"{folder}/{public_id}"

        if not secure_url:
            raise ValidationError("Cloudinary upload did not return a secure URL.")

        return {
            "secure_url": secure_url,
            "public_id": full_public_id,
        }

    except ValidationError:
        raise
    except Exception as exc:
        logger.error(
            "Cloudinary upload failed for %s to %s: %s",
            filename,
            folder,
            str(exc),
            exc_info=True,
        )
        raise ValidationError(f"Failed to upload image to Cloudinary: {str(exc)}")


def delete_image_from_cloudinary(url_or_public_id: str) -> bool:
    """
    Deletes an asset from Cloudinary using either its secure URL or public_id.
    Safely ignores non-Cloudinary / local media paths.
    """
    if not url_or_public_id or not isinstance(url_or_public_id, str):
        return False

    public_id = url_or_public_id
    if is_cloudinary_url(url_or_public_id):
        extracted = extract_public_id_from_url(url_or_public_id)
        if not extracted:
            logger.warning(
                "Could not extract Cloudinary public_id from URL: %s",
                url_or_public_id,
            )
            return False
        public_id = extracted

    # Only delete assets within our application namespace
    if not public_id.startswith("corvun/"):
        logger.warning(
            "Refusing to delete asset outside 'corvun/' namespace: %s",
            public_id,
        )
        return False

    try:
        result = cloudinary.uploader.destroy(public_id, invalidate=True)
        is_success = result.get("result") in ["ok", "not found"]
        if not is_success:
            logger.warning(
                "Cloudinary destroy returned unexpected status for %s: %s",
                public_id,
                result,
            )
        return is_success
    except Exception as exc:
        logger.error(
            "Error deleting Cloudinary asset %s: %s",
            public_id,
            str(exc),
            exc_info=True,
        )
        return False
