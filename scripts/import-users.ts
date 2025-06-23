import { randomUUID } from 'crypto';
import { hashPassword } from 'better-auth/crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '@/server/db';
import { orgs, users, accounts } from '@/server/db/auth-schema';
import { sendEmail } from '@/lib/email';
import { eq } from 'drizzle-orm';

interface UserData {
    name: string;
    email: string;
    institute: string;
    designation: string;
}

// Function to generate a random password
function generatePassword(length: number = 8): string {
    const charset =
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}

// Email template for user credentials
function createWelcomeEmail(name: string, email: string, password: string) {
    return {
        subject: "Welcome to AU's NEP 2025 Platform - Your Login Credentials",
        html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .logo { max-width: 200px; height: auto; }
                .content { background: #f9f9f9; padding: 20px; border-radius: 8px; }
                .credentials { background: #fff; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="https://bucket.xcelerator.co.in/au_logo.jpg" alt="AU Logo" class="logo">
                </div>
                
                <div class="content">
                    <h2>Welcome to AU's NEP 2025 Platform!</h2>
                    
                    <p>Dear ${name},</p>
                    
                    <p>Thank you for participating in AU's NEP 2025. We believe today was just the beginning, join us on this platform to continue the conversations that were ignited today.</p>
                    
                    <div class="credentials">
                        <h3>Your Login Credentials:</h3>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Password:</strong> ${password}</p>
                    </div>
                    
                    <p>Please keep these credentials secure and change your password after your first login for security purposes.</p>
                    
                    <p>We look forward to your continued participation in shaping the future of education!</p>
                    
                    <p>Best regards,<br>
                    The AU NEP 2025 Team</p>
                </div>
                
                <div class="footer">
                    <p>This is an automated message. Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        `,
    };
}

async function importUsers() {
    console.log('🚀 Starting user import process...');

    try {
        // Read the JSON file
        const dataPath = join(process.cwd(), 'scripts', 'data', 'users.json');
        let userData: UserData[];

        try {
            const fileContent = readFileSync(dataPath, 'utf-8');
            userData = JSON.parse(fileContent);
        } catch (error) {
            console.error('❌ Error reading users.json file:', error);
            console.log(
                'Please ensure the file exists at: scripts/data/users.json',
            );
            return;
        }

        if (!Array.isArray(userData)) {
            console.error(
                '❌ Invalid JSON format. Expected an array of users.',
            );
            return;
        }

        console.log(`📋 Found ${userData.length} users to import`);

        // Keep track of created organizations to avoid duplicates
        const createdOrgs = new Map<string, string>();
        let orgCount = 0;
        let userCount = 0;
        let emailCount = 0;

        for (const user of userData) {
            try {
                // Validate user data
                if (!user.name || !user.email || !user.institute) {
                    console.log(
                        `⚠️ Skipping user with missing data: ${JSON.stringify(user)}`,
                    );
                    continue;
                }

                // Clean up data (trim whitespace)
                const cleanName = user.name.trim();
                const cleanEmail = user.email.trim().toLowerCase();
                const cleanInstitute = user.institute.trim();
                const cleanDesignation = user.designation?.trim() || '';

                console.log(
                    `\n👤 Processing user: ${cleanName} (${cleanEmail})`,
                );

                // Check if user already exists
                const existingUser = await db.query.users.findFirst({
                    where: eq(users.email, cleanEmail),
                });

                if (existingUser) {
                    console.log(
                        `   ℹ️ User already exists, skipping: ${cleanEmail}`,
                    );
                    continue;
                }

                // Find or create organization
                let orgId: string;

                if (createdOrgs.has(cleanInstitute)) {
                    orgId = createdOrgs.get(cleanInstitute)!;
                    console.log(`   🏢 Using existing org: ${cleanInstitute}`);
                } else {
                    // Check if org already exists in database
                    const existingOrg = await db.query.orgs.findFirst({
                        where: eq(orgs.name, cleanInstitute),
                    });

                    if (existingOrg) {
                        orgId = existingOrg.id;
                        createdOrgs.set(cleanInstitute, orgId);
                        console.log(
                            `   🏢 Found existing org: ${cleanInstitute}`,
                        );
                    } else {
                        // Create new organization
                        orgId = `org-${randomUUID()}`;
                        await db.insert(orgs).values({
                            id: orgId,
                            name: cleanInstitute,
                        });
                        createdOrgs.set(cleanInstitute, orgId);
                        orgCount++;
                        console.log(`   🏢 Created new org: ${cleanInstitute}`);
                    }
                }

                // Generate password
                const password = generatePassword(10);
                const hashedPassword = await hashPassword(password);

                // Create user
                const userId = `user-${randomUUID()}`;
                await db.insert(users).values({
                    id: userId,
                    name: cleanName,
                    email: cleanEmail,
                    emailVerified: true,
                    orgId: orgId,
                    role: 'user',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });

                // Create account
                await db.insert(accounts).values({
                    id: `account-${randomUUID()}`,
                    userId: userId,
                    providerId: 'credential',
                    accountId: userId,
                    password: hashedPassword,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });

                userCount++;
                console.log(`   ✅ Created user account`);

                // Send welcome email
                try {
                    const emailTemplate = createWelcomeEmail(
                        cleanName,
                        cleanEmail,
                        password,
                    );
                    const emailResult = await sendEmail({
                        to: cleanEmail,
                        subject: emailTemplate.subject,
                        html: emailTemplate.html,
                    });

                    if (emailResult.success) {
                        emailCount++;
                        console.log(`   📧 Welcome email sent successfully`);
                    } else {
                        console.log(
                            `   ⚠️ Failed to send email: ${emailResult.error}`,
                        );
                    }
                } catch (emailError) {
                    console.log(`   ⚠️ Email sending failed: ${emailError}`);
                }

                // Small delay to avoid overwhelming the email service
                await new Promise((resolve) => setTimeout(resolve, 1000));
            } catch (userError) {
                console.error(
                    `❌ Error processing user ${user.name}: ${userError}`,
                );
                continue;
            }
        }

        console.log('\n📊 Import Summary:');
        console.log(`   Organizations created: ${orgCount}`);
        console.log(`   Users created: ${userCount}`);
        console.log(`   Emails sent: ${emailCount}`);
        console.log('✅ User import process completed!');
    } catch (error) {
        console.error('❌ Import process failed:', error);
        throw error;
    }
}

// Handle command line execution
if (require.main === module) {
    importUsers().catch((error) => {
        console.error('❌ Script execution failed:', error);
        process.exit(1);
    });
}
