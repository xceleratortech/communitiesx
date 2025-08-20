export function createVerificationEmail(url: string) {
    return {
        subject: 'Verify your email address',
        html: `
      <h1>Verify your email address</h1>
      <p>Click the link below to verify your email address:</p>
      <a href="${url}">${url}</a>
    `,
    };
}

export function createResetPasswordEmail(url: string) {
    return {
        subject: 'Reset your password',
        html: `
      <h1>Reset your password</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${url}">${url}</a>
    `,
    };
}

export function createChangeEmailVerification(url: string) {
    return {
        subject: 'Verify your new email address',
        html: `
      <h1>Verify your new email address</h1>
      <p>Click the link below to verify your new email address:</p>
      <a href="${url}">${url}</a>
    `,
    };
}

export function createDeleteAccountEmail(url: string) {
    return {
        subject: 'Confirm account deletion',
        html: `
      <h1>Confirm account deletion</h1>
      <p>Click the link below to confirm your account deletion:</p>
      <a href="${url}">${url}</a>
      <p>This action cannot be undone.</p>
    `,
    };
}

export function createOTPEmail(
    email: string,
    otp: string,
    type: 'sign-in' | 'email-verification' | 'forget-password',
) {
    const typeLabels = {
        'sign-in': 'Sign In',
        'email-verification': 'Email Verification',
        'forget-password': 'Password Reset',
    };

    const typeLabel = typeLabels[type];

    return {
        subject: `Your ${typeLabel} Code - CommunityX`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #2563eb; margin: 0;">CommunityX</h1>
                    <p style="color: #6b7280; margin: 10px 0 0 0;">Your ${typeLabel} Code</p>
                </div>
                
                <div style="background-color: #f8fafc; border-radius: 8px; padding: 30px; text-align: center; margin-bottom: 30px;">
                    <h2 style="color: #1f2937; margin: 0 0 20px 0;">${typeLabel} Code</h2>
                    <div style="background-color: #ffffff; border: 2px solid #e5e7eb; border-radius: 6px; padding: 20px; display: inline-block; margin: 0 auto;">
                        <span style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</span>
                    </div>
                    <p style="color: #6b7280; margin: 20px 0 0 0; font-size: 14px;">
                        This code will expire in 5 minutes
                    </p>
                </div>
                
                <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
                    <p style="color: #92400e; margin: 0; font-size: 14px;">
                        <strong>Security Notice:</strong> Never share this code with anyone. CommunityX will never ask for your verification code.
                    </p>
                </div>
                
                <div style="text-align: center; color: #6b7280; font-size: 12px;">
                    <p>If you didn't request this code, please ignore this email.</p>
                    <p>This email was sent to ${email}</p>
                </div>
            </div>
        `,
    };
}
