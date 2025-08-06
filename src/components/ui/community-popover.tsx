'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/providers/trpc-provider';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Building, Users, MessageSquare, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Community } from '@/types/models';

interface CommunityPopoverProps {
    communityId: number;
    children: React.ReactNode;
}

export function CommunityPopover({
    communityId,
    children,
}: CommunityPopoverProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Get community details
    const { data: communityData, isLoading } =
        trpc.communities.getById.useQuery(
            { id: communityId },
            { enabled: !!communityId },
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

    // Handlers for mouse events to control hover behavior
    const handleMouseEnter = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        // Add a delay before showing the popover
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

    // Handle community click
    const handleCommunityClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(false);
        if (communityData?.slug) {
            router.push(`/communities/${communityData.slug}`);
        }
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
                {isLoading ? (
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
                ) : communityData ? (
                    <div className="space-y-3">
                        {/* Community header */}
                        <div className="flex items-center space-x-3 border-b p-4">
                            <Avatar className="h-12 w-12">
                                <AvatarImage
                                    src={communityData.avatar || undefined}
                                />
                                <AvatarFallback>
                                    {getInitials(communityData.name || '')}
                                </AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                                <h3 className="font-medium">
                                    {communityData.name}
                                </h3>
                                <p className="text-muted-foreground text-sm">
                                    {communityData.type === 'public'
                                        ? 'Public Community'
                                        : 'Private Community'}
                                </p>
                            </div>
                        </div>

                        {/* Community details */}
                        <div className="space-y-2 px-4">
                            {communityData.allowedOrgs &&
                                communityData.allowedOrgs[0]?.organization && (
                                    <div className="flex items-center text-sm">
                                        <Building className="text-muted-foreground mr-2 h-4 w-4" />
                                        <span>
                                            Organization:{' '}
                                            <span className="font-medium">
                                                {
                                                    communityData.allowedOrgs[0]
                                                        .organization.name
                                                }
                                            </span>
                                        </span>
                                    </div>
                                )}

                            <div className="flex items-center text-sm">
                                <Users className="text-muted-foreground mr-2 h-4 w-4" />
                                <span>
                                    Members:{' '}
                                    <span className="font-medium">
                                        {
                                            communityData.members.filter(
                                                (m) =>
                                                    m.membershipType ===
                                                    'member',
                                            ).length
                                        }
                                    </span>
                                </span>
                            </div>

                            <div className="flex items-center text-sm">
                                <Users className="text-muted-foreground mr-2 h-4 w-4" />
                                <span>
                                    Followers:{' '}
                                    <span className="font-medium">
                                        {
                                            communityData.members.filter(
                                                (m) =>
                                                    m.membershipType ===
                                                    'follower',
                                            ).length
                                        }
                                    </span>
                                </span>
                            </div>

                            <div className="flex items-center text-sm">
                                <FileText className="text-muted-foreground mr-2 h-4 w-4" />
                                <span>
                                    Posts:{' '}
                                    <span className="font-medium">
                                        {communityData.posts.length}
                                    </span>
                                </span>
                            </div>
                        </div>

                        {/* Description */}
                        {communityData.description && (
                            <div className="border-t px-4 py-3">
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    {communityData.description}
                                </p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end border-t p-4">
                            <Button size="sm" onClick={handleCommunityClick}>
                                Visit Community
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 text-center">
                        <p className="text-muted-foreground text-sm">
                            Community not found
                        </p>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
