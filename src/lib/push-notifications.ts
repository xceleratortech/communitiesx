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
    // Validate environment
    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    if (!vapidPublic || !vapidPrivate) {
        console.error('VAPID keys missing!');
        return;
    }

    if (!subscriptions || subscriptions.length === 0) {
        return;
    }

    // Log subscription details
    subscriptions.forEach((sub, index) => {
        console.log(`Subscription ${index}:`, {
            hasEndpoint: !!sub.endpoint,
            endpointStart: sub.endpoint?.substring(0, 50) + '...',
            hasAuth: !!sub.auth,
            hasP256dh: !!sub.p256dh,
            authLength: sub.auth?.length,
            p256dhLength: sub.p256dh?.length,
        });
    });

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

                console.log(`Subscription ${index} formatted:`, {
                    endpoint:
                        pushSubscription.endpoint.substring(0, 50) + '...',
                    hasKeys: !!pushSubscription.keys,
                    keysAuth:
                        pushSubscription.keys.auth?.substring(0, 10) + '...',
                    keysP256dh:
                        pushSubscription.keys.p256dh?.substring(0, 10) + '...',
                });

                const result = await webpush.sendNotification(
                    pushSubscription,
                    payload,
                );
                console.log(`✅ Notification ${index} sent successfully:`, {
                    statusCode: result.statusCode,
                    headers: result.headers,
                });
            } catch (error) {
                console.error(`❌ Failed to send notification ${index}:`, {
                    message:
                        error instanceof Error ? error.message : String(error),
                    statusCode: (error as any).statusCode,
                    body: (error as any).body,
                    endpoint: subscription.endpoint.substring(0, 50) + '...',
                });

                // Detailed error analysis
                if (error instanceof Error) {
                    const webPushError = error as any;

                    switch (webPushError.statusCode) {
                        case 400:
                            console.error(
                                'Bad Request - Invalid subscription or payload',
                            );
                            break;
                        case 401:
                            console.error('Unauthorized - VAPID key issues');
                            break;
                        case 410:
                            console.error('Gone - Subscription expired');
                            break;
                        case 413:
                            console.error('Payload Too Large');
                            break;
                        case 429:
                            console.error('Too Many Requests - Rate limited');
                            break;
                        default:
                            console.error('Unexpected error:', webPushError);
                    }
                }
            }
        },
    );

    const results = await Promise.allSettled(notificationPromises);
    results.forEach((result, index) => {
        if (result.status === 'rejected') {
            console.error(`Subscription ${index} failed:`, result.reason);
        }
    });
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
