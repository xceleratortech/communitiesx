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
            <div class="header">
                <!-- Real Xcelerator logo image -->
                <img src="https://bucket.xcelerator.co.in/xcelerator-dark.png" 
                alt="Xcelerator Logo" 
                class="logo" 
                style="max-width: 200px; height: auto; margin-bottom: 20px; display: block;  border: 0; outline: none; text-decoration: none;"
                width="200"
                height="auto">
            </div>
        <h2>Reset your password for  <span style="color:rgb(27, 51, 105);">CommunityX</span></h2>
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
                <div class="header">
                <!-- Real Xcelerator logo image -->
                <img src="https://bucket.xcelerator.co.in/xcelerator-dark.png" 
                alt="Xcelerator Logo" 
                class="logo" 
                style="max-width: 200px; height: auto; margin-bottom: 20px; display: block; margin-left: auto; margin-right: auto; border: 0; outline: none; text-decoration: none;"
                width="200"
                height="auto">
                </div>
                    <h1 style="color:rgb(28, 40, 66); margin: 0;">CommunityX</h1>
                    <p style="color: #6b7280; margin: 10px 0 0 0;">Your ${typeLabel} Code</p>
                </div>
                
                <div style="background-color: #f8fafc; border-radius: 8px; padding: 30px; text-align: center; margin-bottom: 30px;">
                    <h2 style="color:rgb(37, 54, 79); margin: 0 0 20px 0;">${typeLabel} Code</h2>
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

export function createWelcomeEmail(url: string) {
    return {
        subject: 'Welcome to CommunityX',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
                <!-- Header with dual logos -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
                    <!-- Xcelerator Logo -->
                    <div style="flex: 1;">
                        <img src="https://bucket.xcelerator.co.in/xcelerator-dark.png" 
                        alt="Xcelerator Logo" 
                        style="max-width: 150px; height: auto; border: 0; outline: none; text-decoration: none;"
                        width="150"
                        height="auto">
                    </div>
                </div>

                <!-- Welcome Banner -->
                <div style="background-color: #686AA8; padding: 30px; text-align: center; margin-bottom: 30px; border-radius: 8px;">
                    <h1 style="color: white; margin: 0 0 10px 0; font-size: 28px; font-weight: bold;">Welcome aboard!</h1>
                    <p style="color: white; margin: 0; font-size: 16px;">You're now part of our community platform!</p>
                </div>

                <!-- Main Content -->
                <div style="background-color: #ffffff; padding: 0;">
                    <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">Here's your access link:</p>
                    
                    <div style="text-align: left; margin-bottom: 30px;">
                        <a href="${url}" style="color: #2563eb; text-decoration: underline; font-size: 18px; font-weight: 500;">${url}</a>
                    </div>

                    <div style="margin-bottom: 30px;">
                        <h3 style="color: #111827; font-size: 18px; margin-bottom: 15px;">To log in:</h3>
                        <ol style="color: #374151; font-size: 16px; line-height: 1.6; padding-left: 20px;">
                            <li style="margin-bottom: 8px;">Click on "OTP" tab in the login page.</li>
                            <li style="margin-bottom: 8px;">Enter the registered email ID and click on "Send OTP."</li>
                            <li style="margin-bottom: 8px;">An OTP will be sent to the same email ID.</li>
                            <li style="margin-bottom: 8px;">Enter the OTP that you received in your email and click on "Verify OTP."</li>
                            <li style="margin-bottom: 8px;">You will be redirected to the dashboard.</li>
                            <li style="margin-bottom: 8px;">You can now start using the platform.</li>
                        </ol>
                    </div>

                    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">We look forward to connecting with you and building a vibrant community together.</p>
                </div>

                <!-- Footer -->
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #111827; font-weight: bold; margin: 0 0 5px 0;">Best regards,</p>
                    <p style="color: #111827; font-weight: bold; margin: 0;">Xcelerator</p>
                </div>
            </div>
        `,
    };
}
