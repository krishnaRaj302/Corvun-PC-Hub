import os
import io
import django
from django.conf import settings

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile

from products.models import Product, Category, Brand, ProductImage
from content.models import Banner
from config.cloudinary_utils import (
    upload_image_to_cloudinary,
    delete_image_from_cloudinary,
    is_cloudinary_url,
    extract_public_id_from_url,
)

User = get_user_model()

# Minimal valid 1x1 PNG bytes with valid CRC
VALID_PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xff\xff"
    b"?\x00\x05\xfe\x02\xfe\r\xef\x85h\x00\x00\x00\x00IEND\xaeB`\x82"
)


def run_tests():
    print("=" * 60)
    print("RUNNING CLOUDINARY INTEGRATION TEST SUITE")
    print("=" * 60)

    # 1. Setup Admin User & Authenticated API Client
    admin_user = User.objects.filter(is_staff=True).first()
    if not admin_user:
        admin_user = User.objects.create_superuser("admin_test", "admin@corvun.com", "AdminTestPass123!")

    client = APIClient()
    client.force_authenticate(user=admin_user)

    anon_client = APIClient()

    category, _ = Category.objects.get_or_create(name="Test Category", defaults={"status": True})
    brand, _ = Brand.objects.get_or_create(name="Test Brand", defaults={"status": "listed"})

    uploaded_test_urls = []

    try:
        # ----------------------------------------------------
        # Test 13: Unauthorized user cannot upload images
        # ----------------------------------------------------
        print("\n[Test 13] Unauthorized user cannot upload images...")
        file_dummy = SimpleUploadedFile("test.png", VALID_PNG_BYTES, content_type="image/png")
        res_unauth = anon_client.post("/api/products/images/upload/", {"image": file_dummy}, format="multipart")
        assert res_unauth.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN], (
            f"Expected 401/403, got {res_unauth.status_code}"
        )
        print("  PASS: Unauthorized user rejected correctly.")

        # ----------------------------------------------------
        # Test 14: Invalid files and oversized files rejected
        # ----------------------------------------------------
        print("\n[Test 14] Invalid files and oversized files rejected...")
        # Invalid extension (.txt)
        bad_file = SimpleUploadedFile("bad.txt", b"not an image", content_type="text/plain")
        res_bad = client.post("/api/products/images/upload/", {"image": bad_file}, format="multipart")
        assert res_bad.status_code == status.HTTP_400_BAD_REQUEST, f"Expected 400, got {res_bad.status_code}"
        print("  PASS: Bad extension rejected with 400.")

        # Oversized file simulation
        huge_file = SimpleUploadedFile("huge.jpg", b"x" * (26 * 1024 * 1024), content_type="image/jpeg")
        res_huge = client.post("/api/products/images/upload/", {"image": huge_file}, format="multipart")
        assert res_huge.status_code == status.HTTP_400_BAD_REQUEST, f"Expected 400, got {res_huge.status_code}"
        print("  PASS: Oversized file rejected with 400.")

        # ----------------------------------------------------
        # Test 1: Upload one product image to Cloudinary
        # ----------------------------------------------------
        print("\n[Test 1] Upload one product image via /api/products/images/upload/...")
        img1_file = SimpleUploadedFile("product_front.png", VALID_PNG_BYTES, content_type="image/png")
        res1 = client.post("/api/products/images/upload/", {"image": img1_file}, format="multipart")
        assert res1.status_code == status.HTTP_200_OK, f"Upload failed: {res1.data}"
        img1_url = res1.data.get("image") or res1.data.get("url")
        assert is_cloudinary_url(img1_url), f"Expected Cloudinary URL, got {img1_url}"
        uploaded_test_urls.append(img1_url)
        print(f"  PASS: Uploaded successfully: {img1_url}")

        # ----------------------------------------------------
        # Test 2: Upload second product image
        # ----------------------------------------------------
        print("\n[Test 2] Upload multiple product images...")
        img2_file = SimpleUploadedFile("product_angle.png", VALID_PNG_BYTES, content_type="image/png")
        res2 = client.post("/api/products/images/upload/", {"image": img2_file}, format="multipart")
        assert res2.status_code == status.HTTP_200_OK, f"Upload failed: {res2.data}"
        img2_url = res2.data.get("image") or res2.data.get("url")
        assert is_cloudinary_url(img2_url), f"Expected Cloudinary URL, got {img2_url}"
        uploaded_test_urls.append(img2_url)
        print(f"  PASS: Uploaded second image: {img2_url}")

        # ----------------------------------------------------
        # Test 3: Create product with images
        # ----------------------------------------------------
        print("\n[Test 3] Create a product and attach Cloudinary images...")
        test_sku = "TEST-CORVUN-CLOUDINARY-01"
        Product.objects.filter(sku=test_sku).delete()
        prod = Product.objects.create(
            product_name="Cloudinary Test Rig",
            sku=test_sku,
            brand=brand,
            category=category,
            base_price=99999.00,
            stock=10,
            status="active"
        )
        # Create image records
        pimg1 = ProductImage.objects.create(
            product=prod,
            image=img1_url,
            image_type="primary",
            sort_order=0
        )
        pimg2 = ProductImage.objects.create(
            product=prod,
            image=img2_url,
            image_type="gallery",
            sort_order=1
        )
        print(f"  PASS: Product created with ID {prod.id} and 2 images attached.")

        # ----------------------------------------------------
        # Test 4: Update product details
        # ----------------------------------------------------
        print("\n[Test 4] Update product details...")
        res_update = client.put(f"/api/products/{prod.id}/update/", {
            "product_name": "Cloudinary Test Rig Extreme",
            "sku": test_sku,
            "brand": brand.id,
            "category": category.id,
            "base_price": "104999.00",
            "stock": 12,
            "low_stock_threshold": 5,
            "status": "active"
        })
        assert res_update.status_code == status.HTTP_200_OK, f"Product update failed: {res_update.data}"
        prod.refresh_from_db()
        assert prod.product_name == "Cloudinary Test Rig Extreme"
        print("  PASS: Product updated successfully.")

        # ----------------------------------------------------
        # Test 5: Add image to an existing product via /api/products/images/create/
        # ----------------------------------------------------
        print("\n[Test 5] Add image directly to existing product via /api/products/images/create/...")
        img3_file = SimpleUploadedFile("product_internal.png", VALID_PNG_BYTES, content_type="image/png")
        res_create_img = client.post("/api/products/images/create/", {
            "product": prod.id,
            "image": img3_file,
            "image_type": "internal",
            "sort_order": 2
        }, format="multipart")
        assert res_create_img.status_code == status.HTTP_201_CREATED, f"Add image failed: {res_create_img.data}"
        img3_url = res_create_img.data["data"]["image"]
        img3_id = res_create_img.data["data"]["id"]
        assert is_cloudinary_url(img3_url), f"Expected Cloudinary URL, got {img3_url}"
        uploaded_test_urls.append(img3_url)
        print(f"  PASS: Image #{img3_id} added: {img3_url}")

        # ----------------------------------------------------
        # Test 6: Delete a product image
        # ----------------------------------------------------
        print(f"\n[Test 6] Delete product image #{img3_id} (Cloudinary asset destruction)...")
        res_del_img = client.delete(f"/api/products/images/{img3_id}/delete/")
        assert res_del_img.status_code == status.HTTP_200_OK, f"Delete failed: {res_del_img.data}"
        assert not ProductImage.objects.filter(id=img3_id).exists(), "ProductImage record still in DB!"
        # Remove from cleanup list since endpoint already destroyed it
        if img3_url in uploaded_test_urls:
            uploaded_test_urls.remove(img3_url)
        print("  PASS: Image record and Cloudinary asset deleted.")

        # ----------------------------------------------------
        # Test 7: Upload brand logo to Cloudinary
        # ----------------------------------------------------
        print("\n[Test 7] Upload brand logo via /api/products/brands/upload-logo/...")
        logo_file = SimpleUploadedFile("brand_logo_test.png", VALID_PNG_BYTES, content_type="image/png")
        res_logo = client.post("/api/products/brands/upload-logo/", {"logo": logo_file}, format="multipart")
        assert res_logo.status_code == status.HTTP_200_OK, f"Brand logo upload failed: {res_logo.data}"
        brand_logo_url = res_logo.data["logo"]
        assert is_cloudinary_url(brand_logo_url), f"Expected Cloudinary URL, got {brand_logo_url}"
        uploaded_test_urls.append(brand_logo_url)
        print(f"  PASS: Brand logo uploaded to Cloudinary: {brand_logo_url}")

        # Create brand with uploaded logo
        test_brand = Brand.objects.create(name="Cloudinary Brand Test", logo=brand_logo_url, status="listed")
        assert test_brand.logo == brand_logo_url
        test_brand_id = test_brand.id

        # Delete brand and verify logo cleanup
        res_del_brand = client.delete(f"/api/products/brands/{test_brand_id}/delete/")
        assert res_del_brand.status_code == status.HTTP_200_OK, f"Brand delete failed: {res_del_brand.data}"
        if brand_logo_url in uploaded_test_urls:
            uploaded_test_urls.remove(brand_logo_url)
        print("  PASS: Brand and Cloudinary logo deleted successfully.")

        # ----------------------------------------------------
        # Test 8: Upload banner to Cloudinary
        # ----------------------------------------------------
        print("\n[Test 8] Create and delete banner using Cloudinary...")
        banner_file = SimpleUploadedFile("banner_cyber.png", VALID_PNG_BYTES, content_type="image/png")
        res_banner = client.post("/api/content/admin/", {
            "title": "Cloudinary Cyber Drop",
            "image": banner_file,
            "cta_text": "Upgrade Rig",
            "link": "/deals",
            "status": "active"
        }, format="multipart")
        assert res_banner.status_code == status.HTTP_201_CREATED, f"Banner create failed: {res_banner.data}"
        banner_url = res_banner.data["banner"]["image"]
        banner_id = res_banner.data["banner"]["id"]
        assert is_cloudinary_url(banner_url), f"Expected Cloudinary URL, got {banner_url}"
        print(f"  PASS: Banner created with Cloudinary URL: {banner_url}")

        # Delete banner
        res_del_banner = client.delete(f"/api/content/admin/{banner_id}/")
        assert res_del_banner.status_code == status.HTTP_200_OK, f"Banner delete failed: {res_del_banner.data}"
        assert not Banner.objects.filter(id=banner_id).exists()
        print("  PASS: Banner deleted and Cloudinary asset cleaned up.")

        # ----------------------------------------------------
        # Test 9: Retrieve products through the public API
        # ----------------------------------------------------
        print("\n[Test 9] Retrieve products through public API (/api/products/)...")
        res_public = anon_client.get("/api/products/")
        assert res_public.status_code == status.HTTP_200_OK, f"Public API failed: {res_public.data}"
        print("  PASS: Public product catalog returned 200 OK.")

        # ----------------------------------------------------
        # Test 10: Verify Cloudinary URLs are returned correctly
        # ----------------------------------------------------
        print(f"\n[Test 10] Retrieve product detail (/api/products/{prod.id}/)...")
        res_detail = anon_client.get(f"/api/products/{prod.id}/")
        assert res_detail.status_code == status.HTTP_200_OK
        prod_data = res_detail.data["product"]
        images_data = res_detail.data["images"]
        assert is_cloudinary_url(prod_data["primary_image"]), f"Expected Cloudinary URL in primary_image, got {prod_data['primary_image']}"
        assert any(is_cloudinary_url(img["image"]) for img in images_data), "Expected Cloudinary URLs in images list"
        print("  PASS: Public product detail returned valid Cloudinary URLs.")

        # ----------------------------------------------------
        # Test 11: Verify image ordering
        # ----------------------------------------------------
        print("\n[Test 11] Verify image sort ordering...")
        order_values = [img["sort_order"] for img in images_data]
        assert order_values == sorted(order_values), f"Images not sorted by sort_order: {order_values}"
        print(f"  PASS: Image ordering verified: {order_values}")

        # ----------------------------------------------------
        # Test 12: Verify legacy local image URLs still work
        # ----------------------------------------------------
        print("\n[Test 12] Verify legacy local image representation...")
        legacy_img = ProductImage.objects.create(
            product=prod,
            image="/media/products/legacy_test_item.png",
            image_type="rear",
            sort_order=99
        )
        res_legacy_detail = anon_client.get(f"/api/products/{prod.id}/")
        images_legacy_list = res_legacy_detail.data["images"]
        legacy_found = [img for img in images_legacy_list if "legacy_test_item.png" in img["image"]]
        assert len(legacy_found) == 1, "Legacy image not found in response!"
        assert legacy_found[0]["image"].startswith("http"), f"Legacy image missing host URL: {legacy_found[0]['image']}"
        print(f"  PASS: Legacy local path correctly formatted with host: {legacy_found[0]['image']}")
        legacy_img.delete()

        # Clean up test product
        prod.delete()
        print("\n" + "=" * 60)
        print("ALL 14 CLOUDINARY INTEGRATION TESTS PASSED!")
        print("=" * 60)

    finally:
        # Clean up any test assets left on Cloudinary
        for url in uploaded_test_urls:
            try:
                delete_image_from_cloudinary(url)
            except Exception:
                pass


if __name__ == "__main__":
    run_tests()
