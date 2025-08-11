import { sendEmail } from '../src/lib/email.js';
import dotenv from 'dotenv';

dotenv.config();

function createPasswordResetEmailWithFallback(name: string, email: string) {
    const platformUrl = 'https://communityx.xcelerator.in';
    const resetUrl = `${platformUrl}/auth/forgot-password`;

    return {
        subject: 'Password Reset Enabled - CommunityX Platform',
        html: `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - CommunityX</title>
        <style>
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                line-height: 1.6; 
                color: #333; 
                margin: 0; 
                padding: 0; 
                background-color: #f4f4f4; 
            }
            .container { 
                max-width: 600px; 
                margin: 0 auto; 
                background-color: #ffffff; 
                box-shadow: 0 0 10px rgba(0,0,0,0.1); 
            }
            .header { 
                text-align: center; 
                padding: 30px 20px; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white; 
            }
            .logo { 
                max-width: 200px; 
                height: auto; 
                margin-bottom: 20px; 
                display: block;
                margin-left: auto;
                margin-right: auto;
            }
            .logo-fallback {
                font-size: 32px;
                font-weight: bold;
                color: #ffffff;
                margin-bottom: 20px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                display: none;
            }
            .content { 
                padding: 30px 20px; 
            }
            .welcome-text {
                font-size: 24px;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 20px;
                text-align: center;
            }
            .credentials { 
                background: #f8f9fa; 
                padding: 25px; 
                border-radius: 8px; 
                margin: 25px 0; 
                border-left: 4px solid #667eea;
            }
            .credential-item {
                margin: 10px 0;
                padding: 8px 0;
            }
            .credential-label {
                font-weight: bold;
                color: #495057;
                display: inline-block;
                width: 80px;
            }
            .credential-value {
                color: #6c757d;
                font-family: 'Courier New', monospace;
                background: #e9ecef;
                padding: 2px 6px;
                border-radius: 3px;
            }
            .reset-button { 
                display: inline-block; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                color: white; 
                padding: 15px 30px; 
                text-decoration: none; 
                border-radius: 25px; 
                margin: 20px 0; 
                font-weight: bold;
                text-align: center;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                transition: all 0.3s ease;
            }
            .reset-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
            }
            .security-note {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 5px;
                padding: 15px;
                margin: 20px 0;
                color: #856404;
            }
            .footer { 
                text-align: center; 
                margin-top: 30px; 
                color: #6c757d; 
                font-size: 14px; 
                padding: 20px;
                border-top: 1px solid #e9ecef;
            }
            .features {
                background: #e8f4fd;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }
            .features h3 {
                color: #2c3e50;
                margin-top: 0;
            }
            .features ul {
                margin: 10px 0;
                padding-left: 20px;
            }
            .features li {
                margin: 5px 0;
                color: #495057;
            }
            .logo-text {
                font-size: 28px;
                font-weight: bold;
                color: #ffffff;
                margin-bottom: 10px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <!-- AIT logo image with fallback text -->
                <img src="https://bucket.xcelerator.co.in/AIT_LOGO.png" 
                     alt="AIT Logo" 
                     class="logo" 
                     style="max-width: 200px; height: auto; margin-bottom: 20px; display: block; margin-left: auto; margin-right: auto; border: 0; outline: none; text-decoration: none;"
                     width="200"
                     height="auto"
                     onerror="this.style.display='none'; document.querySelector('.logo-fallback').style.display='block';">
                
                <!-- Fallback text logo if image fails to load -->
                <div class="logo-fallback" style="font-size: 32px; font-weight: bold; color: #ffffff; margin-bottom: 20px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                    🏛️ AIT
                </div>
                
                <h1 style="margin: 0; font-size: 24px; color: #ffffff;">CommunityX Platform</h1>
            </div>
            
            <div class="content">
                <div class="welcome-text">Hello ${name}! 🔐</div>
                
                <p>We hope this message finds you well. We're reaching out to inform you that password reset functionality has been enabled for your CommunityX account.</p>
                
                <div class="credentials">
                    <h3>📧 Your Account Details:</h3>
                    <div class="credential-item">
                        <span class="credential-label">Email:</span>
                        <span class="credential-value">${email}</span>
                    </div>
                </div>
                
                <div style="text-align: center;">
                    <a href="${resetUrl}" class="reset-button" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; text-align: center; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">🔄 Reset Your Password</a>
                </div>
                
                <div class="security-note">
                    <strong>🔒 Security Notice:</strong> For security reasons, we recommend setting a strong, unique password that you haven't used elsewhere.
                </div>
                
                <div class="google-signin-note" style="background: #e8f5e8; border: 1px solid #c3e6c3; border-radius: 5px; padding: 15px; margin: 20px 0; color: #2d5a2d;">
                    <strong>🔐 Sign-in Tip:</strong> We suggest you use Google sign-in with your email ID provided by Atria Institute of Technology for a seamless experience.
                </div>
                
                <div class="features">
                    <h3>🌟 What you can do on our platform:</h3>
                    <ul>
                        <li>Join academic and professional communities</li>
                        <li>Collaborate with fellow students and faculty</li>
                        <li>Share knowledge and experiences</li>
                        <li>Participate in discussions and forums</li>
                        <li>Access exclusive educational resources</li>
                    </ul>
                </div>
                
                <p>If you have any questions or need assistance, please don't hesitate to reach out to our support team.</p>
                
                <p>Best regards,<br>
                <strong>The CommunityX Team</strong><br>
                <em>Atria Institute of Technology</em></p>
            </div>
            
            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>If you have any questions, please contact our support team.</p>
            </div>
        </div>
    </body>
    </html>
    `,
    };
}

async function testPasswordResetEmailWithFallback() {
    const testEmail = 'ranjan@xcelerator.co.in';
    const testName = 'Ranjan';

    console.log('🧪 Testing password reset email with fallback logo...');
    console.log(`📧 Sending test email to: ${testEmail}`);

    try {
        const emailContent = createPasswordResetEmailWithFallback(
            testName,
            testEmail,
        );

        console.log('📝 Email content generated successfully');
        console.log(`📋 Subject: ${emailContent.subject}`);
        console.log(
            '🖼️  Logo URL: https://bucket.xcelerator.co.in/AIT_LOGO.png',
        );
        console.log('🔄 Fallback: Text-based logo if image fails to load');

        const result = await sendEmail({
            to: testEmail,
            subject: emailContent.subject,
            html: emailContent.html,
        });

        if (result.success) {
            console.log('✅ Test email sent successfully!');
            console.log(`📨 Message ID: ${result.data?.id}`);
            console.log(
                '\n📧 Check your inbox at ranjan@xcelerator.co.in to see how the email looks',
            );
            console.log('\n🔗 The email should contain:');
            console.log('   - AIT logo in the header (or fallback text logo)');
            console.log('   - Personalized greeting with your name');
            console.log('   - Password reset information');
            console.log('   - Reset button linking to the platform');
            console.log('   - Professional styling and branding');
            console.log(
                '\n💡 This version includes a fallback text logo (🏛️ AIT) if the image fails to load.',
            );
        } else {
            console.error('❌ Failed to send test email:', result.error);
        }
    } catch (error) {
        console.error('💥 Exception while sending test email:', error);
    }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
    testPasswordResetEmailWithFallback()
        .then(() => {
            console.log('\n🎯 Test completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Test failed:', error);
            process.exit(1);
        });
}
