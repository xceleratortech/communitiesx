/* eslint-disable no-undef */
/**
 * @typedef {Object} NotificationData
 * @property {string} title - The notification title
 * @property {string} body - The notification body
 * @property {string} [icon] - Optional icon URL
 * @property {string} [url] - URL to open when notification is clicked
 */

/**
 * Validates the notification data structure
 * @param {any} data - The data to validate
 * @returns {boolean} True if data is valid
 */
function isValidNotificationData(data) {
    if (!data || typeof data !== 'object') return false;
    if (typeof data.title !== 'string' || !data.title) return false;
    if (typeof data.body !== 'string' || !data.body) return false;
    // URL is optional, but if provided must be a string
    if (data.url !== undefined && typeof data.url !== 'string') return false;
    return true;
}

/**
 * Validates the update service worker payload
 * @param {any} payload - The payload to validate
 * @returns {boolean} True if payload is valid
 */
function isValidUpdateSWData(payload) {
    // Minimal validation since this command doesn't require additional parameters
    // But we still check if the payload exists and is an object
    return payload && typeof payload === 'object';
}

/**
 * Handles service worker update
 * @returns {Promise<void>}
 */
function handleUpdateSW() {
    console.log('Updating service worker...');
    self.skipWaiting();
    return self.clients.claim();
}

/**
 * Shows a notification with the provided data
 * @param {NotificationData} notificationData - The notification data
 * @returns {Promise<void>}
 */
function handleNotify(notificationData) {
    const options = {
        body: notificationData.body,
        icon: notificationData.icon || '/icon.png',
        badge: '/badge.png',
        vibrate: [100, 50, 100],
        data: {
            url: notificationData.url || '/', // Store the URL to open in the notification data
            dateOfArrival: Date.now(),
            primaryKey: '2',
        },
    };
    return self.registration.showNotification(notificationData.title, options);
}

/**
 * @param {PushEvent} event
 */
self.addEventListener('push', function (event) {
    console.log('Push event data: ', event.data.text());
    try {
        if (event.data) {
            const payload = event.data.json();

            if (payload.command === 'notify') {
                if (!isValidNotificationData(payload.data)) {
                    console.error('Invalid notification data schema');
                    return;
                }
                event.waitUntil(handleNotify(payload.data));
            } else if (payload.command === 'update-sw') {
                if (!isValidUpdateSWData(payload)) {
                    console.error('Invalid update-sw data schema');
                    return;
                }
                event.waitUntil(handleUpdateSW());
            } else {
                // Fallback to existing notification logic for backward compatibility
                if (!isValidNotificationData(payload)) {
                    console.error('Invalid payload schema');
                    return;
                }
                const options = {
                    body: payload.body,
                    icon: payload.icon || '/icon.png',
                    badge: '/badge.png',
                    vibrate: [100, 50, 100],
                    data: {
                        dateOfArrival: Date.now(),
                        primaryKey: '2',
                    },
                };
                event.waitUntil(
                    self.registration.showNotification(payload.title, options),
                );
            }
        }
    } catch (e) {
        console.log('data is not json parsable', e);
    }
});

/**
 * @param {NotificationEvent} event
 */
self.addEventListener('notificationclick', function (event) {
    console.log('Notification click received.');
    event.notification.close();

    // Extract the URL from the notification data
    const url =
        event.notification.data && event.notification.data.url
            ? event.notification.data.url
            : '/';

    // Open the specified URL
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(function (clientList) {
            // If we have a client already open, focus it
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url === url && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        }),
    );
});
