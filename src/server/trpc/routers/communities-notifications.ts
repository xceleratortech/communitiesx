import { z } from 'zod';
import { authProcedure } from '../trpc';
import { db } from '@/server/db';
import { TRPCError } from '@trpc/server';
import {
    notificationPreferences,
    communityMembers,
    communities,
    orgMembers,
} from '@/server/db/schema';
import { and, eq, inArray } from 'drizzle-orm';

// Helper function to check if user has access to modify notification preferences for a community
async function hasNotificationPreferenceAccess(
    userId: string,
    communityId: number,
): Promise<boolean> {
    // Check if user is a member of the community
    const membership = await db.query.communityMembers.findFirst({
        where: and(
            eq(communityMembers.userId, userId),
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.status, 'active'),
        ),
    });

    if (membership) {
        return true;
    }

    // Check if user is org admin for this community
    const community = await db.query.communities.findFirst({
        where: eq(communities.id, communityId),
    });

    if (community?.orgId) {
        const orgAdminCheck = await db.query.orgMembers.findFirst({
            where: and(
                eq(orgMembers.userId, userId),
                eq(orgMembers.orgId, community.orgId),
                eq(orgMembers.role, 'admin'),
                eq(orgMembers.status, 'active'),
            ),
        });
        return !!orgAdminCheck;
    }

    return false;
}

export const notificationProcedures = {
    // Disable notifications for a specific community (opt-out)
    disableCommunityNotifications: authProcedure
        .input(
            z.object({
                communityId: z.number(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            try {
                // Check if user has access to modify notification preferences for this community
                const hasAccess = await hasNotificationPreferenceAccess(
                    ctx.session.user.id,
                    input.communityId,
                );

                if (!hasAccess) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'You do not have access to this community',
                    });
                }

                // Set notification preference to disabled (false)
                await db
                    .insert(notificationPreferences)
                    .values({
                        userId: ctx.session.user.id,
                        communityId: input.communityId,
                        enabled: false, // false = notifications disabled
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    })
                    .onConflictDoUpdate({
                        target: [
                            notificationPreferences.userId,
                            notificationPreferences.communityId,
                        ],
                        set: {
                            enabled: false,
                            updatedAt: new Date(),
                        },
                    });

                return { success: true };
            } catch (error) {
                console.error(
                    'Error disabling community notifications:',
                    error,
                );
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to disable notifications',
                });
            }
        }),

    // Re-enable notifications for a specific community
    enableCommunityNotifications: authProcedure
        .input(
            z.object({
                communityId: z.number(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            try {
                // Check if user has access to modify notification preferences for this community
                const hasAccess = await hasNotificationPreferenceAccess(
                    ctx.session.user.id,
                    input.communityId,
                );

                if (!hasAccess) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'You do not have access to this community',
                    });
                }

                // Set notification preference to enabled (true)
                await db
                    .insert(notificationPreferences)
                    .values({
                        userId: ctx.session.user.id,
                        communityId: input.communityId,
                        enabled: true, // true = notifications enabled
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    })
                    .onConflictDoUpdate({
                        target: [
                            notificationPreferences.userId,
                            notificationPreferences.communityId,
                        ],
                        set: {
                            enabled: true,
                            updatedAt: new Date(),
                        },
                    });

                return { success: true };
            } catch (error) {
                console.error('Error enabling community notifications:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to enable notifications',
                });
            }
        }),

    // Check if notifications are disabled for a specific community
    getCommunityNotificationStatus: authProcedure
        .input(
            z.object({
                communityId: z.number(),
            }),
        )
        .query(async ({ input, ctx }) => {
            try {
                const preference =
                    await db.query.notificationPreferences.findFirst({
                        where: and(
                            eq(
                                notificationPreferences.userId,
                                ctx.session.user.id,
                            ),
                            eq(
                                notificationPreferences.communityId,
                                input.communityId,
                            ),
                        ),
                    });

                // If no preference exists, notifications are enabled by default
                // If preference exists and enabled is false, notifications are disabled
                return {
                    notificationsDisabled: preference
                        ? !preference.enabled
                        : false,
                };
            } catch (error) {
                console.error('Error checking notification status:', error);
                return { notificationsDisabled: false };
            }
        }),
};
