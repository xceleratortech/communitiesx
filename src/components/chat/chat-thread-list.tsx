'use client';

import React from 'react';
import { useChat } from '@/providers/chat-provider';
import { trpc } from '@/providers/trpc-provider';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquarePlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { UserProfilePopover } from '@/components/ui/user-profile-popover';

export function ChatThreadList() {
    const { setActiveThreadId, openNewChat } = useChat();
    const { data: threads, isLoading } = trpc.chat.getThreads.useQuery(
        undefined,
        {
            refetchInterval: 10000, // Poll every 10 seconds
        },
    );

    // Function to get initials from name
    const getInitials = (name: string) => {
        if (!name) return '?';
        return name
            .split(' ')
            .map((part) => part[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    // Function to format the timestamp
    const formatTime = (timestamp: string | Date) => {
        try {
            return formatDistanceToNow(new Date(timestamp), {
                addSuffix: true,
            });
        } catch (error) {
            return '';
        }
    };

    return (
        <div className="flex h-full w-full flex-col">
            {/* New Chat Button */}
            <div className="p-3">
                <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={openNewChat}
                >
                    <MessageSquarePlus className="mr-2 h-4 w-4" />
                    New Message
                </Button>
            </div>

            {/* Thread List */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="space-y-2 p-3">
                        {Array(5)
                            .fill(0)
                            .map((_, i) => (
                                <div
                                    key={i}
                                    className="flex items-center space-x-3 rounded-md p-2"
                                >
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="flex-1 space-y-1">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-3 w-full" />
                                    </div>
                                </div>
                            ))}
                    </div>
                ) : threads && threads.length > 0 ? (
                    <div className="space-y-1 p-1">
                        {threads.map((thread) => (
                            <Button
                                key={thread.id}
                                variant="ghost"
                                className="w-full justify-start rounded-md p-2 text-left"
                                onClick={() => setActiveThreadId(thread.id)}
                            >
                                <div className="flex w-full items-center space-x-3">
                                    <UserProfilePopover
                                        userId={thread.otherUser?.id || ''}
                                    >
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage
                                                src={
                                                    thread.otherUser?.image ||
                                                    undefined
                                                }
                                            />
                                            <AvatarFallback>
                                                {getInitials(
                                                    thread.otherUser?.name ||
                                                        '',
                                                )}
                                            </AvatarFallback>
                                        </Avatar>
                                    </UserProfilePopover>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex items-center justify-between">
                                            <UserProfilePopover
                                                userId={
                                                    thread.otherUser?.id || ''
                                                }
                                            >
                                                <p className="truncate font-medium">
                                                    {thread.otherUser?.name ||
                                                        'Unknown User'}
                                                </p>
                                            </UserProfilePopover>
                                            <span className="text-muted-foreground text-xs">
                                                {formatTime(
                                                    thread.lastMessageAt,
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex items-center">
                                            <p className="text-muted-foreground flex-1 truncate text-sm">
                                                {thread.lastMessagePreview ||
                                                    'No messages yet'}
                                            </p>
                                            {thread.unreadCount > 0 && (
                                                <Badge
                                                    variant="destructive"
                                                    className="ml-1 h-5 min-w-5 rounded-full px-1 text-xs"
                                                >
                                                    {thread.unreadCount}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Button>
                        ))}
                    </div>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                        <MessageSquarePlus className="text-muted-foreground mb-2 h-8 w-8" />
                        <p className="text-sm font-medium">
                            No conversations yet
                        </p>
                        <p className="text-muted-foreground text-xs">
                            Start a new conversation by clicking the button
                            above
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Default export for dynamic imports
export default ChatThreadList;
