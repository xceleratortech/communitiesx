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
    if (!data || typeof data !== 'object') {
        console.error('❌ Invalid data: not an object');
        return false;
    }
    if (typeof data.title !== 'string' || !data.title) {
        console.error('❌ Invalid title:', data.title);
        return false;
    }
    if (typeof data.body !== 'string' || !data.body) {
        console.error('❌ Invalid body:', data.body);
        return false;
    }
    if (data.url !== undefined && typeof data.url !== 'string') {
        console.error('❌ Invalid URL:', data.url);
        return false;
    }

    return true;
}

/**
 * Shows a notification with the provided data
 * @param {NotificationData} notificationData - The notification data
 * @returns {Promise<void>}
 */
function handleNotify(notificationData) {
    if (!self.registration) {
        console.error('❌ No service worker registration found');
        return Promise.reject(new Error('No service worker registration'));
    }

    const options = {
        body: notificationData.body,
        icon: notificationData.icon || '/icon.png',
        badge: '/badge.png',
        vibrate: [100, 50, 100],
        requireInteraction: false,
        silent: false,
        tag: 'chat-message-' + Date.now(),
        renotify: true,
        data: {
            url: notificationData.url || '/',
            dateOfArrival: Date.now(),
            primaryKey: Date.now().toString(),
        },
    };

    return self.registration
        .showNotification(notificationData.title, options)
        .then(() => {
            return true;
        })
        .catch((err) => {
            console.error('❌ Failed to show notification:', err);
            console.error('🔍 Error details:', {
                name: err.name,
                message: err.message,
                stack: err.stack,
            });
            console.log('=== 🔔 HANDLE NOTIFY END (ERROR) ===');
            throw err;
        });
}

/**
 * Handles service worker update
 * @returns {Promise<void>}
 */
function handleUpdateSW() {
    console.log('🔄 Updating service worker...');
    self.skipWaiting();
    return self.clients.claim();
}

// Push event listener with detailed logging
self.addEventListener('push', function (event) {
    if (!event.data) {
        console.log('❌ No data in push event');
        return;
    }

    try {
        const payload = event.data.json();

        if (payload.command === 'notify') {
            if (!isValidNotificationData(payload.data)) {
                console.error(
                    '❌ Invalid notification data schema:',
                    payload.data,
                );
                return;
            }

            const notifyPromise = handleNotify(payload.data)
                .then(() => {
                    console.log(
                        '✅ Push notification process completed successfully',
                    );
                })
                .catch((err) => {
                    console.error('❌ Push notification process failed:', err);
                    throw err;
                });

            event.waitUntil(notifyPromise);
        } else if (payload.command === 'update-sw') {
            event.waitUntil(handleUpdateSW());
        } else {
            console.log(
                '❓ Unknown command, using fallback notification logic',
            );

            // Fallback for backward compatibility
            if (!isValidNotificationData(payload)) {
                console.error('❌ Invalid fallback payload schema:', payload);
                return;
            }

            const options = {
                body: payload.body,
                icon: payload.icon || '/icon.png',
                badge: '/badge.png',
                vibrate: [100, 50, 100],
                data: {
                    url: payload.url || '/',
                    dateOfArrival: Date.now(),
                    primaryKey: Date.now().toString(),
                },
            };

            event.waitUntil(
                self.registration
                    .showNotification(payload.title, options)
                    .then(() => console.log('✅ Fallback notification shown'))
                    .catch((err) =>
                        console.error('❌ Fallback notification failed:', err),
                    ),
            );
        }
    } catch (e) {
        console.error('❌ Failed to parse push data as JSON:', e);
    }
});

// Notification click handler
self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    // Extract the URL from the notification data
    const url = event.notification.data?.url || '/';

    // Open the specified URL
    event.waitUntil(
        clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then(function (clientList) {
                // If we have a client already open to the target URL, focus it
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];

                    if (client.url.includes(url) && 'focus' in client) {
                        return client.focus();
                    }
                }

                if (clients.openWindow) {
                    return clients.openWindow(url);
                } else {
                    console.error('❌ Cannot open new window - not supported');
                }
            })
            .catch((err) => {
                console.error('❌ Error handling notification click:', err);
            }),
    );
});

// Service worker activation
self.addEventListener('activate', function (event) {
    event.waitUntil(self.clients.claim());
});

// Service worker installation
self.addEventListener('install', function (event) {
    self.skipWaiting();
});

// Handle fetch events for share target
self.addEventListener('fetch', function (event) {
    const url = new URL(event.request.url);
    if (
        event.request.method === 'POST' &&
        url.pathname.endsWith('/share-target')
    ) {
        event.respondWith(
            (async () => {
                const formData = await event.request.formData();
                const data = {
                    title: formData.get('title') || '',
                    text: formData.get('text') || '',
                    url: formData.get('url') || '',
                    files: formData.getAll('file'),
                };

                // A more robust implementation would use IndexedDB to avoid race conditions.
                const clients = await self.clients.matchAll({
                    type: 'window',
                    includeUncontrolled: true,
                });
                clients.forEach((client) => {
                    client.postMessage({
                        type: 'SHARE_TARGET_DATA',
                        data: data,
                    });
                });

                // Redirect to the share target page to display the UI.
                return Response.redirect('/share-target', 303);
            })(),
        );
    }
});
