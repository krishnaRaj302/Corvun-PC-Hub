import random
from datetime import timedelta

from django.contrib.auth.hashers import make_password
from django.utils import timezone
from django.core.mail import send_mail

from .models import EmailOTP


# Generate a 6-digit OTP
def generate_otp():

    otp = ""

    for i in range(6):
        otp += str(random.randint(0, 9))

    return otp


# Create and save OTP for the user
def create_email_otp(user, purpose):

    # Generate a new OTP
    otp = generate_otp()

    # Hash the OTP before saving it
    otp_hash = make_password(otp)

    # OTP will expire after 5 minutes
    expires_at = timezone.now() + timedelta(minutes=5)

    # Remove old OTP of the same purpose
    EmailOTP.objects.filter(
        user=user,
        purpose=purpose
    ).delete()

    # Save the new OTP
    EmailOTP.objects.create(
        user=user,
        otp_hash=otp_hash,
        expires_at=expires_at,
        purpose=purpose
    )

    # Return the original OTP
    return otp


# Send OTP to user's email
def send_otp_email(email, otp):

    subject = "Corvun Email Verification"

    message = f"""
Welcome to Corvun.

Your OTP is: {otp}

This OTP expires in 5 minutes.
"""

    send_mail(
        subject,
        message,
        None,
        [email],
        fail_silently=False
    )