'use client';

import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface UserBadge {
    badge: {
        id: number;
        name: string;
        description?: string | null;
        icon?: string | null;
        color: string;
    };
    assignedAt: Date;
    note?: string | null;
    assignedBy: {
        id: string;
        name: string | null;
        email: string;
    };
}

interface UserBadgeDisplayProps {
    badges: UserBadge[];
    compact?: boolean;
    maxDisplay?: number;
}

export function UserBadgeDisplay({
    badges,
    compact = false,
    maxDisplay = 3,
}: UserBadgeDisplayProps) {
    if (!badges || badges.length === 0) {
        return null;
    }

    const displayBadges = badges.slice(0, maxDisplay);
    const remainingCount = badges.length - maxDisplay;

    if (compact) {
        return (
            <div className="flex flex-wrap gap-1">
                {displayBadges.map((userBadge) => (
                    <TooltipProvider key={userBadge.badge.id}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div
                                    className="flex cursor-help items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-white"
                                    style={{
                                        backgroundColor: userBadge.badge.color,
                                    }}
                                >
                                    <div className="flex h-4 w-4 items-center justify-center text-xs font-semibold">
                                        {userBadge.badge.icon ||
                                            userBadge.badge.name[0]}
                                    </div>
                                    <span className="text-xs">
                                        - {userBadge.badge.name}
                                    </span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <div className="space-y-1">
                                    <p className="font-medium">
                                        {userBadge.badge.name}
                                    </p>
                                    {userBadge.badge.description && (
                                        <p className="text-sm">
                                            {userBadge.badge.description}
                                        </p>
                                    )}
                                    {userBadge.note && (
                                        <p className="text-muted-foreground text-xs">
                                            Note: {userBadge.note}
                                        </p>
                                    )}
                                    {/* <p className="text-muted-foreground text-xs">
                                        Assigned by{' '}
                                        {userBadge.assignedBy.name ||
                                            userBadge.assignedBy.email}
                                    </p> */}
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ))}
                {remainingCount > 0 && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex cursor-help items-center gap-1 rounded-full bg-gray-400 px-2 py-1 text-xs font-medium text-white">
                                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-xs font-semibold">
                                        +
                                    </div>
                                    <span className="text-xs">
                                        {remainingCount} more
                                    </span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>
                                    {remainingCount} more badge
                                    {remainingCount !== 1 ? 's' : ''}
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
                {displayBadges.map((userBadge) => (
                    <TooltipProvider key={userBadge.badge.id}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge
                                    variant="secondary"
                                    className="cursor-help"
                                    style={{
                                        backgroundColor: `${userBadge.badge.color}20`,
                                        color: userBadge.badge.color,
                                        borderColor: userBadge.badge.color,
                                    }}
                                >
                                    {userBadge.badge.icon && (
                                        <span className="mr-1">
                                            {userBadge.badge.icon}
                                        </span>
                                    )}
                                    {userBadge.badge.name}
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                                <div className="space-y-1">
                                    {userBadge.badge.description && (
                                        <p className="text-sm">
                                            {userBadge.badge.description}
                                        </p>
                                    )}
                                    {userBadge.note && (
                                        <p className="text-muted-foreground text-xs">
                                            Note: {userBadge.note}
                                        </p>
                                    )}
                                    <p className="text-muted-foreground text-xs">
                                        Assigned by{' '}
                                        {userBadge.assignedBy.name ||
                                            userBadge.assignedBy.email}
                                    </p>
                                    <p className="text-muted-foreground text-xs">
                                        {new Date(
                                            userBadge.assignedAt,
                                        ).toLocaleDateString()}
                                    </p>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ))}
            </div>
            {remainingCount > 0 && (
                <p className="text-muted-foreground text-sm">
                    and {remainingCount} more badge
                    {remainingCount !== 1 ? 's' : ''}
                </p>
            )}
        </div>
    );
}
