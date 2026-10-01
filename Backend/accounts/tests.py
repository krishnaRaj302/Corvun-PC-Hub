from django.test import SimpleTestCase

from accounts.validators import validate_password

class PasswordValidationTest(SimpleTestCase):

    def test_password_too_short(self):
        self.assertFalse(
            validate_password("1234"))

    def test_only_numbers(self):
        self.assertFalse(
            validate_password("11111111"))

    def test_no_uppercase(self):
        self.assertFalse(
            validate_password("password@123"))

    def test_no_special_character(self):
        self.assertFalse(
            validate_password("Password123"))

