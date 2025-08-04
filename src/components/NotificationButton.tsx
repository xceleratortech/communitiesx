'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, ChevronRight } from 'lucide-react';
import { trpc } from '@/providers/trpc-provider';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NotificationButtonProps {
    variant?: 'popover' | 'default';
}

export function NotificationButton({
    variant = 'default',
}: NotificationButtonProps) {
    const [isSupported, setIsSupported] = useState(false);

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
        console.log('handleSubscribe called');
        if (!isSupported) {
            toast.error('Push notifications are not supported in this browser');
            return;
        }

        try {
            let permission = Notification.permission;
            if (permission === 'default') {
                permission = await Notification.requestPermission();
            }

            if (permission !== 'granted') {
                toast.error('Permission denied for notifications');
                return;
            }

            if (!('serviceWorker' in navigator)) {
                throw new Error('Service Worker not supported');
            }

            let registration: ServiceWorkerRegistration;
            const existingRegistration =
                await navigator.serviceWorker.getRegistration();

            if (existingRegistration) {
                registration = existingRegistration;
            } else {
                registration = await navigator.serviceWorker.register('/sw.js');
            }

            const readyPromise = navigator.serviceWorker.ready;
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(
                    () => reject(new Error('Service worker ready timeout')),
                    10000,
                ),
            );

            registration = await Promise.race([readyPromise, timeoutPromise]);

            if (!registration.pushManager) {
                throw new Error('Push manager unavailable');
            }

            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!vapidKey) {
                throw new Error('VAPID key not configured');
            }

            const applicationServerKey = urlBase64ToUint8Array(vapidKey);

            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: applicationServerKey,
                });
            }

            const subscriptionData = {
                endpoint: subscription.endpoint,
                p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
                auth: arrayBufferToBase64(subscription.getKey('auth')!),
            };

            await subscribeMutation.mutateAsync(subscriptionData);
        } catch (error) {
            if (error instanceof Error) {
                if (error.name === 'NotSupportedError') {
                    toast.error('Push messaging is not supported');
                } else if (error.name === 'NotAllowedError') {
                    toast.error('Permission not granted for notifications');
                } else if (error.name === 'AbortError') {
                    toast.error('Subscription was aborted');
                } else {
                    toast.error(
                        `Failed to enable notifications: ${error.message}`,
                    );
                }
            } else {
                toast.error('Failed to enable notifications');
            }
        }
    };

    const handleUnsubscribe = async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription =
                await registration.pushManager.getSubscription();

            if (subscription) {
                await subscription.unsubscribe();
            }

            await unsubscribeMutation.mutateAsync();
        } catch (error) {
            toast.error('Failed to disable notifications');
        }
    };

    const getNotificationIcon = () => {
        return subscriptionStatus?.isSubscribed ? (
            <BellOff className="h-4 w-4" />
        ) : (
            <Bell className="h-4 w-4" />
        );
    };

    const getNotificationLabel = () => {
        return subscriptionStatus?.isSubscribed ? 'On' : 'Off';
    };

    const isLoading =
        subscribeMutation.isPending || unsubscribeMutation.isPending;

    if (!isSupported) {
        return null;
    }

    if (variant === 'popover') {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        className="flex w-full items-center justify-between space-x-2 rounded-md p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                        disabled={isLoading}
                    >
                        <div className="flex items-center space-x-2">
                            {getNotificationIcon()}
                            <span>Notifications: {getNotificationLabel()}</span>
                        </div>
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="right">
                    <DropdownMenuItem
                        onClick={handleSubscribe}
                        disabled={isLoading || subscriptionStatus?.isSubscribed}
                    >
                        <Bell className="mr-2 h-4 w-4" />
                        Turn On
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={handleUnsubscribe}
                        disabled={
                            isLoading || !subscriptionStatus?.isSubscribed
                        }
                    >
                        <BellOff className="mr-2 h-4 w-4" />
                        Turn Off
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    disabled={isLoading}
                >
                    {getNotificationIcon()}
                    <span>{getNotificationLabel()}</span>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    onClick={handleSubscribe}
                    disabled={isLoading || subscriptionStatus?.isSubscribed}
                >
                    <Bell className="mr-2 h-4 w-4" />
                    Turn On
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={handleUnsubscribe}
                    disabled={isLoading || !subscriptionStatus?.isSubscribed}
                >
                    <BellOff className="mr-2 h-4 w-4" />
                    Turn Off
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    try {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    } catch (error) {
        const rawData = window.atob(base64String);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
}
