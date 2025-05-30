import { db } from '@/server/db';
import { communities, communityMembers } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';

async function updateCommunityRoles() {
    try {
        console.log('Starting community role update...');

        // Get all communities
        const allCommunities = await db.query.communities.findMany({
            with: {
                members: true,
            },
        });

        console.log(`Found ${allCommunities.length} communities to process`);

        let updatedCount = 0;

        // For each community, update the creator's role to admin if they're currently a moderator
        for (const community of allCommunities) {
            const creatorMembership = community.members.find(
                (member) =>
                    member.userId === community.createdBy &&
                    member.role === 'moderator',
            );

            if (creatorMembership) {
                // Update the creator's role to admin
                await db
                    .update(communityMembers)
                    .set({
                        role: 'admin',
                        updatedAt: new Date(),
                    })
                    .where(
                        and(
                            eq(communityMembers.userId, community.createdBy),
                            eq(communityMembers.communityId, community.id),
                        ),
                    );

                updatedCount++;
                console.log(
                    `Updated community ${community.name} (${community.id}): creator role set to admin`,
                );
            }
        }

        console.log(
            `Update complete. ${updatedCount} community creators updated to admin role.`,
        );
    } catch (error) {
        console.error('Error updating community roles:', error);
        process.exit(1);
    }

    process.exit(0);
}

// Run the update
updateCommunityRoles();
