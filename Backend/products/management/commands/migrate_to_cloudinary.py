import os
import shutil
import zipfile
from datetime import datetime
from django.core.management.base import BaseCommand
from django.conf import settings

from products.models import Brand, ProductImage
from content.models import Banner
from config.cloudinary_utils import (
    upload_image_to_cloudinary,
    is_cloudinary_url,
)


class Command(BaseCommand):
    help = (
        "Safely migrates local media images (brands, products, banners) "
        "to Cloudinary and updates PostgreSQL database records."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Simulate the migration without uploading files or updating the database.",
        )
        parser.add_argument(
            "--no-backup",
            action="store_true",
            help="Skip the automatic backup of local media files before migrating.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        skip_backup = options["no_backup"]

        self.stdout.write(self.style.MIGRATE_HEADING("=================================================="))
        self.stdout.write(self.style.MIGRATE_HEADING("CORVUN PC - Cloudinary Media Migration Utility"))
        self.stdout.write(self.style.MIGRATE_HEADING("=================================================="))

        if dry_run:
            self.stdout.write(self.style.WARNING(">>> RUNNING IN DRY-RUN MODE (No changes will be saved) <<<\n"))

        # Step 1: Backup local media files
        if not dry_run and not skip_backup:
            self.create_media_backup()

        stats = {
            "brands": {"total": 0, "migrated": 0, "skipped": 0, "failed": 0},
            "products": {"total": 0, "migrated": 0, "skipped": 0, "failed": 0},
            "banners": {"total": 0, "migrated": 0, "skipped": 0, "failed": 0},
        }

        # Step 2: Migrate Brand Logos
        self.stdout.write(self.style.HTTP_INFO("\n[1/3] Migrating Brand Logos..."))
        self.migrate_brands(dry_run, stats["brands"])

        # Step 3: Migrate Product Images
        self.stdout.write(self.style.HTTP_INFO("\n[2/3] Migrating Product Images..."))
        self.migrate_product_images(dry_run, stats["products"])

        # Step 4: Migrate Banners
        self.stdout.write(self.style.HTTP_INFO("\n[3/3] Migrating Banners..."))
        self.migrate_banners(dry_run, stats["banners"])

        # Print summary
        self.stdout.write(self.style.MIGRATE_HEADING("\n=================================================="))
        self.stdout.write(self.style.MIGRATE_HEADING("Migration Summary:"))
        self.stdout.write(self.style.MIGRATE_HEADING("=================================================="))
        for category, cat_stats in stats.items():
            self.stdout.write(
                f"{category.capitalize():<12} | "
                f"Total: {cat_stats['total']:<4} | "
                f"Migrated: {cat_stats['migrated']:<4} | "
                f"Skipped: {cat_stats['skipped']:<4} | "
                f"Failed: {cat_stats['failed']:<4}"
            )
        self.stdout.write("==================================================")
        if dry_run:
            self.stdout.write(self.style.SUCCESS("Dry-run complete. Run without --dry-run to apply changes."))
        else:
            self.stdout.write(self.style.SUCCESS("Migration finished successfully!"))

    def create_media_backup(self):
        """
        Creates a zip archive backup of MEDIA_ROOT before any migration operations.
        """
        media_root = str(settings.MEDIA_ROOT)
        if not os.path.exists(media_root):
            self.stdout.write(self.style.WARNING("Media root does not exist, skipping backup."))
            return

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = os.path.join(settings.BASE_DIR, "media_backups")
        os.makedirs(backup_dir, exist_ok=True)
        backup_zip_path = os.path.join(backup_dir, f"media_backup_{timestamp}.zip")

        self.stdout.write(f"Creating local media backup at: {backup_zip_path}")
        try:
            with zipfile.ZipFile(backup_zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
                for root, _, files in os.walk(media_root):
                    for file in files:
                        full_path = os.path.join(root, file)
                        rel_path = os.path.relpath(full_path, media_root)
                        zipf.write(full_path, rel_path)
            self.stdout.write(self.style.SUCCESS(f"Backup created successfully ({os.path.getsize(backup_zip_path)} bytes).\n"))
        except Exception as exc:
            self.stdout.write(self.style.ERROR(f"Failed to create media backup: {exc}"))

    def resolve_local_path(self, raw_path: str) -> str | None:
        """
        Converts a DB path (e.g. '/media/brands/intel.png' or 'brands/intel.png')
        to an existing absolute file path on disk.
        """
        if not raw_path or is_cloudinary_url(raw_path):
            return None

        clean_path = raw_path.strip()
        if clean_path.startswith("/media/"):
            clean_path = clean_path[len("/media/"):]
        elif clean_path.startswith("media/"):
            clean_path = clean_path[len("media/"):]
        elif clean_path.startswith("/"):
            clean_path = clean_path[1:]

        full_path = os.path.join(settings.MEDIA_ROOT, clean_path)
        if os.path.isfile(full_path):
            return full_path

        # Also check direct path relative to BASE_DIR
        alt_path = os.path.join(settings.BASE_DIR, "media", clean_path)
        if os.path.isfile(alt_path):
            return alt_path

        return None

    def migrate_brands(self, dry_run: bool, stats: dict):
        brands = Brand.objects.all().order_by("id")
        stats["total"] = brands.count()

        for brand in brands:
            if not brand.logo:
                stats["skipped"] += 1
                continue

            if is_cloudinary_url(brand.logo):
                self.stdout.write(f"  Brand #{brand.id} ({brand.name}): Already on Cloudinary, skipping.")
                stats["skipped"] += 1
                continue

            local_file = self.resolve_local_path(brand.logo)
            if not local_file:
                self.stdout.write(self.style.WARNING(f"  Brand #{brand.id} ({brand.name}): Local file '{brand.logo}' not found on disk."))
                stats["failed"] += 1
                continue

            self.stdout.write(f"  Brand #{brand.id} ({brand.name}): Found '{local_file}'")
            if dry_run:
                stats["migrated"] += 1
                continue

            try:
                allowed_extensions = {".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".avif", ".ico", ".bmp"}
                res = upload_image_to_cloudinary(
                    local_file,
                    folder_type="brands",
                    allowed_extensions=allowed_extensions,
                )
                brand.logo = res["secure_url"]
                brand.save(update_fields=["logo"])
                self.stdout.write(self.style.SUCCESS(f"    -> Uploaded to {res['secure_url']}"))
                stats["migrated"] += 1
            except Exception as exc:
                self.stdout.write(self.style.ERROR(f"    -> Upload failed: {exc}"))
                stats["failed"] += 1

    def migrate_product_images(self, dry_run: bool, stats: dict):
        images = ProductImage.objects.select_related("product").all().order_by("product_id", "sort_order", "id")
        stats["total"] = images.count()

        for img in images:
            if not img.image:
                stats["skipped"] += 1
                continue

            if is_cloudinary_url(img.image):
                self.stdout.write(f"  ProductImage #{img.id} (Prod #{img.product_id}): Already on Cloudinary, skipping.")
                stats["skipped"] += 1
                continue

            local_file = self.resolve_local_path(img.image)
            if not local_file:
                self.stdout.write(self.style.WARNING(f"  ProductImage #{img.id} (Prod #{img.product_id}): Local file '{img.image}' not found."))
                stats["failed"] += 1
                continue

            self.stdout.write(f"  ProductImage #{img.id} (Prod #{img.product_id}, Type: {img.image_type}): Found '{local_file}'")
            if dry_run:
                stats["migrated"] += 1
                continue

            try:
                allowed_extensions = {".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".avif"}
                res = upload_image_to_cloudinary(
                    local_file,
                    folder_type="products",
                    allowed_extensions=allowed_extensions,
                )
                img.image = res["secure_url"]
                img.save(update_fields=["image"])
                self.stdout.write(self.style.SUCCESS(f"    -> Uploaded to {res['secure_url']}"))
                stats["migrated"] += 1
            except Exception as exc:
                self.stdout.write(self.style.ERROR(f"    -> Upload failed: {exc}"))
                stats["failed"] += 1

    def migrate_banners(self, dry_run: bool, stats: dict):
        banners = Banner.objects.all().order_by("id")
        stats["total"] = banners.count()

        for banner in banners:
            if not banner.image:
                stats["skipped"] += 1
                continue

            if is_cloudinary_url(banner.image):
                self.stdout.write(f"  Banner #{banner.id} ({banner.title}): Already on Cloudinary, skipping.")
                stats["skipped"] += 1
                continue

            local_file = self.resolve_local_path(banner.image)
            if not local_file:
                self.stdout.write(self.style.WARNING(f"  Banner #{banner.id} ({banner.title}): Local file '{banner.image}' not found."))
                stats["failed"] += 1
                continue

            self.stdout.write(f"  Banner #{banner.id} ({banner.title}): Found '{local_file}'")
            if dry_run:
                stats["migrated"] += 1
                continue

            try:
                allowed_extensions = {".png", ".jpg", ".jpeg", ".webp", ".avif"}
                res = upload_image_to_cloudinary(
                    local_file,
                    folder_type="banners",
                    allowed_extensions=allowed_extensions,
                )
                banner.image = res["secure_url"]
                banner.save(update_fields=["image"])
                self.stdout.write(self.style.SUCCESS(f"    -> Uploaded to {res['secure_url']}"))
                stats["migrated"] += 1
            except Exception as exc:
                self.stdout.write(self.style.ERROR(f"    -> Upload failed: {exc}"))
                stats["failed"] += 1
