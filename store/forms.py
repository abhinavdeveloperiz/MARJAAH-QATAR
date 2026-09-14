from django import forms
from django.contrib.auth.forms import AuthenticationForm, SetPasswordForm
from .models import User, Address


class LoginForm(forms.Form):
    email = forms.EmailField(
        widget=forms.EmailInput(attrs={'class': 'input', 'placeholder': 'you@example.com', 'id': 'id_email'})
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={'class': 'input', 'placeholder': '••••••••', 'id': 'id_password'})
    )


class RegisterForm(forms.Form):
    full_name = forms.CharField(
        max_length=150,
        widget=forms.TextInput(attrs={'class': 'input', 'placeholder': 'Your full name', 'id': 'id_full_name'})
    )
    email = forms.EmailField(
        widget=forms.EmailInput(attrs={'class': 'input', 'placeholder': 'you@example.com', 'id': 'id_email'})
    )
    phone = forms.CharField(
        max_length=30, required=False,
        widget=forms.TextInput(attrs={'class': 'input', 'placeholder': '+974 5000 0000', 'id': 'id_phone'})
    )
    password = forms.CharField(
        min_length=8,
        widget=forms.PasswordInput(attrs={'class': 'input', 'placeholder': 'Min. 8 characters', 'id': 'id_password'})
    )
    confirm_password = forms.CharField(
        widget=forms.PasswordInput(attrs={'class': 'input', 'placeholder': 'Repeat password', 'id': 'id_confirm_password'})
    )

    def clean(self):
        cleaned_data = super().clean()
        pw = cleaned_data.get('password')
        cpw = cleaned_data.get('confirm_password')
        if pw and cpw and pw != cpw:
            raise forms.ValidationError('Passwords do not match.')
        return cleaned_data


class ForgotPasswordForm(forms.Form):
    """Step 1: User enters their email to request a password reset link."""
    email = forms.EmailField(
        label='Email address',
        widget=forms.EmailInput(attrs={
            'class': 'input',
            'placeholder': 'you@example.com',
            'id': 'id_email',
            'autofocus': True,
        })
    )

    def clean_email(self):
        email = self.cleaned_data.get('email', '').strip().lower()
        return email


class SetNewPasswordForm(forms.Form):
    """Step 3: User enters and confirms a new password (after clicking the reset link)."""
    new_password = forms.CharField(
        min_length=8,
        label='New password',
        widget=forms.PasswordInput(attrs={
            'class': 'input',
            'placeholder': 'Min. 8 characters',
            'id': 'id_new_password',
        })
    )
    confirm_password = forms.CharField(
        label='Confirm new password',
        widget=forms.PasswordInput(attrs={
            'class': 'input',
            'placeholder': 'Repeat new password',
            'id': 'id_confirm_password',
        })
    )

    def clean(self):
        cleaned_data = super().clean()
        pw = cleaned_data.get('new_password')
        cpw = cleaned_data.get('confirm_password')
        if pw and cpw and pw != cpw:
            raise forms.ValidationError('Passwords do not match.')
        return cleaned_data


class AddressForm(forms.ModelForm):
    class Meta:
        model = Address
        fields = ['label', 'full_name', 'phone', 'building', 'street', 'zone', 'city', 'country', 'is_default']
        widgets = {
            'label': forms.TextInput(attrs={'class': 'input'}),
            'full_name': forms.TextInput(attrs={'class': 'input', 'placeholder': 'Full Name'}),
            'phone': forms.TextInput(attrs={'class': 'input', 'placeholder': '+974 5000 0000'}),
            'building': forms.TextInput(attrs={'class': 'input', 'placeholder': 'Building / Villa No.'}),
            'street': forms.TextInput(attrs={'class': 'input', 'placeholder': 'Street Name'}),
            'zone': forms.TextInput(attrs={'class': 'input', 'placeholder': 'Zone / Area'}),
            'city': forms.TextInput(attrs={'class': 'input'}),
            'country': forms.TextInput(attrs={'class': 'input'}),
        }


class CheckoutForm(forms.Form):
    full_name = forms.CharField(
        max_length=150,
        widget=forms.TextInput(attrs={'class': 'input', 'placeholder': 'Full Name'})
    )
    phone = forms.CharField(
        max_length=30,
        widget=forms.TextInput(attrs={'class': 'input', 'placeholder': '+974 5000 0000'})
    )
    email = forms.EmailField(
        required=False,
        widget=forms.EmailInput(attrs={'class': 'input', 'placeholder': 'email@example.com'})
    )
    building = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={'class': 'input', 'placeholder': 'Building / Villa No.'})
    )
    street = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={'class': 'input', 'placeholder': 'Street Name'})
    )
    zone = forms.CharField(
        widget=forms.TextInput(attrs={'class': 'input', 'placeholder': 'Zone / Area'})
    )
    city = forms.CharField(
        initial='Doha',
        widget=forms.TextInput(attrs={'class': 'input'})
    )
    payment_method = forms.ChoiceField(
        choices=[
            ('cash', 'Cash on Delivery'),
            ('card', 'Credit / Debit Card'),
            ('qr', 'QR / QPay / Fawran Instant Payment'),
            ('qpay', 'QPay'),
        ],
        initial='cash',
        widget=forms.RadioSelect
    )
    # Card Payment Channel Fields
    card_holder = forms.CharField(required=False, max_length=150)
    card_number = forms.CharField(required=False, max_length=30)
    card_expiry = forms.CharField(required=False, max_length=10)
    card_cvv = forms.CharField(required=False, max_length=10)

    # QR / Instant Bank Payment Channel Fields
    qr_ref = forms.CharField(required=False, max_length=100)

    # Cash on Delivery Channel Fields
    cash_change_req = forms.CharField(required=False, max_length=100)

    notes = forms.CharField(
        required=False,
        label='Delivery notes (optional)',
        widget=forms.Textarea(attrs={
            'class': 'input',
            'rows': 2,
            'placeholder': 'E.g. Ring bell on arrival, leave at reception, etc.',
        })
    )

    def clean(self):
        cleaned_data = super().clean()
        pm = cleaned_data.get('payment_method')
        if pm == 'card':
            num = cleaned_data.get('card_number', '').replace(' ', '').replace('-', '')
            if not num or len(num) < 13:
                self.add_error('card_number', 'Please enter a valid 16-digit card number.')
            if not cleaned_data.get('card_holder'):
                self.add_error('card_holder', 'Cardholder name is required.')
            if not cleaned_data.get('card_expiry'):
                self.add_error('card_expiry', 'Expiration date is required.')
            if not cleaned_data.get('card_cvv') or len(cleaned_data.get('card_cvv', '')) < 3:
                self.add_error('card_cvv', 'Please enter a valid 3-digit CVV code.')
        return cleaned_data


class ProfileForm(forms.Form):
    first_name = forms.CharField(max_length=100, widget=forms.TextInput(attrs={'class': 'input'}))
    last_name = forms.CharField(max_length=100, required=False, widget=forms.TextInput(attrs={'class': 'input'}))
    phone = forms.CharField(max_length=30, required=False, widget=forms.TextInput(attrs={'class': 'input'}))


class ContactForm(forms.Form):
    name = forms.CharField(max_length=150, widget=forms.TextInput(attrs={'class': 'input', 'placeholder': 'Your name'}))
    email = forms.EmailField(widget=forms.EmailInput(attrs={'class': 'input', 'placeholder': 'you@example.com'}))
    phone = forms.CharField(required=False, max_length=30, widget=forms.TextInput(attrs={'class': 'input', 'placeholder': '+974 5000 0000'}))
    subject = forms.CharField(max_length=200, widget=forms.TextInput(attrs={'class': 'input', 'placeholder': 'Subject'}))
    message = forms.CharField(widget=forms.Textarea(attrs={'class': 'input', 'rows': 5, 'placeholder': 'Your message...'}))
