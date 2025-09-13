import { eq, and, desc, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { router, authProcedure } from '../trpc';
import { db } from '@/server/db';
import { TRPCError } from '@trpc/server';
import {
    userBadges,
    userBadgeAssignments,
    users,
    orgs,
} from '@/server/db/schema';
import { checkUserPermission } from '@/server/utils/permission';

export const badgesRouter = router({
    // Get all badges for an organization
    getBadges: authProcedure
        .input(
            z.object({
                orgId: z.string(),
            }),
        )
        .query(async ({ input, ctx }) => {
            try {
                // Check if user has permission to view badges
                const currentUser = await db.query.users.findFirst({
                    where: eq(users.id, ctx.session.user.id),
                    columns: { orgId: true, appRole: true },
                });

                // Super admins can view badges for any organization
                const isSuperAdmin = currentUser?.appRole === 'admin';

                if (
                    !isSuperAdmin &&
                    (!currentUser || currentUser.orgId !== input.orgId)
                ) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You can only view badges for your own organization',
                    });
                }

                const hasPermission = await checkUserPermission(
                    ctx.session.user.id,
                    'org',
                    'view_badge',
                );

                if (!hasPermission && !isSuperAdmin) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'Insufficient permissions to view badges',
                    });
                }

                const badges = await db.query.userBadges.findMany({
                    where: eq(userBadges.orgId, input.orgId),
                    with: {
                        createdBy: {
                            columns: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                        assignments: {
                            with: {
                                user: {
                                    columns: {
                                        id: true,
                                        name: true,
                                        email: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: [desc(userBadges.createdAt)],
                });

                return badges;
            } catch (error) {
                if (error instanceof TRPCError) throw error;
                console.error('Error fetching badges:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch badges',
                });
            }
        }),

    // Create a new badge
    createBadge: authProcedure
        .input(
            z.object({
                name: z.string().min(1),
                description: z.string().optional(),
                icon: z.string().optional(),
                color: z.string().regex(/^#[0-9A-F]{6}$/i),
                orgId: z.string(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            try {
                // Check if user has permission to create badges
                const currentUser = await db.query.users.findFirst({
                    where: eq(users.id, ctx.session.user.id),
                    columns: { orgId: true, appRole: true },
                });

                // Super admins can create badges for any organization
                const isSuperAdmin = currentUser?.appRole === 'admin';

                if (
                    !isSuperAdmin &&
                    (!currentUser || currentUser.orgId !== input.orgId)
                ) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You can only create badges for your own organization',
                    });
                }

                const hasPermission = await checkUserPermission(
                    ctx.session.user.id,
                    'org',
                    'create_badge',
                );

                if (!hasPermission && !isSuperAdmin) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'Insufficient permissions to create badges',
                    });
                }

                // Check if badge with same name exists in the organization
                const existingBadge = await db.query.userBadges.findFirst({
                    where: and(
                        eq(userBadges.orgId, input.orgId),
                        eq(userBadges.name, input.name),
                    ),
                });

                if (existingBadge) {
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: 'A badge with this name already exists',
                    });
                }

                const [newBadge] = await db
                    .insert(userBadges)
                    .values({
                        name: input.name,
                        description: input.description,
                        icon: input.icon,
                        color: input.color,
                        orgId: input.orgId,
                        createdBy: ctx.session.user.id,
                    })
                    .returning();

                return newBadge;
            } catch (error) {
                if (error instanceof TRPCError) throw error;
                console.error('Error creating badge:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create badge',
                });
            }
        }),

    // Update a badge
    updateBadge: authProcedure
        .input(
            z.object({
                badgeId: z.number(),
                name: z.string().min(1).max(50),
                description: z.string().optional(),
                icon: z.string().optional(),
                color: z.string().regex(/^#[0-9A-F]{6}$/i),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            try {
                // Get the badge to check permissions
                const badge = await db.query.userBadges.findFirst({
                    where: eq(userBadges.id, input.badgeId),
                });

                if (!badge) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Badge not found',
                    });
                }

                // Check if user has permission to edit badges and is in the same org
                const currentUser = await db.query.users.findFirst({
                    where: eq(users.id, ctx.session.user.id),
                    columns: { orgId: true, appRole: true },
                });

                // Super admins can edit badges for any organization
                const isSuperAdmin = currentUser?.appRole === 'admin';

                if (
                    !isSuperAdmin &&
                    (!currentUser || currentUser.orgId !== badge.orgId)
                ) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You can only edit badges for your own organization',
                    });
                }

                const hasPermission = await checkUserPermission(
                    ctx.session.user.id,
                    'org',
                    'edit_badge',
                );

                if (!hasPermission && !isSuperAdmin) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'Insufficient permissions to edit badges',
                    });
                }

                // Check if badge with same name exists in the organization (excluding current badge)
                const existingBadge = await db.query.userBadges.findFirst({
                    where: and(
                        eq(userBadges.orgId, badge.orgId),
                        eq(userBadges.name, input.name),
                        // ne(userBadges.id, input.badgeId), // would need to import ne
                    ),
                });

                if (existingBadge && existingBadge.id !== input.badgeId) {
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: 'A badge with this name already exists',
                    });
                }

                const [updatedBadge] = await db
                    .update(userBadges)
                    .set({
                        name: input.name,
                        description: input.description,
                        icon: input.icon,
                        color: input.color,
                        updatedAt: new Date(),
                    })
                    .where(eq(userBadges.id, input.badgeId))
                    .returning();

                return updatedBadge;
            } catch (error) {
                if (error instanceof TRPCError) throw error;
                console.error('Error updating badge:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to update badge',
                });
            }
        }),

    // Delete a badge
    deleteBadge: authProcedure
        .input(
            z.object({
                badgeId: z.number(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            try {
                // Get the badge to check permissions
                const badge = await db.query.userBadges.findFirst({
                    where: eq(userBadges.id, input.badgeId),
                });

                if (!badge) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Badge not found',
                    });
                }

                // Check if user has permission to delete badges and is in the same org
                const currentUser = await db.query.users.findFirst({
                    where: eq(users.id, ctx.session.user.id),
                    columns: { orgId: true, appRole: true },
                });

                // Super admins can delete badges for any organization
                const isSuperAdmin = currentUser?.appRole === 'admin';

                if (
                    !isSuperAdmin &&
                    (!currentUser || currentUser.orgId !== badge.orgId)
                ) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You can only delete badges for your own organization',
                    });
                }

                const hasPermission = await checkUserPermission(
                    ctx.session.user.id,
                    'org',
                    'delete_badge',
                );

                if (!hasPermission && !isSuperAdmin) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'Insufficient permissions to delete badges',
                    });
                }

                // Delete the badge (assignments will be cascade deleted)
                await db
                    .delete(userBadges)
                    .where(eq(userBadges.id, input.badgeId));

                return { success: true };
            } catch (error) {
                if (error instanceof TRPCError) throw error;
                console.error('Error deleting badge:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to delete badge',
                });
            }
        }),

    // Assign badge to user
    assignBadge: authProcedure
        .input(
            z.object({
                badgeId: z.number(),
                userId: z.string(),
                note: z.string().optional(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            try {
                // Get the badge to check permissions
                const badge = await db.query.userBadges.findFirst({
                    where: eq(userBadges.id, input.badgeId),
                });

                if (!badge) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Badge not found',
                    });
                }

                // Check if user has permission to assign badges and is in the same org
                const currentUser = await db.query.users.findFirst({
                    where: eq(users.id, ctx.session.user.id),
                    columns: { orgId: true, appRole: true },
                });

                // Super admins can assign badges for any organization
                const isSuperAdmin = currentUser?.appRole === 'admin';

                if (
                    !isSuperAdmin &&
                    (!currentUser || currentUser.orgId !== badge.orgId)
                ) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You can only assign badges for your own organization',
                    });
                }

                const hasPermission = await checkUserPermission(
                    ctx.session.user.id,
                    'org',
                    'assign_badge',
                );

                if (!hasPermission && !isSuperAdmin) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'Insufficient permissions to assign badges',
                    });
                }

                // Check if user exists and is in the same organization
                const targetUser = await db.query.users.findFirst({
                    where: eq(users.id, input.userId),
                });

                if (!targetUser) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'User not found',
                    });
                }

                if (targetUser.orgId !== badge.orgId) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message:
                            'User is not in the same organization as the badge',
                    });
                }

                // Check if badge is already assigned to this user
                const existingAssignment =
                    await db.query.userBadgeAssignments.findFirst({
                        where: and(
                            eq(userBadgeAssignments.badgeId, input.badgeId),
                            eq(userBadgeAssignments.userId, input.userId),
                        ),
                    });

                if (existingAssignment) {
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: 'Badge is already assigned to this user',
                    });
                }

                const [assignment] = await db
                    .insert(userBadgeAssignments)
                    .values({
                        badgeId: input.badgeId,
                        userId: input.userId,
                        assignedBy: ctx.session.user.id,
                        note: input.note,
                    })
                    .returning();

                return assignment;
            } catch (error) {
                if (error instanceof TRPCError) throw error;
                console.error('Error assigning badge:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to assign badge',
                });
            }
        }),

    // Assign badge to multiple users
    assignBadgeBulk: authProcedure
        .input(
            z.object({
                badgeId: z.number(),
                userIds: z
                    .array(z.string())
                    .min(1, 'At least one user must be selected'),
                note: z.string().optional(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            try {
                // Get the badge to check permissions
                const badge = await db.query.userBadges.findFirst({
                    where: eq(userBadges.id, input.badgeId),
                });

                if (!badge) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Badge not found',
                    });
                }

                // Check if user has permission to assign badges and is in the same org
                const currentUser = await db.query.users.findFirst({
                    where: eq(users.id, ctx.session.user.id),
                    columns: { orgId: true, appRole: true },
                });

                // Super admins can assign badges for any organization
                const isSuperAdmin = currentUser?.appRole === 'admin';

                if (
                    !isSuperAdmin &&
                    (!currentUser || currentUser.orgId !== badge.orgId)
                ) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You can only assign badges for your own organization',
                    });
                }

                const hasPermission = await checkUserPermission(
                    ctx.session.user.id,
                    'org',
                    'assign_badge',
                );

                if (!hasPermission && !isSuperAdmin) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'Insufficient permissions to assign badges',
                    });
                }

                // Check if all users exist and are in the same organization
                const targetUsers = await db.query.users.findMany({
                    where: inArray(users.id, input.userIds),
                    columns: { id: true, orgId: true },
                });

                if (targetUsers.length !== input.userIds.length) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'One or more users not found',
                    });
                }

                // Check if all users are in the same organization as the badge
                const invalidUsers = targetUsers.filter(
                    (user) => user.orgId !== badge.orgId,
                );
                if (invalidUsers.length > 0) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message:
                            'One or more users are not in the same organization as the badge',
                    });
                }

                // Check for existing assignments
                const existingAssignments =
                    await db.query.userBadgeAssignments.findMany({
                        where: and(
                            eq(userBadgeAssignments.badgeId, input.badgeId),
                            inArray(userBadgeAssignments.userId, input.userIds),
                        ),
                    });

                if (existingAssignments.length > 0) {
                    const existingUserIds = existingAssignments.map(
                        (assignment) => assignment.userId,
                    );
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: `Badge is already assigned to users: ${existingUserIds.join(', ')}`,
                    });
                }

                // Insert all assignments
                const assignments = await db
                    .insert(userBadgeAssignments)
                    .values(
                        input.userIds.map((userId) => ({
                            badgeId: input.badgeId,
                            userId,
                            assignedBy: ctx.session.user.id,
                            note: input.note,
                        })),
                    )
                    .returning();

                return assignments;
            } catch (error) {
                if (error instanceof TRPCError) throw error;
                console.error('Error bulk assigning badge:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to assign badge to users',
                });
            }
        }),

    // Unassign badge from user
    unassignBadge: authProcedure
        .input(
            z.object({
                badgeId: z.number(),
                userId: z.string(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            try {
                // Get the badge to check permissions
                const badge = await db.query.userBadges.findFirst({
                    where: eq(userBadges.id, input.badgeId),
                });

                if (!badge) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Badge not found',
                    });
                }

                // Check if user has permission to unassign badges and is in the same org
                const currentUser = await db.query.users.findFirst({
                    where: eq(users.id, ctx.session.user.id),
                    columns: { orgId: true, appRole: true },
                });

                // Super admins can unassign badges for any organization
                const isSuperAdmin = currentUser?.appRole === 'admin';

                if (
                    !isSuperAdmin &&
                    (!currentUser || currentUser.orgId !== badge.orgId)
                ) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You can only unassign badges for your own organization',
                    });
                }

                const hasPermission = await checkUserPermission(
                    ctx.session.user.id,
                    'org',
                    'unassign_badge',
                );

                if (!hasPermission && !isSuperAdmin) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'Insufficient permissions to unassign badges',
                    });
                }

                // Check if assignment exists
                const assignment =
                    await db.query.userBadgeAssignments.findFirst({
                        where: and(
                            eq(userBadgeAssignments.badgeId, input.badgeId),
                            eq(userBadgeAssignments.userId, input.userId),
                        ),
                    });

                if (!assignment) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Badge assignment not found',
                    });
                }

                await db
                    .delete(userBadgeAssignments)
                    .where(
                        and(
                            eq(userBadgeAssignments.badgeId, input.badgeId),
                            eq(userBadgeAssignments.userId, input.userId),
                        ),
                    );

                return { success: true };
            } catch (error) {
                if (error instanceof TRPCError) throw error;
                console.error('Error unassigning badge:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to unassign badge',
                });
            }
        }),

    // Get users in organization for badge assignment
    getOrgUsers: authProcedure
        .input(
            z.object({
                orgId: z.string(),
            }),
        )
        .query(async ({ input, ctx }) => {
            try {
                // Check if user has permission to view org users and is in the same org
                const currentUser = await db.query.users.findFirst({
                    where: eq(users.id, ctx.session.user.id),
                    columns: { orgId: true, appRole: true },
                });

                // Super admins can view org users for any organization
                const isSuperAdmin = currentUser?.appRole === 'admin';

                if (
                    !isSuperAdmin &&
                    (!currentUser || currentUser.orgId !== input.orgId)
                ) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You can only view users for your own organization',
                    });
                }

                const hasPermission = await checkUserPermission(
                    ctx.session.user.id,
                    'org',
                    'view_org',
                );

                if (!hasPermission && !isSuperAdmin) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'Insufficient permissions to view organization users',
                    });
                }

                // Get org users and their badge assignments separately
                const orgUsers = await db.query.users.findMany({
                    where: eq(users.orgId, input.orgId),
                    columns: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                });

                // Get badge assignments for all users
                const allBadgeAssignments =
                    await db.query.userBadgeAssignments.findMany({
                        where: inArray(
                            userBadgeAssignments.userId,
                            orgUsers.map((u) => u.id),
                        ),
                        with: {
                            badge: true,
                        },
                    });

                // Attach badge assignments to users
                const usersWithBadges = orgUsers.map((user) => ({
                    ...user,
                    badgeAssignments: allBadgeAssignments.filter(
                        (assignment) => assignment.userId === user.id,
                    ),
                }));

                return usersWithBadges;
            } catch (error) {
                if (error instanceof TRPCError) throw error;
                console.error('Error fetching organization users:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch organization users',
                });
            }
        }),

    // Get user badges
    getUserBadges: authProcedure
        .input(
            z.object({
                userId: z.string(),
            }),
        )
        .query(async ({ input, ctx }) => {
            try {
                // Check if user exists
                const user = await db.query.users.findFirst({
                    where: eq(users.id, input.userId),
                    columns: { id: true },
                });

                if (!user) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'User not found',
                    });
                }

                // Get user badge assignments
                const userBadges = await db.query.userBadgeAssignments.findMany(
                    {
                        where: eq(userBadgeAssignments.userId, input.userId),
                        with: {
                            badge: true,
                            assignedBy: {
                                columns: {
                                    id: true,
                                    name: true,
                                    email: true,
                                },
                            },
                        },
                        orderBy: [desc(userBadgeAssignments.assignedAt)],
                    },
                );

                return userBadges;
            } catch (error) {
                if (error instanceof TRPCError) throw error;
                console.error('Error fetching user badges:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch user badges',
                });
            }
        }),
});
