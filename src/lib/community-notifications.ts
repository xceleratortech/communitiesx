import webpush from 'web-push';
import { ensureVapidConfigured } from './vapid-config';
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
 * Recipients: Community members, org admins of community's org, super admins (appRole='admin')
 * Post creator is always excluded from notifications
 * Users can opt-out per community via notification preferences
 */

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
    // Ensure VAPID is configured
    if (!ensureVapidConfigured()) {
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

        // 1. Get all potential recipients first
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

        // 2. Get org admins for the community's organization (if any)
        let orgAdmins: { userId: string }[] = [];
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
        }

        // 3. Get super admins (users with appRole 'admin' - these have access across all organizations)
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

        // 4. Collect all potential recipient IDs (excluding post creator)
        const allPotentialRecipients: string[] = [];

        // Add community members (excluding post creator)
        allMembers.forEach((member) => {
            if (member.userId !== authorId) {
                allPotentialRecipients.push(member.userId);
            }
        });

        // Add org admins (excluding post creator)
        orgAdmins.forEach((admin) => {
            if (admin.userId !== authorId) {
                allPotentialRecipients.push(admin.userId);
            }
        });

        // Add super admins (excluding post creator)
        superAdmins.forEach((admin) => {
            if (admin.userId !== authorId) {
                allPotentialRecipients.push(admin.userId);
            }
        });

        // Remove duplicates from potential recipients
        const uniquePotentialRecipients = [...new Set(allPotentialRecipients)];

        // 5. Make a single query to get all notification preferences for all potential recipients
        let allPreferences: { userId: string; enabled: boolean }[] = [];
        if (uniquePotentialRecipients.length > 0) {
            allPreferences = await db
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
                            uniquePotentialRecipients,
                        ),
                    ),
                );
        }

        // 6. Filter recipients based on preferences (default is enabled if no preference exists)
        const finalUserIds = uniquePotentialRecipients.filter((userId) => {
            const pref = allPreferences.find((p) => p.userId === userId);
            // If no preference exists or preference is true (enabled), include in notifications
            return !pref || pref.enabled;
        });

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
