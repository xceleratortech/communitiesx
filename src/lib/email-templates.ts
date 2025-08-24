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

export function createWelcomeEmail(url: string, orgLogo?: string) {
    return {
        subject: 'Welcome to CommunityX',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome Email</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f2f2f2; font-family: Arial, sans-serif;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f2f2f2">
                    <tr>
                        <td align="center" style="padding: 30px 15px;">
                            <!-- Main Container -->
                            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border: 8px solid #d9d9d9;">
                                
                                <!-- Header with Two Logos and Spacing -->
                                <tr>
                                    <td style="padding: 0;">
                                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                                            <tr>
                                                <td align="left" style="padding: 10px 0 10px 20px;">
                                                    <img src="https://bucket.xcelerator.co.in/xcelerator-dark.png" alt="Xcelerator Logo" style="display:block; max-width:120px;">    
                                                </td>
                                                <td align="right" style="padding: 10px 20px 10px 0;">
                                                    ${
                                                        orgLogo
                                                            ? `<img src="${orgLogo}" alt="Organization Logo" style="display:block; max-width:120px;">`
                                                            : ''
                                                    }
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                
                                <!-- Welcome Section -->
                                <tr>
                                    <td style="background-color: #625A96; color: #ffffff; text-align: left; padding: 40px;">
                                        <h1 style="margin: 0; font-size: 30px; font-weight: bold;">Welcome aboard!</h1>
                                        <p style="margin: 15px 0 0; font-size: 20px;">You're now part of our community platform!</p>
                                    </td>
                                </tr>
                                
                                <!-- Body Content -->
                                <tr>
                                    <td style="padding: 40px 50px; color: #333333; font-size: 16px; line-height: 28px;">
                                        <p style="margin-bottom: 25px;">Here's your access link: <a href="${url}" style="color: #3366cc; text-decoration: none;">${url}</a></p>
                                        
                                        <p style="margin-bottom: 15px;"><strong>To log in:</strong></p>
                                        <ol style="padding-left: 20px; margin: 0 0 25px 0;">
                                            <li style="margin-bottom: 10px;">Enter the email ID where you received this mail,</li>
                                            <li style="margin-bottom: 10px;">Click on "Login using OTP.",</li>
                                            <li style="margin-bottom: 10px;">An OTP will be sent to the same email ID,</li>
                                            <li style="margin-bottom: 10px;">Enter the OTP to complete your login.</li>
                                        </ol>
                                        
                                        <p style="margin: 30px 0;">We look forward to connecting with you and building a vibrant community together.</p>
                                        
                                        <p style="font-weight: bold; margin-top: 30px;">Best regards,<br>Xcelerator</p>
                                    </td>
                                </tr>
                                
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `,
    };
}
