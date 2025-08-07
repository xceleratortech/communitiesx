'use client';

import { trpc } from '@/providers/trpc-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { MoreHorizontal } from 'lucide-react';

interface UserBadgesInTableProps {
    userId: string;
}

export function UserBadgesInTable({ userId }: UserBadgesInTableProps) {
    const { data: userBadges, isLoading } = trpc.badges.getUserBadges.useQuery(
        { userId },
        { enabled: !!userId },
    );

    if (isLoading) {
        return <div className="bg-muted h-4 w-8 animate-pulse rounded" />;
    }

    if (!userBadges || userBadges.length === 0) {
        return (
            <div className="flex justify-center">
                <span className="text-muted-foreground text-xs">N/A</span>
            </div>
        );
    }

    // For table display, show max 2 badges, then show dropdown for more
    const maxDisplay = 2;
    const displayBadges = userBadges.slice(0, maxDisplay);
    const remainingBadges = userBadges.slice(maxDisplay);
    const hasMoreBadges = remainingBadges.length > 0;

    return (
        <div className="flex justify-center">
            <div className="flex items-center gap-1">
                {/* Display first 2 badges */}
                {displayBadges.map((userBadge) => (
                    <div
                        key={userBadge.badge.id}
                        className="flex cursor-help items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-white"
                        style={{
                            backgroundColor: userBadge.badge.color,
                        }}
                        title={`${userBadge.badge.name}${userBadge.badge.description ? ` - ${userBadge.badge.description}` : ''}${userBadge.note ? ` (Note: ${userBadge.note})` : ''}`}
                    >
                        <div className="flex h-4 w-4 items-center justify-center text-xs font-semibold">
                            {userBadge.badge.icon || userBadge.badge.name[0]}
                        </div>
                        <span className="text-xs">
                            - {userBadge.badge.name}
                        </span>
                    </div>
                ))}

                {/* Show dropdown for additional badges */}
                {hasMoreBadges && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="hover:bg-muted h-6 w-6 p-0"
                                title={`View ${remainingBadges.length} more badges`}
                            >
                                <MoreHorizontal className="h-3 w-3" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-42" align="center">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium">
                                        All Badges ({userBadges.length})
                                    </h4>
                                </div>
                                <div className="space-y-1">
                                    {userBadges.map((userBadge) => (
                                        <div
                                            key={userBadge.badge.id}
                                            className="flex items-center gap-2 rounded-md border p-1.5"
                                        >
                                            <div
                                                className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold text-white"
                                                style={{
                                                    backgroundColor:
                                                        userBadge.badge.color,
                                                }}
                                            >
                                                {userBadge.badge.icon ||
                                                    userBadge.badge.name[0]}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-xs font-medium">
                                                    {userBadge.badge.name}
                                                </div>
                                                {userBadge.badge
                                                    .description && (
                                                    <div className="text-muted-foreground truncate text-xs">
                                                        {
                                                            userBadge.badge
                                                                .description
                                                        }
                                                    </div>
                                                )}
                                                {userBadge.note && (
                                                    <div className="text-muted-foreground mt-0.5 truncate text-xs">
                                                        Note: {userBadge.note}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                )}
            </div>
        </div>
    );
}
