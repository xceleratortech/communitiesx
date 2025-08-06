require('dotenv').config({ path: '.env' });

import { sendEmail } from '@/lib/email';

// Test email function
async function testEmail() {
    console.log('🧪 Testing email functionality...');

    console.log('\n🔍 Current Environment Check:');
    console.log('DEFAULT_EMAIL_FROM:', process.env.DEFAULT_EMAIL_FROM);
    console.log('SMTP_HOST:', process.env.SMTP_HOST);
    console.log('SMTP_PORT:', process.env.SMTP_PORT);
    console.log('SMTP_USER:', process.env.SMTP_USER);
    console.log('SMTP_SECURE:', process.env.SMTP_SECURE);
    console.log('SMTP_PASS defined:', !!process.env.SMTP_PASS);
    console.log('Current working directory:', process.cwd());
    console.log('.env file exists:', require('fs').existsSync('.env'));

    // Show what should be expected
    console.log('\n🎯 Expected values:');
    console.log('SMTP_HOST should be: smtp.zeptomail.in');
    console.log('SMTP_PORT should be: 465');
    console.log('SMTP_SECURE should be: true');
    console.log('');

    const testEmailData = {
        to: 'ranjan@xcelerator.co.in',
        subject: 'Email Test - TiE Communities Platform',
        html: `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Test</title>
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
                margin: 20px auto; 
                background-color: #ffffff; 
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
                border-radius: 8px;
                overflow: hidden;
            }
            .header { 
                text-align: center; 
                padding: 30px 20px; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white; 
            }
            .content { 
                padding: 30px 20px; 
                text-align: center;
            }
            .test-badge {
                display: inline-block;
                background: #28a745;
                color: white;
                padding: 10px 20px;
                border-radius: 25px;
                font-weight: bold;
                margin: 20px 0;
                font-size: 18px;
            }
            .info-box {
                background: #e8f4fd;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                border-left: 4px solid #667eea;
            }
            .footer { 
                text-align: center; 
                padding: 20px;
                background-color: #f8f9fa;
                color: #6c757d; 
                font-size: 14px; 
            }
            .emoji {
                font-size: 24px;
                margin: 10px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0; font-size: 28px;">🧪 Email System Test</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">TiE Communities Platform</p>
            </div>
            
            <div class="content">
                <div class="emoji">✅</div>
                <div class="test-badge">EMAIL TEST SUCCESSFUL!</div>
                
                <h2 style="color: #2c3e50; margin-top: 30px;">Email Configuration Working</h2>
                
                <div class="info-box">
                    <h3 style="margin-top: 0; color: #2c3e50;">Test Details:</h3>
                    <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                    <p><strong>Recipient:</strong> ranjan@xcelerator.co.in</p>
                    <p><strong>System:</strong> TiE Communities Platform</p>
                    <p><strong>Status:</strong> Email delivery system is operational</p>
                </div>
                
                <p style="font-size: 18px; color: #495057;">
                    If you're receiving this email, it means the email configuration 
                    is working correctly and ready for user onboarding! 🎉
                </p>
                
                <div style="margin-top: 30px;">
                    <p style="color: #6c757d;">
                        <em>This is a test email to verify email functionality.</em>
                    </p>
                </div>
            </div>
            
            <div class="footer">
                <p>This is an automated test message from TiE Communities Platform</p>
                <p>Email system verification completed successfully</p>
            </div>
        </div>
    </body>
    </html>
    `,
    };

    try {
        console.log(`📧 Sending test email to: ${testEmailData.to}`);
        console.log(`📋 Subject: ${testEmailData.subject}`);

        const result = await sendEmail(testEmailData);

        if (result.success) {
            console.log('✅ Test email sent successfully!');
            console.log('📊 Email system is working properly');
            console.log('🎉 Ready for user onboarding process');
        } else {
            console.log('❌ Failed to send test email');
            console.log('Error:', result.error);
        }
    } catch (error) {
        console.log('❌ Error sending test email:', error);
    } finally {
        console.log('\n🏁 Email test completed');
        process.exit(0);
    }
}

// Run the test
testEmail();
