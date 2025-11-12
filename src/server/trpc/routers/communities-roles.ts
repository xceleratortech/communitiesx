import { z } from 'zod';
import { authProcedure } from '../trpc';
import { db } from '@/server/db';
import { TRPCError } from '@trpc/server';
import { communityMembers, communities } from '@/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { ServerPermissions } from '@/server/utils/permission';
import { PERMISSIONS } from '@/lib/permissions/permission-const';

export const roleProcedures = {
    // Assign moderator role to a community member (admin only)
    assignModerator: authProcedure
        .input(
            z.object({
                communityId: z.number(),
                userId: z.string(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            try {
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
                        message: 'You dont have access to assign moderator',
                    });
                }

                // Check if the target user is a member of the community
                const targetMembership =
                    await db.query.communityMembers.findFirst({
                        where: and(
                            eq(communityMembers.userId, input.userId),
                            eq(communityMembers.communityId, input.communityId),
                            eq(communityMembers.membershipType, 'member'),
                        ),
                    });

                if (!targetMembership) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message:
                            'The user must be a member of the community to be assigned as moderator',
                    });
                }

                // Check if the user is already a moderator or admin
                if (targetMembership.role === 'moderator') {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'This user is already a moderator',
                    });
                }

                if (targetMembership.role === 'admin') {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message:
                            'This user is the community admin and cannot be assigned as moderator',
                    });
                }

                // Update the user's role to moderator
                const [updatedMembership] = await db
                    .update(communityMembers)
                    .set({
                        role: 'moderator',
                        updatedAt: new Date(),
                    })
                    .where(
                        and(
                            eq(communityMembers.userId, input.userId),
                            eq(communityMembers.communityId, input.communityId),
                        ),
                    )
                    .returning();

                return updatedMembership;
            } catch (error) {
                console.error('Error assigning moderator:', error);
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to assign moderator role',
                });
            }
        }),

    // Assign admin role to a community member (super admin, org admin, or community admin only)
    assignAdmin: authProcedure
        .input(
            z.object({
                communityId: z.number(),
                userId: z.string(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const permission = await ServerPermissions.fromUserId(
                    ctx.session.user.id,
                );
                const canAssignAdmin =
                    await permission.checkCommunityPermission(
                        input.communityId.toString(),
                        PERMISSIONS.ASSIGN_COMMUNITY_ADMIN,
                    );

                if (!canAssignAdmin) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'You dont have access to assign admin role',
                    });
                }

                // Check if the target user is a member of the community
                const targetMembership =
                    await db.query.communityMembers.findFirst({
                        where: and(
                            eq(communityMembers.userId, input.userId),
                            eq(communityMembers.communityId, input.communityId),
                            eq(communityMembers.membershipType, 'member'),
                        ),
                    });

                if (!targetMembership) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message:
                            'The user must be a member of the community to be assigned as admin',
                    });
                }

                // Check if the user is already an admin
                if (targetMembership.role === 'admin') {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'This user is already a community admin',
                    });
                }

                // Update the user's role to admin
                const [updatedMembership] = await db
                    .update(communityMembers)
                    .set({
                        role: 'admin',
                        updatedAt: new Date(),
                    })
                    .where(
                        and(
                            eq(communityMembers.userId, input.userId),
                            eq(communityMembers.communityId, input.communityId),
                        ),
                    )
                    .returning();

                return updatedMembership;
            } catch (error) {
                console.error('Error assigning admin:', error);
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to assign admin role',
                });
            }
        }),

    // Remove moderator role from a community member (admin only)
    removeModerator: authProcedure
        .input(
            z.object({
                communityId: z.number(),
                userId: z.string(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            try {
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
                        message: 'You dont have access to remove moderator',
                    });
                }

                // Check if the target user is a moderator of the community
                const targetMembership =
                    await db.query.communityMembers.findFirst({
                        where: and(
                            eq(communityMembers.userId, input.userId),
                            eq(communityMembers.communityId, input.communityId),
                            eq(communityMembers.role, 'moderator'),
                        ),
                    });

                if (!targetMembership) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message:
                            'This user is not a moderator of the community',
                    });
                }

                // Update the user's role to member
                const [updatedMembership] = await db
                    .update(communityMembers)
                    .set({
                        role: 'member',
                        updatedAt: new Date(),
                    })
                    .where(
                        and(
                            eq(communityMembers.userId, input.userId),
                            eq(communityMembers.communityId, input.communityId),
                        ),
                    )
                    .returning();

                return updatedMembership;
            } catch (error) {
                console.error('Error removing moderator:', error);
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to remove moderator role',
                });
            }
        }),

    // Remove admin role from a community member (super admin, org admin, or community admin only - requires REMOVE_COMMUNITY_ADMIN permission)
    removeAdmin: authProcedure
        .input(
            z.object({
                communityId: z.number(),
                userId: z.string(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const permission = await ServerPermissions.fromUserId(
                    ctx.session.user.id,
                );
                const canRemoveAdmin =
                    await permission.checkCommunityPermission(
                        input.communityId.toString(),
                        PERMISSIONS.REMOVE_COMMUNITY_ADMIN,
                    );

                if (!canRemoveAdmin) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'You dont have access to remove admin role',
                    });
                }

                // Check if the target user is an admin of the community
                const targetMembership =
                    await db.query.communityMembers.findFirst({
                        where: and(
                            eq(communityMembers.userId, input.userId),
                            eq(communityMembers.communityId, input.communityId),
                            eq(communityMembers.role, 'admin'),
                        ),
                    });

                if (!targetMembership) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'This user is not an admin of the community',
                    });
                }

                // Don't allow removing the community creator's admin role
                const community = await db.query.communities.findFirst({
                    where: eq(communities.id, input.communityId),
                    columns: { createdBy: true },
                });

                if (community?.createdBy === input.userId) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'Cannot remove admin role from the community creator',
                    });
                }

                // Update the user's role to member
                const [updatedMembership] = await db
                    .update(communityMembers)
                    .set({
                        role: 'member',
                        updatedAt: new Date(),
                    })
                    .where(
                        and(
                            eq(communityMembers.userId, input.userId),
                            eq(communityMembers.communityId, input.communityId),
                        ),
                    )
                    .returning();

                return updatedMembership;
            } catch (error) {
                console.error('Error removing admin:', error);
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to remove admin role',
                });
            }
        }),
};
