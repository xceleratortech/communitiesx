'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/server/auth/client';
import { trpc } from '@/providers/trpc-provider';
import { useChat } from '@/providers/chat-provider';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageSquare, Building, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface UserProfilePopoverProps {
    userId: string;
    children: React.ReactNode;
}

export function UserProfilePopover({
    userId,
    children,
}: UserProfilePopoverProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const { openChat, setActiveThreadId } = useChat();
    const [isOpen, setIsOpen] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Get user details
    const { data: userData, isLoading: isLoadingUser } =
        trpc.users.getUserProfile.useQuery({ userId }, { enabled: !!userId });

    // Get mutual communities
    const { data: mutualCommunities, isLoading: isLoadingCommunities } =
        trpc.users.getMutualCommunities.useQuery(
            { userId },
            { enabled: !!userId && !!session?.user },
        );

    // Move the useMutation hook to the top level of the component
    const findOrCreateThreadMutation = trpc.chat.findOrCreateThread.useMutation(
        {
            onSuccess: (data) => {
                setActiveThreadId(data.threadId);
                openChat();
            },
        },
    );

    // Function to start a chat with this user
    const startChat = (e: React.MouseEvent) => {
        // Prevent the default navigation behavior
        e.preventDefault();
        e.stopPropagation();

        // Close the popover
        setIsOpen(false);

        // Use the mutation defined at the top level
        findOrCreateThreadMutation.mutate({ recipientId: userId });
    };

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

    // Handlers for mouse events to control hover behavior
    const handleMouseEnter = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        timeoutRef.current = setTimeout(() => {
            setIsOpen(true);
        }, 1000);
    };

    const handleMouseLeave = () => {
        // Clear the open timeout if the mouse leaves before the popover opens
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        // Add a small delay before closing to prevent flickering
        timeoutRef.current = setTimeout(() => {
            setIsOpen(false);
        }, 300); // Small delay to prevent closing when moving to popover content
    };

    // Handle community badge click
    const handleCommunityClick = (e: React.MouseEvent, slug: string) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(false);
        router.push(`/communities/${slug}`);
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <span
                    className="cursor-pointer hover:underline"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    {children}
                </span>
            </PopoverTrigger>
            <PopoverContent
                className="w-80 p-0"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={(e) => e.stopPropagation()}
            >
                {isLoadingUser ? (
                    <div className="space-y-3 p-4">
                        <div className="flex items-center space-x-3">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                        </div>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                ) : userData ? (
                    <div className="space-y-3">
                        {/* User header */}
                        <div className="flex items-center space-x-3 border-b p-4">
                            <Avatar className="h-12 w-12">
                                <AvatarImage
                                    src={userData.image || undefined}
                                />
                                <AvatarFallback>
                                    {getInitials(userData.name || '')}
                                </AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                                <h3 className="font-medium">{userData.name}</h3>
                                <p className="text-muted-foreground text-sm">
                                    {userData.email}
                                </p>
                            </div>
                        </div>

                        {/* User details */}
                        <div className="space-y-2 px-4">
                            {userData.orgName && (
                                <div className="flex items-center text-sm">
                                    <Building className="text-muted-foreground mr-2 h-4 w-4" />
                                    <span>
                                        Organization:{' '}
                                        <span className="font-medium">
                                            {userData.orgName}
                                        </span>
                                    </span>
                                </div>
                            )}

                            {/* Mutual communities */}
                            <div className="space-y-1">
                                <div className="flex items-center text-sm">
                                    <Users className="text-muted-foreground mr-2 h-4 w-4" />
                                    <span>Mutual Communities:</span>
                                </div>

                                {isLoadingCommunities ? (
                                    <div className="space-y-1 pl-6">
                                        <Skeleton className="h-3 w-24" />
                                        <Skeleton className="h-3 w-32" />
                                    </div>
                                ) : mutualCommunities &&
                                  mutualCommunities.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 pl-6">
                                        {mutualCommunities.map((community) => (
                                            <Badge
                                                key={community.id}
                                                variant="outline"
                                                className="cursor-pointer"
                                                onClick={(e) =>
                                                    handleCommunityClick(
                                                        e,
                                                        community.slug,
                                                    )
                                                }
                                            >
                                                {community.name}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground pl-6 text-xs">
                                        No mutual communities
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        {/* <div className="flex justify-end border-t p-4">
                            <Button
                                size="sm"
                                onClick={startChat}
                                disabled={
                                    session?.user?.id === userId ||
                                    findOrCreateThreadMutation.isPending
                                }
                            >
                                <MessageSquare className="mr-2 h-4 w-4" />
                                {findOrCreateThreadMutation.isPending
                                    ? 'Opening...'
                                    : 'Message'}
                            </Button>
                        </div> */}
                    </div>
                ) : (
                    <div className="p-4 text-center">
                        <p className="text-muted-foreground text-sm">
                            User not found
                        </p>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
