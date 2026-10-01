from rest_framework import status
from rest_framework.decorators import api_view,permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.hashers import check_password
from django.utils import timezone
from .permissions import IsAdmin



from .models import User,EmailOTP
from .validators import validate_password
from .utils import create_email_otp, send_otp_email
from .serializers import SignupSerializer

@api_view(["POST"])
def signup(request):

    serializer = SignupSerializer(data=request.data)

    # Validate all signup data
    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Create the user
        user = serializer.save()

        # Create OTP
        otp = create_email_otp(user)

        # Send OTP to user's email
        send_otp_email(user.email, otp)

    except Exception:
        return Response({
        "error": "Something went wrong. Please try again later."
    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response(
        {
            "message": "Signup successful. Please verify your email."
        },
        status=status.HTTP_201_CREATED
    )


@api_view(["POST"])
def verify_otp(request):

    email = request.data.get("email")
    otp = request.data.get("otp")

    # Check required fields
    if not email or not otp:
        return Response({
        "error": "Email and OTP are required."},
            status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)

    except User.DoesNotExist:
        return Response({
        "error": "User not found."},
        status=status.HTTP_404_NOT_FOUND)

    try:
        email_otp = EmailOTP.objects.get(
            user=user,
            purpose="signup")

    except EmailOTP.DoesNotExist:
        return Response({
        "error": "OTP not found. Please request a new OTP."},
        status=status.HTTP_400_BAD_REQUEST)

    # Check OTP expiry
    if email_otp.expires_at < timezone.now():
        return Response({
        "error": "OTP has expired."},
        status=status.HTTP_400_BAD_REQUEST)

    # Check OTP
    if not check_password(otp, email_otp.otp_hash):

        email_otp.attempts += 1
        email_otp.save()

        return Response({
            "error": "Invalid OTP."},
        status=status.HTTP_400_BAD_REQUEST)

    # Verify user's email
    user.email_verified = True
    user.save()

    # Delete OTP after successful verification
    email_otp.delete()

    return Response({
        "message": "Email verified successfully."},
        status=status.HTTP_200_OK)

@api_view(["POST"])
def login(request):
    email = request.data.get("email")
    password = request.data.get("password")

    if not email or not password:
        return Response({
            "error" : "Email and password are required"
        },status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)

    except User.DoesNotExist:
        return Response({
            "error" : "Invalid email or password."
        },status=status.HTTP_401_UNAUTHORIZED)

    if not user.check_password(password):
        return Response({
            "error" : "Invalid Email or Password"
        },status=status.HTTP_401_UNAUTHORIZED)

    if not user.email_verified:
        return Response({
        "error": "Please verify your email before logging in."
    }, status=status.HTTP_403_FORBIDDEN)

    if not user.is_active:
        return Response({
            "error": "Your account is inactive."
        }, status=status.HTTP_403_FORBIDDEN)

    refresh = RefreshToken.for_user(user)
    access = refresh.access_token

    return Response({
        "access": str(access),
        "refresh": str(refresh)
    },status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile(request):
    return Response({
        "id": request.user.id,
        "full_name": request.user.full_name,
        "email": request.user.email,
        "role": request.user.role
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    refresh_token = request.data.get("refresh")

    if not refresh_token:
        return Response({
            "error" : "Refresh token is required."
        },status=status.HTTP_400_BAD_REQUEST)

    try:
        token = RefreshToken(refresh_token)
        token .blacklist() #ഈ refresh token ഇനി ഉപയോഗിക്കാൻ പാടില്ല എന്ന് Django/SimpleJWT-നോട് പറയുന്നതാണ്.

    except Exception:
        return Response({
            "error" : "Invalid refresh token."
        }, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        "message": "Logout successful."
    }, status=status.HTTP_200_OK)

@api_view(["POST"])
def forgot_password(request):

    # Get the email sent by React
    email = request.data.get("email")

    # Check whether the user entered an email
    if not email:
        return Response({
            "error": "Email is required."
        }, status=status.HTTP_400_BAD_REQUEST)

    # Try to find the user using the email
    try:
        user = User.objects.get(email=email)

    # If the email does not exist in the database
    except User.DoesNotExist:
        return Response({
            "error": "Email is not registered."
        }, status=status.HTTP_404_NOT_FOUND)

    try:
        # Create password-reset OTP
        otp = create_email_otp(user, "password_reset")

        # Send OTP
        send_otp_email(user.email, otp)

    except Exception:
        return Response({
            "error": "Unable to send OTP. Please try again later."
        },status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response(
        {"message": "OTP sent to your email."
    },status=status.HTTP_200_OK)
@api_view(["POST"])
def verify_reset_otp(request):

    # Get email and OTP from React
    email = request.data.get("email")
    otp = request.data.get("otp")

    # Check whether both values were provided
    if not email or not otp:
        return Response({
            "error": "Email and OTP are required."
        }, status=status.HTTP_400_BAD_REQUEST)

    email = email.strip().lower()

    # Try to find the user
    try:
        user = User.objects.get(email=email)

    # If the email does not exist
    except User.DoesNotExist:
        return Response({
            "error": "User not found."
        }, status=status.HTTP_404_NOT_FOUND)

    # Try to find the OTP belonging to this user
    try:
        email_otp = EmailOTP.objects.get(user=user,purpose="password_reset")

    # If there is no OTP
    except EmailOTP.DoesNotExist:
        return Response({
            "error": "OTP not found."
        }, status=status.HTTP_400_BAD_REQUEST)

    # Check whether the OTP has expired
    if email_otp.expires_at < timezone.now():
        return Response({
            "error": "OTP has expired."
        }, status=status.HTTP_400_BAD_REQUEST)

    # Check whether the entered OTP matches the saved OTP hash
    if not check_password(otp, email_otp.otp_hash):
        email_otp.attempts += 1
        email_otp.save()
        return Response({
            "error": "Invalid OTP."
        }, status=status.HTTP_400_BAD_REQUEST)

      # Allow the user to reset the password
    user.password_reset_verified = True
    user.save()

    # Delete the used OTP
    email_otp.delete()

    # OTP is correct
    return Response({
        "message": "OTP verified successfully."
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
def reset_password(request):

    # Get email and new passwords from React
    email = request.data.get("email")
    new_password = request.data.get("new_password")
    confirm_password = request.data.get("confirm_password")

    # Check whether all fields are provided
    if not email or not new_password or not confirm_password:
        return Response({
            "error": "All fields are required."
        }, status=status.HTTP_400_BAD_REQUEST)

    # Clean email
    email = email.strip().lower()

    # Check whether both passwords are the same
    if new_password != confirm_password:
        return Response({
            "error": "Passwords do not match."
        }, status=status.HTTP_400_BAD_REQUEST)

    # Check password strength
    if not validate_password(new_password):
        return Response({
            "error": "Password must contain at least 8 characters, uppercase, lowercase, number and special character."
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)

    # If the email does not exist
    except User.DoesNotExist:
        return Response({
            "error": "User not found."
        }, status=status.HTTP_404_NOT_FOUND)

    # Check whether the user verified the reset OTP
    if not user.password_reset_verified:
        return Response({
            "error": "Please verify OTP first."
        }, status=status.HTTP_400_BAD_REQUEST)


    # Set the new password
    user.set_password(new_password)

     # Reset OTP verification status
    user.password_reset_verified = False
    user.save()

    # Send success response to React
    return Response({
        "message": "Password reset successfully."
    }, status=status.HTTP_200_OK)

@api_view(["GET"])
@permission_classes([IsAdmin])
def admin_test(request):

    # This response is returned only to admins
    return Response({
        "message": "Admin access successful."
    }, status=status.HTTP_200_OK)

@api_view(["GET"])
@permission_classes([IsAdmin])
def admin_users(request):

    # Get all users from the database
    users = User.objects.all()

    # Create an empty list for user details
    user_list = []

    # Go through each user
    for user in users:

        # Add the user's information to the list
        user_list.append({
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "status": user.status,
            "email_verified": user.email_verified,
            "created_at": user.created_at
        })

    # Send the user list to the admin
    return Response({
        "users": user_list
    }, status=status.HTTP_200_OK)


@api_view(["PATCH"])
@permission_classes([IsAdmin])
def block_user(request, user_id):

    # Find the user using the user ID
    try:
        user = User.objects.get(id=user_id)

    # If the user does not exist
    except User.DoesNotExist:
        return Response({
            "error": "User not found."
        }, status=status.HTTP_404_NOT_FOUND)

    # Block the user
    user.status = "blocked"
    user.is_active = False

    # Save the changes
    user.save()

    # Send response to React
    return Response({
        "message": "User blocked successfully."
    }, status=status.HTTP_200_OK)

@api_view(["PATCH"])
@permission_classes([IsAdmin])
def unblock_user(request, user_id):

    # Find the user using the user ID
    try:
        user = User.objects.get(id=user_id)

    # If the user does not exist
    except User.DoesNotExist:
        return Response({
            "error": "User not found."
        }, status=status.HTTP_404_NOT_FOUND)

    # Unblock the user
    user.status = "active"
    user.is_active = True

    # Save the changes
    user.save()

    # Send response to React
    return Response({
        "message": "User unblocked successfully."
    }, status=status.HTTP_200_OK)

@api_view(["GET"])
@permission_classes([IsAdmin])
def admin_users(request):

    # Get the search text from React
    search = request.query_params.get("search", "")

    # Get all users
    users = User.objects.all()

    # Search by name or email
    if search:
        users = users.filter(
            full_name__icontains=search
        ) | users.filter(
            email__icontains=search
        )

    # Create an empty list
    user_list = []

    # Go through each user
    for user in users:

        # Add user details to the list
        user_list.append({
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "status": user.status,
            "email_verified": user.email_verified,
            "created_at": user.created_at
        })

    # Send the users to React
    return Response({
        "users": user_list
    }, status=status.HTTP_200_OK)

@api_view(["GET"])
@permission_classes([IsAdmin])
def admin_user_detail(request, user_id):

    # Find the user using the user ID
    try:
        user = User.objects.get(id=user_id)

    # If the user does not exist
    except User.DoesNotExist:
        return Response({
            "error": "User not found."
        }, status=status.HTTP_404_NOT_FOUND)

    # Send the user's details
    return Response({
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "date_of_birth": user.date_of_birth,
        "gender": user.gender,
        "role": user.role,
        "status": user.status,
        "email_verified": user.email_verified,
        "phone_verified": user.phone_verified,
        "created_at": user.created_at
    }, status=status.HTTP_200_OK)