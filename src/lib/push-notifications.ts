import webpush from 'web-push';

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

export async function sendChatNotification(
    subscriptions: PushSubscriptionData[],
    senderName: string,
    messageContent: string,
    threadId?: string,
): Promise<void> {
    if (!subscriptions || subscriptions.length === 0) {
        console.log('No subscriptions to send notifications to');
        return;
    }

    // Truncate message content for notification (max 100 chars)
    const truncatedContent =
        messageContent.length > 100
            ? messageContent.substring(0, 100) + '...'
            : messageContent;

    const payload = JSON.stringify({
        command: 'notify',
        data: {
            title: `New message from ${senderName}`,
            body: truncatedContent,
            icon: '/icon.png', // Using your existing icon path
            url: threadId ? `/chat/${threadId}` : '/chat',
        },
    });

    console.log(`Payload for push notification: ${payload}`);

    const notificationPromises = subscriptions.map(async (subscription) => {
        try {
            const pushSubscription = {
                endpoint: subscription.endpoint,
                keys: {
                    auth: subscription.auth,
                    p256dh: subscription.p256dh,
                },
            };

            await webpush.sendNotification(pushSubscription, payload);
            console.log(
                'Push notification sent successfully to:',
                subscription.endpoint,
            );
        } catch (error) {
            console.error('Failed to send push notification:', error);

            // Handle specific error cases
            if (error instanceof Error) {
                // Type guard to check if error has statusCode property
                const webPushError = error as any;

                if (webPushError.statusCode === 410) {
                    console.log(
                        'Push subscription expired:',
                        subscription.endpoint,
                    );
                    // You might want to remove this subscription from the database
                    // This would need to be handled by the calling function
                } else if (webPushError.statusCode === 413) {
                    console.log('Payload too large:', subscription.endpoint);
                } else if (webPushError.statusCode === 429) {
                    console.log('Rate limit exceeded:', subscription.endpoint);
                }
            }

            // Don't throw error to prevent failing other notifications
            // Just log and continue
        }
    });

    // Wait for all notifications to be sent (or fail)
    await Promise.allSettled(notificationPromises);
    console.log(`Attempted to send ${subscriptions.length} push notifications`);
}

// Alternative function for sending to a single subscription
export async function sendChatNotificationSingle(
    subscription: PushSubscriptionData,
    senderName: string,
    messageContent: string,
    threadId?: string,
): Promise<boolean> {
    try {
        await sendChatNotification(
            [subscription],
            senderName,
            messageContent,
            threadId,
        );
        return true;
    } catch (error) {
        console.error('Failed to send single push notification:', error);
        return false;
    }
}

// Function to test push notifications
export async function sendTestNotification(
    subscription: PushSubscriptionData,
    testMessage: string = 'This is a test notification!',
): Promise<boolean> {
    try {
        const payload = JSON.stringify({
            command: 'notify',
            data: {
                title: 'Test Notification',
                body: testMessage,
                icon: '/icon.png',
                url: '/chat',
            },
        });

        const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
                auth: subscription.auth,
                p256dh: subscription.p256dh,
            },
        };

        await webpush.sendNotification(pushSubscription, payload);
        console.log('Test notification sent successfully');
        return true;
    } catch (error) {
        console.error('Failed to send test notification:', error);
        return false;
    }
}
