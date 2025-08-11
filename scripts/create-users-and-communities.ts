import { randomUUID } from 'crypto';
import { hashPassword } from 'better-auth/crypto';
import { db } from '../src/server/db';
import { orgs, users, accounts } from '../src/server/db/auth-schema';
import { communities, communityMembers } from '../src/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { sendEmail } from '../src/lib/email';
import { userData } from '../src/csv/processed-user-data-email-key';

// Configuration
const ORG_ID = '9cupkjj4GkxKMW97pCkBW'; // Atria Institute of Technology
// const ORG_ID ='uPRiR4TKD06IkHejPFx8N' // TiEUniversity
// const ORG_ID = '9cupkjj4GkxKMW97pCkBW'; // This one doesn't exist
const DEFAULT_PASSWORD = 'Password@1234';

// Environment flag - set to false for dev, true for production
const SEND_EMAILS = true;

// Community data - two public communities
const communityData = {
    Announcement: {
        description: 'Official announcements and updates from the platform',
        type: 'public' as const,
        postCreationMinRole: 'member' as const,
    },
    Inspiration: {
        description: 'Share inspiring stories, ideas, and motivation',
        type: 'public' as const,
        postCreationMinRole: 'member' as const,
    },
};

// Function to create slug from name
function createSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-]/g, '');
}

// Email template for user welcome and credentials
function createWelcomeEmail(name: string, email: string, password: string) {
    const platformUrl = 'https://communityx.xcelerator.in';

    return {
        subject: 'Welcome to CommunityX Platform - Your Login Credentials',
        html: `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to CommunityX</title>
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
            .login-button { 
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
            .login-button:hover {
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
                <!-- Real AIT logo image -->
                <img src="https://bucket.xcelerator.co.in/AIT_LOGO.png" 
                     alt="AIT Logo" 
                     class="logo" 
                     style="max-width: 200px; height: auto; margin-bottom: 20px; display: block; margin-left: auto; margin-right: auto; border: 0; outline: none; text-decoration: none;"
                     width="200"
                     height="auto">
                <h1 style="margin: 0; font-size: 24px; color: #ffffff;">Welcome to CommunityX!</h1>
            </div>
            
            <div class="content">
                <div class="welcome-text">Welcome aboard, ${name}! 🎉</div>
                
                <p>You have been successfully onboarded to the Communities platform. This is your gateway to connect, collaborate, and grow with fellow entrepreneurs and innovators.</p>
                
                <div class="credentials">
                    <h3>🔐 Your Login Credentials:</h3>
                    <div class="credential-item">
                        <span class="credential-label">Email:</span>
                        <span class="credential-value">${email}</span>
                    </div>
                    <div class="credential-item">
                        <span class="credential-label">Password:</span>
                        <span class="credential-value">${password}</span>
                    </div>
                </div>
                
                <div style="text-align: center;">
                    <a href="${platformUrl}" class="login-button" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; text-align: center; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">🚀 Access Your Platform</a>
                </div>
                
                <div class="features">
                    <h3>🌟 What you can do on our platform:</h3>
                    <ul>
                        <li>Join public communities and collaborate with peers</li>
                        <li>Share insights, experiences, and knowledge</li>
                        <li>Connect with mentors and industry experts</li>
                        <li>Participate in discussions and forums</li>
                        <li>Access exclusive content and resources</li>
                    </ul>
                </div>
                
                <p>We're excited to have you as part of our growing community of entrepreneurs and innovators!</p>
                
                <p>Best regards,<br>
                <strong>The Communities Team</strong></p>
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

// Function to create user
async function createUser(name: string, email: string): Promise<string> {
    console.log(`👤 Creating user: ${name} (${email})`);

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
    });

    if (existingUser) {
        console.log(`   ⚠️  User already exists: ${email}`);
        return existingUser.id;
    }

    // Hash password
    const hashedPassword = await hashPassword(DEFAULT_PASSWORD);

    // Create user
    const userId = `user-${randomUUID()}`;
    const now = new Date();

    await db.insert(users).values({
        id: userId,
        name,
        email,
        emailVerified: true,
        orgId: ORG_ID,
        role: 'user',
        appRole: 'user',
        createdAt: now,
        updatedAt: now,
    });

    // Create account
    const accountId = `account-${randomUUID()}`;
    await db.insert(accounts).values({
        id: accountId,
        accountId: userId,
        providerId: 'credential',
        userId,
        password: hashedPassword,
        createdAt: now,
        updatedAt: now,
    });

    console.log(`   ✅ Created user: ${userId}`);

    // Send welcome email
    if (SEND_EMAILS) {
        try {
            console.log(`   📧 Sending welcome email to: ${email}`);
            const emailResult = await sendEmail({
                to: email,
                subject:
                    'Welcome to CommunityX Platform - Your Login Credentials',
                html: createWelcomeEmail(name, email, DEFAULT_PASSWORD).html,
            });

            if (emailResult.success) {
                console.log(`   ✅ Email sent successfully to: ${email}`);
            } else {
                console.log(
                    `   ⚠️  Failed to send email to: ${email} - ${emailResult.error}`,
                );
            }
        } catch (error) {
            console.log(`   ⚠️  Error sending email to ${email}:`, error);
        }
    } else {
        console.log(
            `   ⚠️  Email sending disabled for dev environment. Skipping email for: ${email}`,
        );
    }

    return userId;
}

// Function to create community
async function createCommunity(
    name: string,
    description: string,
    type: 'public' | 'private',
    postCreationMinRole: 'admin' | 'member',
    createdBy: string,
): Promise<number> {
    console.log(`🏘️  Creating community: ${name}`);

    const slug = createSlug(name);

    // Check if community already exists
    const existingCommunity = await db.query.communities.findFirst({
        where: eq(communities.slug, slug),
    });

    if (existingCommunity) {
        console.log(`   ⚠️  Community already exists: ${name}`);
        return existingCommunity.id;
    }

    // Create community
    const [community] = await db
        .insert(communities)
        .values({
            name,
            slug,
            description,
            type,
            postCreationMinRole,
            orgId: ORG_ID,
            createdBy,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        .returning();

    console.log(`   ✅ Created community: ${community.id}`);
    return community.id;
}

// Function to add user to community
async function addUserToCommunity(
    userId: string,
    communityId: number,
    role: 'admin' | 'member' = 'member',
) {
    console.log(
        `   👥 Adding user ${userId} to community ${communityId} as ${role}`,
    );

    // Check if user is already a member of THIS specific community
    const existingMember = await db.query.communityMembers.findFirst({
        where: and(
            eq(communityMembers.userId, userId),
            eq(communityMembers.communityId, communityId),
        ),
    });

    if (existingMember) {
        console.log(`   ⚠️  User already a member of this community`);
        return;
    }

    await db.insert(communityMembers).values({
        userId,
        communityId,
        role,
        membershipType: 'member',
        status: 'active',
        joinedAt: new Date(),
        updatedAt: new Date(),
    });

    console.log(`   ✅ Added user to community`);
}

// Main function
async function createUsersAndCommunities() {
    console.log('🚀 Starting user and community creation process...');
    console.log(`📋 Organization ID: ${ORG_ID}`);
    console.log(`🔐 Default password: ${DEFAULT_PASSWORD}`);
    console.log(`📊 Total users to process: ${Object.keys(userData).length}`);

    try {
        // Verify organization exists
        const org = await db.query.orgs.findFirst({
            where: eq(orgs.id, ORG_ID),
        });

        if (!org) {
            console.error(`❌ Organization with ID ${ORG_ID} not found!`);
            return;
        }

        console.log(`✅ Found organization: ${org.name}`);

        // Create a map to store user IDs by email
        const userMap = new Map<string, string>();

        // Step 1: Create all users
        console.log('\n📝 Step 1: Creating users...');
        let userCount = 0;
        for (const [name, email] of Object.entries(userData)) {
            const userId = await createUser(name as string, email as string);
            userMap.set(email as string, userId);
            userCount++;

            // Progress indicator
            if (userCount % 50 === 0) {
                console.log(
                    `   📊 Progress: ${userCount}/${Object.keys(userData).length} users processed`,
                );
            }
        }

        // Step 2: Create communities and add all users
        console.log(
            '\n��️  Step 2: Creating communities and adding all users...',
        );

        // Get the first user as the creator (for simplicity)
        const firstUserEmail = Object.values(userData)[0];
        const creatorId = userMap.get(firstUserEmail as string);

        if (!creatorId) {
            console.error('❌ No users created, cannot create communities');
            return;
        }

        for (const [communityName, communityConfig] of Object.entries(
            communityData,
        )) {
            console.log(`\n🏘️  Processing community: ${communityName}`);

            // Create community
            const communityId = await createCommunity(
                communityName,
                communityConfig.description,
                communityConfig.type,
                communityConfig.postCreationMinRole,
                creatorId,
            );

            // Add ALL users to this community
            console.log(
                `   👥 Adding all ${userMap.size} users to community: ${communityName}`,
            );
            let memberCount = 0;

            for (const [name, email] of Object.entries(userData)) {
                const userId = userMap.get(email as string);
                if (userId) {
                    await addUserToCommunity(userId, communityId, 'member');
                    memberCount++;

                    // Progress indicator for large user sets
                    if (memberCount % 100 === 0) {
                        console.log(
                            `      📊 Progress: ${memberCount}/${userMap.size} users added to ${communityName}`,
                        );
                    }
                } else {
                    console.log(`   ⚠️  User not found: ${email}`);
                }
            }

            console.log(
                `   ✅ Successfully added ${memberCount} users to community: ${communityName}`,
            );
        }

        console.log('\n✅ Process completed successfully!');
        console.log(`📊 Summary:`);
        console.log(`   - Users created: ${userMap.size}`);
        console.log(
            `   - Communities created: ${Object.keys(communityData).length}`,
        );
        console.log(
            `   - Communities: ${Object.keys(communityData).join(', ')}`,
        );
        console.log(`   - All users added to both communities as members`);
        console.log(`   - Default password for all users: ${DEFAULT_PASSWORD}`);
        console.log(
            `   - Welcome emails sent to all new users: ${SEND_EMAILS ? 'Yes' : 'No'}`,
        );
        console.log(`   - Platform URL: https://communityx.xcelerator.in`);
    } catch (error) {
        console.error('❌ Error during process:', error);
    } finally {
        process.exit(0);
    }
}

// Run the script
createUsersAndCommunities();
