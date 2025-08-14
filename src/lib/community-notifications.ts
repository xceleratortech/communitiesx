import webpush from 'web-push';
import { db } from '@/server/db';
import {
    pushSubscriptions,
    notificationPreferences,
    users,
    communities,
    orgMembers,
    communityMembers,
    notifications,
} from '@/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

/**
 * Community Post Notification System
 *
 * NOTIFICATION RULES:
 * 1. Post creator NEVER receives notifications about their own posts
 * 2. Community members receive notifications (unless they've disabled them)
 * 3. Organization admins of the community's org receive notifications (unless they've disabled them)
 * 4. Super admins (users with appRole='admin') receive notifications for ALL communities (unless they've disabled them)
 * 5. Regular org members who are NOT in the community do NOT receive notifications
 *
 * This ensures that:
 * - Users don't get notified about their own posts
 * - Only relevant users get notifications
 * - Org admins stay informed about their communities
 * - Super admins stay informed about ALL communities regardless of which org they belong to
 */

webpush.setVapidDetails(
    'mailto:reachmrniranjan@gmail.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
);

export interface PushSubscriptionData {
    endpoint: string;
    p256dh: string;
    auth: string;
}

export async function sendCommunityPostNotification(
    communityId: number,
    postTitle: string,
    authorName: string,
    communityName: string,
    postId: number,
    authorId: string, // Add authorId parameter to exclude post creator
): Promise<void> {
    // Validate environment
    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    if (!vapidPublic || !vapidPrivate) {
        console.error('VAPID keys missing!');
        return;
    }

    try {
        // Get all users who should receive notifications for this community (excluding post creator)
        const usersToNotify = await getUsersToNotifyForCommunity(
            communityId,
            authorId,
        );

        if (usersToNotify.length === 0) {
            return;
        }

        // Get push subscriptions for these users
        const subscriptions = await db
            .select()
            .from(pushSubscriptions)
            .where(inArray(pushSubscriptions.userId, usersToNotify));

        if (subscriptions.length === 0) {
            return;
        }

        // Truncate post title for notification (max 100 chars)
        const truncatedTitle =
            postTitle.length > 100
                ? postTitle.substring(0, 100) + '...'
                : postTitle;

        const payload = JSON.stringify({
            command: 'notify',
            data: {
                title: `New post in ${communityName}`,
                body: `"${truncatedTitle}" by ${authorName}`,
                icon: '/icon.png',
                url: `/communities/${communityId}/posts/${postId}`,
            },
        });

        // Send notifications to all subscribers
        const notificationPromises = subscriptions.map(
            async (subscription, index) => {
                try {
                    const pushSubscription = {
                        endpoint: subscription.endpoint,
                        keys: {
                            auth: subscription.auth,
                            p256dh: subscription.p256dh,
                        },
                    };

                    const result = await webpush.sendNotification(
                        pushSubscription,
                        payload,
                    );
                } catch (error) {
                    console.error(
                        `❌ Failed to send community post notification ${index}:`,
                        {
                            message:
                                error instanceof Error
                                    ? error.message
                                    : String(error),
                            userId: subscription.userId,
                        },
                    );

                    // Handle expired subscriptions
                    if (error instanceof Error) {
                        const webPushError = error as any;
                        if (webPushError.statusCode === 410) {
                            console.log(
                                `Removing expired subscription for user ${subscription.userId}`,
                            );
                            // Remove expired subscription
                            await db
                                .delete(pushSubscriptions)
                                .where(
                                    eq(pushSubscriptions.id, subscription.id),
                                );
                        }
                    }
                }
            },
        );

        await Promise.allSettled(notificationPromises);
    } catch (error) {
        console.error('Error sending community post notifications:', error);
    }
}

async function getUsersToNotifyForCommunity(
    communityId: number,
    authorId: string,
): Promise<string[]> {
    try {
        // Get community details
        const community = await db.query.communities.findFirst({
            where: eq(communities.id, communityId),
        });

        if (!community) {
            console.error(`Community ${communityId} not found`);
            return [];
        }

        const userIds: string[] = [];
        let orgAdmins: { userId: string }[] = []; // Declare in broader scope

        // 1. Get community members (excluding post creator and those who have explicitly disabled notifications)
        const memberPreferences = await db
            .select({
                userId: notificationPreferences.userId,
                enabled: notificationPreferences.enabled,
            })
            .from(notificationPreferences)
            .where(eq(notificationPreferences.communityId, communityId));

        // Get all community members
        const allMembers = await db
            .select({
                userId: communityMembers.userId,
            })
            .from(communityMembers)
            .where(
                and(
                    eq(communityMembers.communityId, communityId),
                    eq(communityMembers.status, 'active'),
                    eq(communityMembers.membershipType, 'member'),
                ),
            );

        // Add members who haven't disabled notifications (default behavior) - EXCLUDE POST CREATOR
        allMembers.forEach((member) => {
            // Skip the post creator
            if (member.userId === authorId) {
                return;
            }

            const pref = memberPreferences.find(
                (p) => p.userId === member.userId,
            );
            // If no preference exists or preference is true (enabled), add to notifications
            if (!pref || pref.enabled) {
                userIds.push(member.userId);
            }
        });

        // 2. Get org admins for the community's organization (if any)
        // Only org admins of the community's organization should get notifications
        if (community.orgId) {
            orgAdmins = await db
                .select({
                    userId: orgMembers.userId,
                })
                .from(orgMembers)
                .where(
                    and(
                        eq(orgMembers.orgId, community.orgId), // Only org admins of THIS community's org
                        eq(orgMembers.role, 'admin'),
                        eq(orgMembers.status, 'active'),
                    ),
                );

            // Check if any org admins have disabled notifications for this community
            const orgAdminPreferences = await db
                .select({
                    userId: notificationPreferences.userId,
                    enabled: notificationPreferences.enabled,
                })
                .from(notificationPreferences)
                .where(
                    and(
                        eq(notificationPreferences.communityId, communityId),
                        inArray(
                            notificationPreferences.userId,
                            orgAdmins.map((a) => a.userId),
                        ),
                    ),
                );

            // Add org admins who haven't disabled notifications - EXCLUDE POST CREATOR
            orgAdmins.forEach((admin) => {
                // Skip the post creator
                if (admin.userId === authorId) {
                    return;
                }

                const pref = orgAdminPreferences.find(
                    (p) => p.userId === admin.userId,
                );
                if (!pref || pref.enabled) {
                    userIds.push(admin.userId);
                }
            });
        }

        // 3. Get super admins (users with appRole 'admin' - these have access across all organizations)
        // These are users who are super admins regardless of which org they belong to
        const superAdmins = await db
            .select({
                userId: users.id,
            })
            .from(users)
            .where(
                and(
                    eq(users.appRole, 'admin'),
                    eq(users.role, 'admin'), // Also ensure they have admin role in their org
                ),
            );

        // Check if any super admins have disabled notifications for this community
        const superAdminPreferences = await db
            .select({
                userId: notificationPreferences.userId,
                enabled: notificationPreferences.enabled,
            })
            .from(notificationPreferences)
            .where(
                and(
                    eq(notificationPreferences.communityId, communityId),
                    inArray(
                        notificationPreferences.userId,
                        superAdmins.map((a) => a.userId),
                    ),
                ),
            );

        // Add super admins who haven't disabled notifications - EXCLUDE POST CREATOR
        superAdmins.forEach((admin) => {
            // Skip the post creator
            if (admin.userId === authorId) {
                return;
            }

            const pref = superAdminPreferences.find(
                (p) => p.userId === admin.userId,
            );
            if (!pref || pref.enabled) {
                userIds.push(admin.userId);
            }
        });

        // Remove duplicates
        const finalUserIds = [...new Set(userIds)];

        return finalUserIds;
    } catch (error) {
        console.error('Error getting users to notify for community:', error);
        return [];
    }
}

// Save notifications to database for all eligible users (excluding post creator)
export async function saveCommunityPostNotifications(
    postTitle: string,
    authorName: string,
    communityName: string,
    postId: number,
    communityId: number,
    authorId: string,
): Promise<void> {
    try {
        // Get all users who should receive notifications (excluding post creator)
        const usersToNotify = await getUsersToNotifyForCommunity(
            communityId,
            authorId,
        );

        if (usersToNotify.length === 0) {
            return;
        }

        // Save notifications for all eligible users
        const notificationValues = usersToNotify.map((userId) => ({
            recipientId: userId,
            title: `New post in ${communityName}`,
            body: `"${postTitle}" by ${authorName}`,
            type: 'post',
            data: JSON.stringify({
                postId,
                communityId,
                authorName,
                communityName,
            }),
            isRead: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        }));

        await db.insert(notifications).values(notificationValues);
    } catch (error) {
        console.error('Error saving community post notifications:', error);
    }
}
