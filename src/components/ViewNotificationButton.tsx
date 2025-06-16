'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Bell,
    BellRing,
    X,
    Trash2,
    MessageCircle,
    Check,
    CheckCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/providers/trpc-provider';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface NotificationData {
    threadId?: number;
    messageId?: number;
    senderId?: string;
}

interface Notification {
    id: number;
    title: string;
    body: string;
    type: string;
    data: string | null;
    isRead: boolean;
    createdAt: Date;
}

export function ViewNotificationButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [cursor, setCursor] = useState<number | undefined>(undefined);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const observerTarget = useRef<HTMLDivElement>(null);

    // Get unread count
    const { data: unreadCount = 0, refetch: refetchUnreadCount } =
        trpc.chat.getUnreadNotificationsCount.useQuery(undefined, {
            refetchInterval: 30000, // Refetch every 30 seconds
        });

    // Get notifications query
    const {
        data: notificationsData,
        isLoading: isInitialLoading,
        refetch: refetchNotifications,
    } = trpc.chat.getNotifications.useQuery(
        { limit: 10, cursor },
        {
            enabled: isOpen,
        },
    );

    // Handle notifications data changes
    useEffect(() => {
        if (notificationsData) {
            if (cursor === undefined) {
                setNotifications(notificationsData.notifications);
            } else {
                setNotifications((prev) => [
                    ...prev,
                    ...notificationsData.notifications,
                ]);
            }
            setHasNextPage(!!notificationsData.nextCursor);
            setCursor(notificationsData.nextCursor);
            setIsLoadingMore(false);
        }
    }, [notificationsData, cursor]);

    // Mark notification as read mutation
    const markAsReadMutation = trpc.chat.markNotificationAsRead.useMutation({
        onSuccess: () => {
            refetchUnreadCount();
            refetchNotifications();
        },
    });

    // Mark all as read mutation
    const markAllAsReadMutation = trpc.chat.markNotificationsAsRead.useMutation(
        {
            onSuccess: () => {
                refetchUnreadCount();
                refetchNotifications();
                setNotifications((prev) =>
                    prev.map((n) => ({ ...n, isRead: true })),
                );
            },
        },
    );

    // Delete notification mutation
    const deleteNotificationMutation = trpc.chat.deleteNotification.useMutation(
        {
            onSuccess: (_, variables) => {
                setNotifications((prev) =>
                    prev.filter((n) => n.id !== variables.notificationId),
                );
                refetchUnreadCount();
            },
        },
    );

    const loadMore = useCallback(() => {
        if (!hasNextPage || isLoadingMore || !cursor) return;

        setIsLoadingMore(true);
        refetchNotifications();
    }, [hasNextPage, isLoadingMore, cursor, refetchNotifications]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (
                    entries[0]?.isIntersecting &&
                    hasNextPage &&
                    !isLoadingMore
                ) {
                    loadMore();
                }
            },
            { threshold: 0.1 },
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [loadMore, hasNextPage, isLoadingMore]);

    // Reset state when opening
    const handleToggle = () => {
        if (!isOpen) {
            setNotifications([]);
            setCursor(undefined);
            setHasNextPage(true);
        }
        setIsOpen(!isOpen);
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.isRead) {
            markAsReadMutation.mutate({ notificationId: notification.id });
        }

        if (notification.data) {
            try {
                const data: NotificationData = JSON.parse(notification.data);
                if (notification.type === 'dm' && data.threadId) {
                    window.location.href = `/chat?thread=${data.threadId}`;
                }
            } catch (error) {
                console.error('Error parsing notification data:', error);
            }
        }
    };

    const formatTime = (date: Date) => {
        return formatDistanceToNow(new Date(date), { addSuffix: true });
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'dm':
                return <MessageCircle className="h-4 w-4 text-blue-500" />;
            default:
                return <Bell className="h-4 w-4 text-gray-500" />;
        }
    };

    return (
        <div className="relative">
            <Button
                variant="outline"
                size="sm"
                className="relative p-2"
                onClick={handleToggle}
            >
                <span className="block sm:hidden">
                    <BellRing className="h-5 w-5" />
                </span>

                <span className="hidden sm:flex sm:items-center sm:gap-2">
                    Notifications <Bell className="h-5 w-5" />
                </span>

                {unreadCount > 0 && (
                    <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                )}
            </Button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                        <div className="flex items-center justify-between border-b p-4 dark:border-gray-700">
                            <h3 className="text-lg font-semibold dark:text-white">
                                Notifications
                            </h3>
                            <div className="flex items-center space-x-2">
                                {unreadCount > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            markAllAsReadMutation.mutate({})
                                        }
                                        className="text-xs"
                                        disabled={
                                            markAllAsReadMutation.isPending
                                        }
                                    >
                                        <CheckCheck className="mr-1 h-3 w-3" />
                                        Mark all read
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsOpen(false)}
                                    className="p-1"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Notifications List */}
                        <ScrollArea className="h-96" ref={scrollAreaRef}>
                            <div className="p-2">
                                {isInitialLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600"></div>
                                    </div>
                                ) : notifications.length === 0 ? (
                                    <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                                        <Bell className="mx-auto mb-2 h-8 w-8 opacity-50" />
                                        <p className="text-sm">
                                            No notifications yet
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {notifications.map(
                                            (notification, index) => (
                                                <div key={notification.id}>
                                                    <div
                                                        className={cn(
                                                            'group cursor-pointer rounded-lg p-3 transition-colors',
                                                            !notification.isRead
                                                                ? 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30'
                                                                : 'hover:bg-gray-100 dark:hover:bg-gray-700',
                                                        )}
                                                        onClick={() =>
                                                            handleNotificationClick(
                                                                notification,
                                                            )
                                                        }
                                                    >
                                                        <div className="flex items-start space-x-3">
                                                            <div className="mt-1 flex-shrink-0">
                                                                {getNotificationIcon(
                                                                    notification.type,
                                                                )}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center justify-between">
                                                                    <p
                                                                        className={cn(
                                                                            'truncate text-sm font-medium',
                                                                            !notification.isRead
                                                                                ? 'text-gray-900 dark:text-white'
                                                                                : 'text-gray-700 dark:text-gray-300',
                                                                        )}
                                                                    >
                                                                        {
                                                                            notification.title
                                                                        }
                                                                    </p>
                                                                    {!notification.isRead && (
                                                                        <div className="ml-2 h-2 w-2 flex-shrink-0 rounded-full bg-blue-600" />
                                                                    )}
                                                                </div>
                                                                <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                                                                    {
                                                                        notification.body
                                                                    }
                                                                </p>
                                                                <div className="mt-2 flex items-center justify-between">
                                                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                                                        {formatTime(
                                                                            notification.createdAt,
                                                                        )}
                                                                    </span>
                                                                    <div className="flex items-center space-x-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                                        {!notification.isRead && (
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="h-6 w-6 p-0"
                                                                                onClick={(
                                                                                    e,
                                                                                ) => {
                                                                                    e.stopPropagation();
                                                                                    markAsReadMutation.mutate(
                                                                                        {
                                                                                            notificationId:
                                                                                                notification.id,
                                                                                        },
                                                                                    );
                                                                                }}
                                                                            >
                                                                                <Check className="h-3 w-3" />
                                                                            </Button>
                                                                        )}
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                                                            onClick={(
                                                                                e,
                                                                            ) => {
                                                                                e.stopPropagation();
                                                                                deleteNotificationMutation.mutate(
                                                                                    {
                                                                                        notificationId:
                                                                                            notification.id,
                                                                                    },
                                                                                );
                                                                            }}
                                                                        >
                                                                            <Trash2 className="h-3 w-3" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {index <
                                                        notifications.length -
                                                            1 && (
                                                        <Separator className="my-1" />
                                                    )}
                                                </div>
                                            ),
                                        )}

                                        {isLoadingMore && (
                                            <div className="flex items-center justify-center py-4">
                                                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600"></div>
                                            </div>
                                        )}

                                        {hasNextPage && (
                                            <div
                                                ref={observerTarget}
                                                className="h-1"
                                            />
                                        )}

                                        {!hasNextPage &&
                                            notifications.length > 5 && (
                                                <div className="py-4 text-center text-xs text-gray-400 dark:text-gray-500">
                                                    You've reached the end
                                                </div>
                                            )}
                                    </>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </>
            )}
        </div>
    );
}
