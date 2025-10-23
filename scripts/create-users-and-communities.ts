import { randomUUID } from 'crypto';
import { hashPassword } from 'better-auth/crypto';
import { db } from '../src/server/db';
import { orgs, users, accounts } from '../src/server/db/auth-schema';
import { communities, communityMembers } from '../src/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { sendEmail } from '../src/lib/email';
import { createWelcomeEmail } from '../src/lib/email-templates';
import { getUserData } from '../src/lib/user-data-loader.js';

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
            const welcomeEmail = createWelcomeEmail(`${process.env.NEXT_PUBLIC_APP_URL || 'https://communityx.xcelerator.in'}/auth/login`);
            const emailResult = await sendEmail({
                to: email,
                subject: welcomeEmail.subject,
                html: welcomeEmail.html,
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
    
    // Load user data securely
    console.log('📊 Loading user data securely...');
    const userData = await getUserData();
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
