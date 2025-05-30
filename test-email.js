const { Resend } = require('resend');
require('dotenv').config();

async function testEmail() {
    console.log('API Key present:', !!process.env.RESEND_API_KEY);
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: 'delivered@resend.dev',
            subject: 'Test Email',
            html: '<p>This is a test email</p>',
        });

        console.log('Response:', { data, error });
    } catch (error) {
        console.error('Error:', error);
    }
}

testEmail();
