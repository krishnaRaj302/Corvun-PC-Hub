from django.db import models
from django.contrib.auth.models import AbstractBaseUser,BaseUserManager,PermissionsMixin




class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save()
        return user

    def create_superuser(self, email, password=None, **extra_fields):
            extra_fields.setdefault("is_staff", True)
            extra_fields.setdefault("is_superuser", True)
            extra_fields.setdefault("is_active", True)
            extra_fields.setdefault("role", "admin")

            return self.create_user(email,password,**extra_fields)


class User(AbstractBaseUser,PermissionsMixin):
    full_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20 , blank=True)
    date_of_birth = models.DateField(null=True,blank=True)
    gender = models.CharField(max_length=100, blank= True)
    role = models.CharField(max_length=100 ,default="customer")
    status = models.CharField(max_length=30,default="active")
    email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)
    referral_code = models.CharField(max_length=50,unique=True,null=True,blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    password_reset_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects =  UserManager()
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

class EmailOTP(models.Model):
    user = models.ForeignKey(User,on_delete=models.CASCADE,related_name="email_otps")
    otp_hash = models.CharField(max_length=255)
    purpose = models.CharField(max_length=30,default="signup")
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempts = models.IntegerField(default=0)