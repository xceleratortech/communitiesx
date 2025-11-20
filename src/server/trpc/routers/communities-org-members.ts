import { z } from 'zod';
import { authProcedure } from '../trpc';
import { db } from '@/server/db';
import { TRPCError } from '@trpc/server';
import { communities, communityMembers, users } from '@/server/db/schema';
import { and, eq, inArray, ilike, or } from 'drizzle-orm';
import { ServerPermissions } from '@/server/utils/permission';
import { PERMISSIONS } from '@/lib/permissions/permission-const';

export const orgMemberProcedures = {
    // Get organization members who are not yet in the community
    getOrgMembersNotInCommunity: authProcedure
        .input(
            z.object({
                communityId: z.number(),
                search: z.string().optional(),
            }),
        )
        .query(async ({ input, ctx }) => {
            try {
                // Get the community to find its organization
                const community = await db.query.communities.findFirst({
                    where: eq(communities.id, input.communityId),
                    columns: { orgId: true },
                });

                if (!community?.orgId) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Community not found or has no organization',
                    });
                }

                // Check if user has permission to manage community members
                const permission = await ServerPermissions.fromUserId(
                    ctx.session.user.id,
                );
                const canManageMembers =
                    await permission.checkCommunityPermission(
                        input.communityId.toString(),
                        PERMISSIONS.MANAGE_COMMUNITY_MEMBERS,
                    );

                if (!canManageMembers) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You do not have permission to manage community members',
                    });
                }

                // Build search conditions
                let whereConditions = and(
                    eq(users.orgId, community.orgId),
                    eq(users.emailVerified, true), // Only verified users
                );

                if (input.search && input.search.trim()) {
                    const searchTerm = `%${input.search.trim()}%`;
                    whereConditions = and(
                        eq(users.orgId, community.orgId),
                        eq(users.emailVerified, true),
                        or(
                            ilike(users.name, searchTerm),
                            ilike(users.email, searchTerm),
                        ),
                    );
                }

                // Get all organization members from users table with optional search filtering
                const orgMembersList = await db.query.users.findMany({
                    where: whereConditions,
                    columns: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                });

                // Get existing community members
                const existingCommunityMembers =
                    await db.query.communityMembers.findMany({
                        where: eq(
                            communityMembers.communityId,
                            input.communityId,
                        ),
                        columns: { userId: true },
                    });

                const existingMemberIds = new Set(
                    existingCommunityMembers.map((m) => m.userId),
                );

                // Filter out users who are already in the community
                const availableMembers = orgMembersList.filter(
                    (member: (typeof orgMembersList)[number]) =>
                        !existingMemberIds.has(member.id),
                );

                return availableMembers;
            } catch (error) {
                if (error instanceof TRPCError) throw error;
                console.error(
                    'Error getting org members not in community:',
                    error,
                );
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to get organization members',
                });
            }
        }),

    // Add organization members to community (supports multiple users)
    addOrgMembersToCommunity: authProcedure
        .input(
            z.object({
                communityId: z.number(),
                users: z.array(
                    z.object({
                        userId: z.string(),
                        role: z.enum(['member', 'moderator']).default('member'),
                    }),
                ),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            try {
                // Get the community to find its organization
                const community = await db.query.communities.findFirst({
                    where: eq(communities.id, input.communityId),
                    columns: { orgId: true },
                });

                if (!community?.orgId) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Community not found or has no organization',
                    });
                }

                // Check if user has permission to manage community members
                const permission = await ServerPermissions.fromUserId(
                    ctx.session.user.id,
                );
                const canManageMembers =
                    await permission.checkCommunityPermission(
                        input.communityId.toString(),
                        PERMISSIONS.MANAGE_COMMUNITY_MEMBERS,
                    );

                if (!canManageMembers) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You do not have permission to manage community members',
                    });
                }

                // Verify all users are members of the organization
                const userIds = input.users.map((u) => u.userId);
                const orgMembers = await db.query.users.findMany({
                    where: and(
                        inArray(users.id, userIds),
                        eq(users.orgId, community.orgId),
                        eq(users.emailVerified, true),
                    ),
                    columns: { id: true },
                });

                if (orgMembers.length !== userIds.length) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message:
                            'Some users are not members of this organization',
                    });
                }

                // Check if any users are already in the community
                const existingMemberships =
                    await db.query.communityMembers.findMany({
                        where: and(
                            eq(communityMembers.communityId, input.communityId),
                            inArray(communityMembers.userId, userIds),
                        ),
                    });

                if (existingMemberships.length > 0) {
                    const existingUserIds = existingMemberships.map(
                        (m) => m.userId,
                    );
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: `Users ${existingUserIds.join(', ')} are already members of this community`,
                    });
                }

                // Add all users to community
                const now = new Date();
                const membersToAdd = input.users.map((user) => ({
                    userId: user.userId,
                    communityId: input.communityId,
                    role: user.role,
                    membershipType: 'member' as const,
                    status: 'active' as const,
                    joinedAt: now,
                    updatedAt: now,
                }));

                await db.insert(communityMembers).values(membersToAdd);

                return {
                    success: true,
                    message: `Successfully added ${input.users.length} member(s) to the community`,
                };
            } catch (error) {
                if (error instanceof TRPCError) throw error;
                console.error('Error adding org members to community:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to add users to community',
                });
            }
        }),
};
