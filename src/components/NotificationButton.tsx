'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { trpc } from '@/providers/trpc-provider';
import { toast } from 'sonner'; // or whatever toast library you're using

export function NotificationButton() {
    const [isSupported, setIsSupported] = useState(false);

    // Check subscription status
    const { data: subscriptionStatus, refetch: refetchStatus } =
        trpc.chat.getSubscriptionStatus.useQuery();

    const subscribeMutation = trpc.chat.subscribeToPush.useMutation({
        onSuccess: () => {
            toast.success('Push notifications enabled!');
            refetchStatus();
        },
        onError: (error) => {
            toast.error('Failed to enable notifications: ' + error.message);
        },
    });

    const unsubscribeMutation = trpc.chat.unsubscribeFromPush.useMutation({
        onSuccess: () => {
            toast.success('Push notifications disabled');
            refetchStatus();
        },
        onError: (error) => {
            toast.error('Failed to disable notifications: ' + error.message);
        },
    });

    useEffect(() => {
        setIsSupported('serviceWorker' in navigator && 'PushManager' in window);
    }, []);

    const handleSubscribe = async () => {
        if (!isSupported) {
            toast.error('Push notifications are not supported in this browser');
            return;
        }

        try {
            // Request permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                toast.error('Permission denied for notifications');
                return;
            }

            // Get service worker registration
            const registration = await navigator.serviceWorker.ready;

            // Subscribe to push notifications
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
            });

            // Convert subscription to the format expected by your API
            const subscriptionData = {
                endpoint: subscription.endpoint,
                p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
                auth: arrayBufferToBase64(subscription.getKey('auth')!),
            };

            // Send subscription to server
            await subscribeMutation.mutateAsync(subscriptionData);
        } catch (error) {
            console.error('Error subscribing to push notifications:', error);
            toast.error('Failed to enable notifications');
        }
    };

    const handleUnsubscribe = async () => {
        try {
            // Unsubscribe from browser
            const registration = await navigator.serviceWorker.ready;
            const subscription =
                await registration.pushManager.getSubscription();

            if (subscription) {
                await subscription.unsubscribe();
            }

            // Remove from server
            await unsubscribeMutation.mutateAsync();
        } catch (error) {
            console.error(
                'Error unsubscribing from push notifications:',
                error,
            );
            toast.error('Failed to disable notifications');
        }
    };

    const handleClick = () => {
        if (subscriptionStatus?.isSubscribed) {
            handleUnsubscribe();
        } else {
            handleSubscribe();
        }
    };

    if (!isSupported) {
        return null; // Don't show the button if not supported
    }

    const isLoading =
        subscribeMutation.isPending || unsubscribeMutation.isPending;

    return (
        <button
            onClick={handleClick}
            disabled={isLoading}
            className="rounded-md p-2 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-800"
            title={
                subscriptionStatus?.isSubscribed
                    ? 'Disable notifications'
                    : 'Enable notifications'
            }
        >
            {subscriptionStatus?.isSubscribed ? (
                <BellOff className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            ) : (
                <Bell className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            )}
        </button>
    );
}

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
