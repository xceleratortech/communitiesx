import { randomUUID } from 'crypto';
import { db } from '@/server/db';
import { users, communityMembers, communities } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';

// Configuration
const COMMUNITY_ID = 28;


const userData = {
    'Ajay S Kabadi': 'ajay.kabadi94@gmail.com',
};
// Function to find user by email (force lowercase)
async function findUserByEmail(email: string): Promise<string | null> {
    const user = await db.query.users.findFirst({
        where: eq(users.email, email.toLowerCase()),
    });
    return user ? user.id : null;
}

// Function to check if user is already a member of the community
async function isUserAlreadyMember(
    userId: string,
    communityId: number,
): Promise<boolean> {
    const existingMember = await db.query.communityMembers.findFirst({
        where: and(
            eq(communityMembers.userId, userId),
            eq(communityMembers.communityId, communityId),
        ),
    });

    return !!existingMember;
}

// Function to add user to community
async function addUserToCommunity(
    userId: string,
    communityId: number,
    userEmail: string,
) {
    console.log(`   👥 Adding user ${userEmail} to community ${communityId}`);

    // Check if user is already a member
    const alreadyMember = await isUserAlreadyMember(userId, communityId);

    if (alreadyMember) {
        console.log(
            `   ⚠️  User ${userEmail} is already a member of community ${communityId}`,
        );
        return;
    }

    await db.insert(communityMembers).values({
        userId,
        communityId,
        role: 'member',
        membershipType: 'member',
        status: 'active',
        joinedAt: new Date(),
        updatedAt: new Date(),
    });

    console.log(`   ✅ Added user ${userEmail} to community ${communityId}`);
}

// Main function
async function addUsersToExistingCommunity() {
    console.log(
        '🚀 Starting bulk user addition to community (uppercase emails only)...',
    );
    console.log(`🎯 Target Community ID: ${COMMUNITY_ID}`);

    // Use all users in userData (no filter for uppercase emails)
    const filteredUserData = Object.entries(userData);
    console.log(`👥 Users to add: ${filteredUserData.length}`);
    console.log('');

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    try {
        // Verify community exists
        const community = await db.query.communities.findFirst({
            where: eq(communities.id, COMMUNITY_ID),
        });
        if (!community) {
            console.error(`❌ Community with ID ${COMMUNITY_ID} not found!`);
            return;
        }
        console.log(
            `✅ Found target community: ${community.name || 'Unknown'}`,
        );
        console.log('');

        // Process each user (only those with uppercase in email)
        for (const [name, email] of filteredUserData) {
            const lowerEmail = email.toLowerCase();
            console.log(`🔍 Processing: ${name} (${email}) as (${lowerEmail})`);
            try {
                // Find user by lowercased email
                const userId = await findUserByEmail(lowerEmail);
                if (!userId) {
                    console.log(`   ⚠️  User not found: ${lowerEmail}`);
                    errorCount++;
                    continue;
                }
                // Check if already a member
                const alreadyMember = await isUserAlreadyMember(
                    userId,
                    COMMUNITY_ID,
                );
                if (alreadyMember) {
                    console.log(`   ⚠️  Already a member: ${lowerEmail}`);
                    skipCount++;
                    continue;
                }
                // Add user to community
                await addUserToCommunity(userId, COMMUNITY_ID, lowerEmail);
                successCount++;
            } catch (error) {
                console.log(`   ❌ Error processing ${lowerEmail}:`, error);
                errorCount++;
            }
            console.log('');
        }

        // Summary
        console.log('📊 SUMMARY:');
        console.log(`✅ Successfully added: ${successCount} users`);
        console.log(`⚠️  Already members: ${skipCount} users`);
        console.log(`❌ Errors/Not found: ${errorCount} users`);
        console.log(
            `📝 Total processed: ${successCount + skipCount + errorCount} users`,
        );
        console.log(`🎯 Target Community ID: ${COMMUNITY_ID}`);
        if (successCount > 0) {
            console.log('\n🎉 Bulk user addition completed successfully!');
        }
    } catch (error) {
        console.error('❌ Error during bulk user addition:', error);
    } finally {
        process.exit(0);
    }
}

// Run the script
addUsersToExistingCommunity();
