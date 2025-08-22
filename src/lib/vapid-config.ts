import webpush from 'web-push';

let vapidConfigured = false;

/**
 * Ensures VAPID details are configured for web push notifications.
 * This function is called lazily to avoid configuration during build time
 * when environment variables might not be available.
 *
 * @returns true if VAPID is successfully configured, false otherwise
 */
export function ensureVapidConfigured(): boolean {
    if (vapidConfigured) return true;

    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

    if (!vapidPublic || !vapidPrivate) {
        console.error(
            'VAPID keys missing! Please set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables.',
        );
        return false;
    }

    try {
        webpush.setVapidDetails(
            'mailto:it@xcelerator.co.in',
            vapidPublic,
            vapidPrivate,
        );

        vapidConfigured = true;
        return true;
    } catch (error) {
        console.error('Failed to configure VAPID details:', error);
        return false;
    }
}

/**
 * Reset the VAPID configuration state (useful for testing)
 */
export function resetVapidConfiguration(): void {
    vapidConfigured = false;
}
