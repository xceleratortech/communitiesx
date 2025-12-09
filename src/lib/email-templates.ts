export function createVerificationEmail(url: string) {
    return {
        subject: 'Verify Your Email Address: CommunityX Platform',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Email Verification</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f2f2f2; font-family: Arial, sans-serif;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f2f2f2">
                    <tr>
                        <td align="center" style="padding: 30px 15px;">
                            <!-- Main Container -->
                            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border: 8px solid #d9d9d9;">
                                
                                <!-- Header with Xcelerator Logo -->
                                <tr>
                                    <td style="padding: 30px; text-align: center;">
                                        <img src="https://bucket.xcelerator.co.in/xcelerator-dark.png" 
                                             alt="Xcelerator Logo" 
                                             style="display:block; max-width:240px; margin: 0 auto;">
                                    </td>
                                </tr>
                                
                                <!-- Header Section -->
                                <tr>
                                    <td style="background-color: #625A96; color: #ffffff; text-align: left; padding: 40px;">
                                        <h1 style="margin: 0; font-size: 30px; font-weight: bold;">Verify your email address</h1>
                                    </td>
                                </tr>
                                
                                <!-- Content Section -->
                                <tr>
                                    <td style="padding: 40px 50px; color: #333333; font-size: 16px; line-height: 28px;">
                                        <h1 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Hello,</h1>
                                        
                                        <p style="margin-bottom: 20px;">
                                            We have received a request to update the email address associated with your Xcelerator CommunityX Platform account.
                                        </p>
                                        
                                        <p style="margin-bottom: 20px;">
                                            To complete this, please verify your email address by clicking the link below:
                                        </p>
                                        
                                        <div style="text-align: left; margin: 30px 0;">
                                            <a href="${url}" 
                                               style="display: inline-block; padding: 15px 30px; background-color: #625A96; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                                Verify Email Address
                                            </a>
                                        </div>
                                        
                                        <p style="margin-bottom: 20px;">
                                            If you did not request this change, please disregard this message. Your account will remain unchanged and secure.
                                        </p>
                                        
                                        <p style="margin-bottom: 20px;">
                                            For any assistance, contact us at <a href="mailto:support@xcelerator.co.in" style="color: #625A96;">support@xcelerator.co.in</a>.
                                        </p>
                                        
                                        <p style="font-weight: bold; margin-top: 30px;">Sincerely,<br>Xcelerator Team</p>
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

export function createResetPasswordEmail(url: string) {
    return {
        subject: 'Reset your password',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Reset Password</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f2f2f2; font-family: Arial, sans-serif;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f2f2f2">
                    <tr>
                        <td align="center" style="padding: 30px 15px;">
                            <!-- Main Container -->
                            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border: 8px solid #d9d9d9;">
                                
                                <!-- Header with Xcelerator Logo -->
                                <tr>
                                    <td style="padding: 30px; text-align: center;">
                                        <img src="https://bucket.xcelerator.co.in/xcelerator-dark.png" 
                                             alt="Xcelerator Logo" 
                                             style="display:block; max-width:240px; margin: 0 auto;">
                                    </td>
                                </tr>
                                
                                <!-- Header Section -->
                                <tr>
                                    <td style="background-color: #625A96; color: #ffffff; text-align: left; padding: 40px;">
                                        <h1 style="margin: 0; font-size: 30px; font-weight: bold;">Reset your password</h1>
                                        <p style="margin: 15px 0 0; font-size: 20px;">Click the link below to reset your password:</p>
                                    </td>
                                </tr>
                                
                                <!-- Content Section -->
                                <tr>
                                    <td style="padding: 40px 50px; color: #333333; font-size: 16px; line-height: 28px;">
                                        <p style="margin-bottom: 25px;">Click the link below to reset your password:</p>
                                        <div style="text-align: left; margin: 30px 0;">
                                            <a href="${url}" 
                                               style="display: inline-block; padding: 15px 30px; background-color: #625A96; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                                Reset Password
                                            </a>
                                        </div>
                                        
                                        <p style="margin-bottom: 20px;">
                                            If you did not request this change, please disregard this message. Your account will remain unchanged and secure.
                                        </p>
                                        
                                        <p style="margin-bottom: 20px;">
                                            For any assistance, contact us at <a href="mailto:support@xcelerator.co.in" style="color: #625A96;">support@xcelerator.co.in</a>.
                                        </p>
                                        
                                        <p style="font-weight: bold; margin-top: 30px;">Sincerely,<br>Xcelerator Team</p>
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

export function createChangeEmailVerification(url: string) {
    return {
        subject: 'Verify your new email address',
        html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your New Email Address</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f2f2f2; font-family: Arial, sans-serif;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f2f2f2">
                <tr>
                    <td align="center" style="padding: 30px 15px;">
                        <!-- Main Container -->
                        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border: 8px solid #d9d9d9;">
                            
                            <!-- Header with Xcelerator Logo -->
                            <tr>
                                <td style="padding: 30px; text-align: center;">
                                    <img src="https://bucket.xcelerator.co.in/xcelerator-dark.png" 
                                            alt="Xcelerator Logo" 
                                            style="display:block; max-width:240px; margin: 0 auto;">
                                </td>
                            </tr>
                            
                            <!-- Header Section -->
                            <tr>
                                <td style="background-color: #625A96; color: #ffffff; text-align: left; padding: 40px;">
                                    <h1 style="margin: 0; font-size: 30px; font-weight: bold;">Verify your email address</h1>
                                </td>
                            </tr>
                            
                            <!-- Content Section -->
                            <tr>
                                <td style="padding: 40px 50px; color: #333333; font-size: 16px; line-height: 28px;">
                                    <h1 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Hello,</h1>
                                    
                                    <p style="margin-bottom: 20px;">
                                        You recently requested to update your CommunityX account with new email address.
                                    </p>
                                    
                                    <p style="margin-bottom: 20px;">
                                        To complete this, please verify your new email address by clicking the link below:
                                    </p>
                                    
                                    <div style="text-align: left; margin: 30px 0;">
                                        <a href="${url}" 
                                           style="display: inline-block; padding: 15px 30px; background-color: #625A96; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                            Verify New Email Address
                                        </a>
                                    </div>
                                    
                                    <p style="margin-bottom: 20px;">
                                        If you did not request this change, please disregard this message. Your account will remain unchanged and secure.
                                    </p>
                                    
                                    <p style="margin-bottom: 20px;">
                                        For any assistance, contact us at <a href="mailto:support@xcelerator.co.in" style="color: #625A96;">support@xcelerator.co.in</a>.
                                    </p>
                                    
                                    <p style="font-weight: bold; margin-top: 30px;">Regards,<br>Xcelerator Team</p>
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

export function createDeleteAccountEmail(url: string) {
    return {
        subject: 'Confirm Account Deletion: CommunityX Platform',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Account Deletion Confirmation</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f2f2f2; font-family: Arial, sans-serif;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f2f2f2">
                    <tr>
                        <td align="center" style="padding: 30px 15px;">
                            <!-- Main Container -->
                            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border: 8px solid #d9d9d9;">
                                
                                <!-- Header with Xcelerator Logo -->
                                <tr>
                                    <td style="padding: 30px; text-align: center;">
                                        <img src="https://bucket.xcelerator.co.in/xcelerator-dark.png" 
                                             alt="Xcelerator Logo" 
                                             style="display:block; max-width:240px; margin: 0 auto;">
                                    </td>
                                </tr>
                                
                                <!-- Header Section -->
                                <tr>
                                    <td style="background-color: #625A96; color: #ffffff; text-align: left; padding: 40px;">
                                        <h1 style="margin: 0; font-size: 30px; font-weight: bold;">Confirm account deletion</h1>
                                    </td>
                                </tr>
                                
                                <!-- Content Section -->
                                <tr>
                                    <td style="padding: 40px 50px; color: #333333; font-size: 16px; line-height: 28px;">
                                        <h1 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Hello,</h1>
                                        
                                        <p style="margin-bottom: 20px;">
                                            We have received a request to delete your account on the Xcelerator CommunityX Platform account.
                                        </p>
                                        
                                        <p style="margin-bottom: 20px;">
                                            If you wish to proceed, please confirm by clicking the link below:
                                        </p>
                                        
                                        <div style="text-align: left; margin: 30px 0;">
                                            <a href="${url}" 
                                               style="display: inline-block; padding: 15px 30px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                                Confirm Account Deletion
                                            </a>
                                        </div>
                                        
                                        <div style="background-color: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px; padding: 15px; margin: 20px 0;">
                                            <p style="color: #dc2626; margin: 0; font-size: 14px; font-weight: bold;">
                                                Important: This action is permanent and cannot be undone. All associated data will be deleted.
                                            </p>
                                        </div>
                                        
                                        <p style="margin-bottom: 20px;">
                                            If you did not request this change, please ignore this email. Your account will remain active and secure.
                                        </p>
                                        
                                        <p style="margin-bottom: 20px;">
                                            For assistance, contact us at <a href="mailto:support@xcelerator.co.in" style="color: #625A96;">support@xcelerator.co.in</a>.
                                        </p>
                                        
                                        <p style="font-weight: bold; margin-top: 30px;">Sincerely,<br>Xcelerator Team</p>
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
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>OTP Verification</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f2f2f2; font-family: Arial, sans-serif;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f2f2f2">
                    <tr>
                        <td align="center" style="padding: 30px 15px;">
                            <!-- Main Container -->
                            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border: 8px solid #d9d9d9;">
                                
                                <!-- Header with Xcelerator Logo -->
                                <tr>
                                    <td style="padding: 30px; text-align: center;">
                                        <img src="https://bucket.xcelerator.co.in/xcelerator-dark.png" 
                                             alt="Xcelerator Logo" 
                                             style="display:block; max-width:240px; margin: 0 auto;">
                                    </td>
                                </tr>
                                
                                <!-- Header Section -->
                                <tr>
                                    <td style="background-color: #625A96; color: #ffffff; text-align: center; padding: 40px;">
                                        <h1 style="margin: 0; font-size: 30px; font-weight: bold;">Your ${typeLabel} Code</h1>
                                    </td>
                                </tr>
                                
                                <!-- OTP Section -->
                                <tr>
                                    <td style="padding: 40px 50px; color: #333333; font-size: 16px; line-height: 28px;">
                                        <div style="background-color: #f8fafc; border-radius: 8px; padding: 30px; text-align: center; margin-bottom: 30px;">
                                            <h2 style="color: #25364f; margin: 0 0 20px 0; font-size: 20px;">OTP to ${typeLabel}</h2>
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
                                            <p style="margin: 5px 0;">If you didn't request this code, please ignore this email.</p>
                                            <p style="margin: 5px 0;">This email was sent to ${email}</p>
                                        </div>
                                        
                                        <p style="font-weight: bold; margin-top: 30px;">Sincerely,<br>Xcelerator Team</p>
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
                                                <td align="center" style="padding: 10px 0 10px 20px;">
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

export function createInvitationEmail(
    organizationName: string,
    inviteUrl: string,
    role: string = 'user',
    isSuperAdmin: boolean = false,
) {
    const roleDisplay = role === 'admin' ? 'Administrator' : 'Member';
    const orgText = isSuperAdmin
        ? 'as a Super Administrator'
        : `to join ${organizationName}`;

    return {
        subject: `Invitation to join ${isSuperAdmin ? 'as Super Administrator' : organizationName}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Organization Invitation</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f2f2f2; font-family: Arial, sans-serif;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f2f2f2">
                    <tr>
                        <td align="center" style="padding: 30px 15px;">
                            <!-- Main Container -->
                            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border: 8px solid #d9d9d9;">
                                
                                <!-- Header with Xcelerator Logo -->
                                <tr>
                                    <td style="padding: 30px; text-align: center;">
                                        <img src="https://bucket.xcelerator.co.in/xcelerator-dark.png" 
                                             alt="Xcelerator Logo" 
                                             style="display:block; max-width:240px; margin: 0 auto;">
                                    </td>
                                </tr>
                                
                                <!-- Invitation Section -->
                                <tr>
                                    <td style="background-color: #625A96; color: #ffffff; text-align: left; padding: 40px;">
                                        <h1 style="margin: 0; font-size: 28px; font-weight: bold;">You're Invited!</h1>
                                        <p style="margin: 15px 0 0; font-size: 18px;">Join our community platform as a ${roleDisplay}</p>
                                    </td>
                                </tr>
                                
                                <!-- Body Content -->
                                <tr>
                                    <td style="padding: 40px 50px; color: #333333; font-size: 16px; line-height: 28px;">
                                        <p style="margin-bottom: 25px;">
                                            You've been invited <strong>${orgText}</strong> organization on <strong>CommunityX</strong>.
                                        </p>
                                        
                                        <p style="margin-bottom: 25px;">
                                            <strong>Role:</strong> ${roleDisplay}<br>
                                            <strong>Organization:</strong> ${isSuperAdmin ? 'Platform Super Administrator' : organizationName}
                                        </p>
                                        
                                        <div style="text-align: left; margin: 30px 0;">
                                            <a href="${inviteUrl}" 
                                               style="display: inline-block; padding: 15px 30px; background-color: #625A96; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                                Accept Invitation
                                            </a>
                                        </div>
                                        
                                        <p style="margin-bottom: 15px;"><strong>What happens next?</strong></p>
                                        <ol style="padding-left: 20px; margin: 0 0 25px 0;">
                                            <li style="margin-bottom: 10px;">Click the "Accept Invitation" button above</li>
                                            <li style="margin-bottom: 10px;">Create your account with a secure password</li>
                                            <li style="margin-bottom: 10px;">Start collaborating with your team</li>
                                        </ol>
                                        
                                        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0;">
                                            <p style="color: #92400e; margin: 0; font-size: 14px;">
                                                <strong>Important:</strong> This invitation link will expire in 7 days. Please accept it promptly.
                                            </p>
                                        </div>
                                        
                                        <p style="margin: 30px 0;">We're excited to have you join our community!</p>
                                        
                                        <p style="font-weight: bold; margin-top: 30px;">Best regards,<br>The CommunityX Team</p>
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

export function createCommunityInvitationEmail(
    communityName: string,
    inviteUrl: string,
    role: string = 'member',
) {
    const roleDisplay =
        role === 'admin'
            ? 'Administrator'
            : role === 'moderator'
              ? 'Moderator'
              : 'Member';

    return {
        subject: `You're invited to join ${communityName}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Community Invitation</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f2f2f2; font-family: Arial, sans-serif;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f2f2f2">
                    <tr>
                        <td align="center" style="padding: 30px 15px;">
                            <!-- Main Container -->
                            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border: 8px solid #d9d9d9;">
                                
                                <!-- Header with Xcelerator Logo -->
                                <tr>
                                    <td style="padding: 30px; text-align: center;">
                                        <img src="https://bucket.xcelerator.co.in/xcelerator-dark.png" 
                                             alt="Xcelerator Logo" 
                                             style="display:block; max-width:240px; margin: 0 auto;">
                                    </td>
                                </tr>
                                
                                <!-- Invitation Section -->
                                <tr>
                                    <td style="background-color: #625A96; color: #ffffff; text-align: left; padding: 40px;">
                                        <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Community Invitation!</h1>
                                        <p style="margin: 15px 0 0; font-size: 18px;">Join ${communityName} as a ${roleDisplay}</p>
                                    </td>
                                </tr>
                                
                                <!-- Body Content -->
                                <tr>
                                    <td style="padding: 40px 50px; color: #333333; font-size: 16px; line-height: 28px;">
                                        <p style="margin-bottom: 25px;">
                                            You've been invited to join the <strong>${communityName}</strong> community on <strong>CommunityX</strong>.
                                        </p>
                                        
                                        <p style="margin-bottom: 25px;">
                                            <strong>Community:</strong> ${communityName}<br>
                                            <strong>Role:</strong> ${roleDisplay}<br>
                                        </p>
                                        
                                        <div style="text-align: left; margin: 30px 0;">
                                            <a href="${inviteUrl}" 
                                               style="display: inline-block; padding: 15px 30px; background-color: #625A96; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                                Accept Invitation
                                            </a>
                                        </div>
                                        
                                        <p style="margin-bottom: 15px;"><strong>What happens next?</strong></p>
                                        <ol style="padding-left: 20px; margin: 0 0 25px 0;">
                                            <li style="margin-bottom: 10px;">Click the "Accept Invitation" button above</li>
                                            <li style="margin-bottom: 10px;">If you don't have an account, you'll be able to create one</li>
                                            <li style="margin-bottom: 10px;">Start participating in the community discussions</li>
                                        </ol>
                                        
                                        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0;">
                                            <p style="color: #92400e; margin: 0; font-size: 14px;">
                                                <strong>Important:</strong> This invitation will expire in 7 days. Please accept it promptly.
                                            </p>
                                        </div>
                                        
                                        <p style="margin: 30px 0;">We're excited to have you join the ${communityName} community!</p>
                                        
                                        <p style="font-weight: bold; margin-top: 30px;">Best regards,<br>The CommunityX Team</p>
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
