# Supabase Email Templates for Slate360

## Overview
Supabase handles authentication emails (signup confirmation, password reset, etc.) using its own email templates. These templates are configured in the Supabase Dashboard, not in application code.

## How to Update Email Templates

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your Slate360 project
3. Navigate to **Authentication** → **Email Templates**
4. Update each template as shown below

---

## 1. Confirm Signup Email

### Subject Line
```
Welcome to Slate360 - Verify Your Email
```

### HTML Body
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Welcome to Slate360</h1>
              <p style="color: #e0e7ff; margin: 12px 0 0 0; font-size: 16px; font-weight: 400;">Your journey to advanced 3D visualization starts here</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">Verify Your Email Address</h2>
              <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.7; font-size: 16px;">
                Thank you for joining Slate360! To complete your registration and start exploring our powerful 3D visualization and project management tools, please verify your email address.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 16px 0 24px 0;">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #9ca3af; margin: 0; font-size: 14px; line-height: 1.6;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="{{ .ConfirmationURL }}" style="color: #667eea; word-break: break-all;">{{ .ConfirmationURL }}</a>
              </p>
              
              <p style="color: #9ca3af; margin: 24px 0 0 0; font-size: 13px;">
                This verification link will expire in 24 hours. If you didn't create an account with Slate360, please ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 30px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="color: #6b7280; margin: 0; font-size: 14px;">
                Questions? <a href="mailto:support@slate360.com" style="color: #667eea; text-decoration: none;">Contact our support team</a>
              </p>
              <p style="color: #9ca3af; margin: 12px 0 0 0; font-size: 12px;">
                © 2024 Slate360. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2. Magic Link Email

### Subject Line
```
Your Slate360 Login Link
```

### HTML Body
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Slate360</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">Your Magic Login Link</h2>
              <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.7; font-size: 16px;">
                Click the button below to securely sign in to your Slate360 account. This link is valid for one use only.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 16px 0 24px 0;">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);">
                      Sign In to Slate360
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #9ca3af; margin: 0; font-size: 13px;">
                This link expires in 1 hour. If you didn't request this email, you can safely ignore it.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 30px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                © 2024 Slate360. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 3. Reset Password Email

### Subject Line
```
Reset Your Slate360 Password
```

### HTML Body
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Slate360</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">Reset Your Password</h2>
              <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.7; font-size: 16px;">
                We received a request to reset your password. Click the button below to create a new password for your Slate360 account.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 16px 0 24px 0;">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #9ca3af; margin: 0; font-size: 13px;">
                This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
            </td>
          </tr>
          
          <!-- Security Notice -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; border-left: 4px solid #f59e0b;">
                <p style="color: #92400e; margin: 0; font-size: 13px; font-weight: 500;">
                  🔒 Security tip: Never share your password or this link with anyone. Slate360 will never ask for your password via email.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 30px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="color: #6b7280; margin: 0; font-size: 14px;">
                Need help? <a href="mailto:support@slate360.com" style="color: #667eea; text-decoration: none;">Contact support</a>
              </p>
              <p style="color: #9ca3af; margin: 12px 0 0 0; font-size: 12px;">
                © 2024 Slate360. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 4. Invite User Email

### Subject Line
```
You've Been Invited to Join Slate360
```

### HTML Body
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">You're Invited!</h1>
              <p style="color: #e0e7ff; margin: 12px 0 0 0; font-size: 16px;">Join your team on Slate360</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">Accept Your Invitation</h2>
              <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.7; font-size: 16px;">
                You've been invited to collaborate on Slate360 — a powerful platform for 3D visualization, project management, and team collaboration. Click below to accept the invitation and set up your account.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 16px 0 24px 0;">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #9ca3af; margin: 0; font-size: 13px;">
                This invitation expires in 7 days. If you weren't expecting this email, you can safely ignore it.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 30px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                © 2024 Slate360. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 5. Email Change Confirmation

### Subject Line
```
Confirm Your New Slate360 Email Address
```

### HTML Body
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Slate360</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">Confirm Your New Email</h2>
              <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.7; font-size: 16px;">
                You requested to change your email address on Slate360. Please confirm this change by clicking the button below.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 16px 0 24px 0;">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);">
                      Confirm New Email
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #9ca3af; margin: 0; font-size: 13px;">
                If you didn't request this change, please contact our support team immediately.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 30px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="color: #6b7280; margin: 0; font-size: 14px;">
                Need help? <a href="mailto:support@slate360.com" style="color: #667eea; text-decoration: none;">Contact support</a>
              </p>
              <p style="color: #9ca3af; margin: 12px 0 0 0; font-size: 12px;">
                © 2024 Slate360. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Template Variables Reference

Supabase uses Go templating syntax. Available variables:

| Variable | Description |
|----------|-------------|
| `{{ .ConfirmationURL }}` | The confirmation/action URL |
| `{{ .Token }}` | The raw token (if needed) |
| `{{ .TokenHash }}` | Hashed version of the token |
| `{{ .SiteURL }}` | Your configured site URL |
| `{{ .Email }}` | The user's email address |

---

## Testing Tips

1. After updating templates, create a test account to verify the new design
2. Check emails on multiple email clients (Gmail, Outlook, Apple Mail)
3. Test on mobile devices to ensure responsive design
4. Verify all links work correctly

---

## Redirect URL Configuration

Make sure your Supabase project has the correct redirect URLs configured:

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to your production domain (e.g., `https://slate360.com`)
3. Add **Redirect URLs**:
   - `https://slate360.com/auth/callback`
   - `https://slate360.com/auth/confirm`
   - `http://localhost:3000/auth/callback` (for development)
