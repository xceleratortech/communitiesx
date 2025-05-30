const { Resend } = require('resend');
require('dotenv').config();

async function testEmail() {
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: 'delivered@resend.dev',
            subject: 'Test Email',
            html: '<p>This is a test email</p>',
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

testEmail();
