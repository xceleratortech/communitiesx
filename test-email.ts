import { sendEmail } from './src/lib/email';
import {
    createVerificationEmail,
    createResetPasswordEmail,
    createChangeEmailVerification,
    createDeleteAccountEmail,
    createOTPEmail,
    createWelcomeEmail,
    createInvitationEmail,
    createCommunityInvitationEmail,
} from './src/lib/email-templates';

const TEST_EMAIL = 'arpitha@xcelerator.co.in';
const TEST_URL = 'https://example.com/test-action?token=test-token-123';

async function testEmailTemplates() {
    console.log('🧪 Testing Email Templates...\n');

    // Test 1: Verification Email
    console.log('1️⃣  Sending Verification Email...');
    const verificationEmail = createVerificationEmail(TEST_URL);
    const result1 = await sendEmail({
        to: TEST_EMAIL,
        subject: verificationEmail.subject,
        html: verificationEmail.html,
    });
    console.log(
        result1.success
            ? '✅ Sent successfully!'
            : `❌ Failed: ${result1.error}`,
    );
    console.log('');

    // Test 2: Reset Password Email
    console.log('2️⃣  Sending Reset Password Email...');
    const resetEmail = createResetPasswordEmail(TEST_URL);
    const result2 = await sendEmail({
        to: TEST_EMAIL,
        subject: resetEmail.subject,
        html: resetEmail.html,
    });
    console.log(
        result2.success
            ? '✅ Sent successfully!'
            : `❌ Failed: ${result2.error}`,
    );
    console.log('');

    // Test 3: Change Email Verification
    console.log('3️⃣  Sending Change Email Verification...');
    const changeEmailVerification = createChangeEmailVerification(TEST_URL);
    const result3 = await sendEmail({
        to: TEST_EMAIL,
        subject: changeEmailVerification.subject,
        html: changeEmailVerification.html,
    });
    console.log(
        result3.success
            ? '✅ Sent successfully!'
            : `❌ Failed: ${result3.error}`,
    );
    console.log('');

    // Test 4: Delete Account Email
    console.log('4️⃣  Sending Delete Account Email...');
    const deleteAccountEmail = createDeleteAccountEmail(TEST_URL);
    const result4 = await sendEmail({
        to: TEST_EMAIL,
        subject: deleteAccountEmail.subject,
        html: deleteAccountEmail.html,
    });
    console.log(
        result4.success
            ? '✅ Sent successfully!'
            : `❌ Failed: ${result4.error}`,
    );
    console.log('');

    // Test 5: OTP Email
    console.log('5️⃣  Sending OTP Email...');
    const otpEmail = createOTPEmail(TEST_EMAIL, '123456', 'sign-in');
    const result5 = await sendEmail({
        to: TEST_EMAIL,
        subject: otpEmail.subject,
        html: otpEmail.html,
    });
    console.log(
        result5.success
            ? '✅ Sent successfully!'
            : `❌ Failed: ${result5.error}`,
    );
    console.log('');

    // Test 6: Welcome Email
    console.log('6️⃣  Sending Welcome Email...');
    const welcomeEmail = createWelcomeEmail(TEST_URL);
    const result6 = await sendEmail({
        to: TEST_EMAIL,
        subject: welcomeEmail.subject,
        html: welcomeEmail.html,
    });
    console.log(
        result6.success
            ? '✅ Sent successfully!'
            : `❌ Failed: ${result6.error}`,
    );
    console.log('');

    // Test 7: Invitation Email
    console.log('7️⃣  Sending Invitation Email...');
    const invitationEmail = createInvitationEmail(
        'Test Organization',
        TEST_URL,
    );
    const result7 = await sendEmail({
        to: TEST_EMAIL,
        subject: invitationEmail.subject,
        html: invitationEmail.html,
    });
    console.log(
        result7.success
            ? '✅ Sent successfully!'
            : `❌ Failed: ${result7.error}`,
    );
    console.log('');

    // Test 8: Community Invitation Email
    console.log('8️⃣  Sending Community Invitation Email...');
    const communityInvitationEmail = createCommunityInvitationEmail(
        'Test Community',
        TEST_URL,
    );
    const result8 = await sendEmail({
        to: TEST_EMAIL,
        subject: communityInvitationEmail.subject,
        html: communityInvitationEmail.html,
    });
    console.log(
        result8.success
            ? '✅ Sent successfully!'
            : `❌ Failed: ${result8.error}`,
    );
    console.log('');

    console.log('✨ All tests completed!');
}

testEmailTemplates().catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
