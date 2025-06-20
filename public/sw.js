/* eslint-disable no-undef */
/**
 * @typedef {Object} NotificationData
 * @property {string} title - The notification title
 * @property {string} body - The notification body
 * @property {string} [icon] - Optional icon URL
 * @property {string} [url] - URL to open when notification is clicked
 */

console.log('🔧 Service Worker loaded');

/**
 * Validates the notification data structure
 * @param {any} data - The data to validate
 * @returns {boolean} True if data is valid
 */
function isValidNotificationData(data) {
    console.log('📋 Validating notification data:', data);

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
    // URL is optional, but if provided must be a string
    if (data.url !== undefined && typeof data.url !== 'string') {
        console.error('❌ Invalid URL:', data.url);
        return false;
    }

    console.log('✅ Notification data is valid');
    return true;
}

/**
 * Shows a notification with the provided data
 * @param {NotificationData} notificationData - The notification data
 * @returns {Promise<void>}
 */
function handleNotify(notificationData) {
    console.log('=== 🔔 HANDLE NOTIFY START ===');
    console.log('📨 Notification data received:', notificationData);

    // Check service worker registration
    if (!self.registration) {
        console.error('❌ No service worker registration found');
        return Promise.reject(new Error('No service worker registration'));
    }

    console.log('🔧 Service worker registration exists:', !!self.registration);

    const options = {
        body: notificationData.body,
        icon: notificationData.icon || '/icon.png',
        badge: '/badge.png',
        vibrate: [100, 50, 100],
        requireInteraction: false,
        silent: false,
        tag: 'chat-message-' + Date.now(), // Unique tag to prevent grouping
        renotify: true, // Show even if similar notification exists
        data: {
            url: notificationData.url || '/',
            dateOfArrival: Date.now(),
            primaryKey: Date.now().toString(),
        },
    };

    console.log('⚙️ Notification options:', JSON.stringify(options, null, 2));
    console.log('🏷️ Showing notification with title:', notificationData.title);

    return self.registration
        .showNotification(notificationData.title, options)
        .then(() => {
            console.log('✅ Notification shown successfully');
            console.log('=== 🔔 HANDLE NOTIFY END (SUCCESS) ===');
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
    console.log('=== 📨 PUSH EVENT RECEIVED ===');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('🎯 Event object:', event);
    console.log('📦 Has data:', !!event.data);

    if (!event.data) {
        console.log('❌ No data in push event');
        return;
    }

    console.log('📄 Raw push data:', event.data.text());

    try {
        const payload = event.data.json();
        console.log('✅ Parsed payload:', JSON.stringify(payload, null, 2));
        console.log('🎯 Command:', payload.command);

        if (payload.command === 'notify') {
            console.log('🔔 Processing notify command');
            console.log('📨 Notification data:', payload.data);

            if (!isValidNotificationData(payload.data)) {
                console.error(
                    '❌ Invalid notification data schema:',
                    payload.data,
                );
                return;
            }

            console.log('📞 Calling handleNotify...');
            const notifyPromise = handleNotify(payload.data)
                .then(() => {
                    console.log(
                        '✅ Push notification process completed successfully',
                    );
                })
                .catch((err) => {
                    console.error('❌ Push notification process failed:', err);
                    // Still throw to prevent the push event from being marked as handled successfully
                    throw err;
                });

            event.waitUntil(notifyPromise);
        } else if (payload.command === 'update-sw') {
            console.log('🔄 Processing update-sw command');
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
        console.log('📄 Raw data was:', event.data.text());
        console.log('🔍 Parse error details:', {
            name: e.name,
            message: e.message,
            stack: e.stack,
        });
    }

    console.log('=== 📨 PUSH EVENT PROCESSING COMPLETE ===');
});

// Notification click handler
self.addEventListener('notificationclick', function (event) {
    console.log('=== 🖱️ NOTIFICATION CLICK EVENT ===');
    console.log('📨 Notification:', event.notification);
    console.log('💾 Notification data:', event.notification.data);

    event.notification.close();

    // Extract the URL from the notification data
    const url = event.notification.data?.url || '/';
    console.log('🔗 Opening URL:', url);

    // Open the specified URL
    event.waitUntil(
        clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then(function (clientList) {
                console.log('🪟 Found', clientList.length, 'window clients');

                // If we have a client already open to the target URL, focus it
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    console.log('🔍 Checking client URL:', client.url);

                    if (client.url.includes(url) && 'focus' in client) {
                        console.log('✅ Focusing existing client');
                        return client.focus();
                    }
                }

                // Otherwise open a new window
                if (clients.openWindow) {
                    console.log('🆕 Opening new window');
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
    console.log('🟢 Service Worker activated');
    event.waitUntil(self.clients.claim());
});

// Service worker installation
self.addEventListener('install', function (event) {
    console.log('⚡ Service Worker installed');
    self.skipWaiting();
});

console.log('✅ Service Worker setup complete');
