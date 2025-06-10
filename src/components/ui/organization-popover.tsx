'use client';

import React, { useState, useRef } from 'react';
import { trpc } from '@/providers/trpc-provider';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Users,
    FileText,
    MessageSquare,
    Mail,
    ShieldCheck,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface OrganizationPopoverProps {
    orgId: string;
    orgName: string;
    children: React.ReactNode;
}

export function OrganizationPopover({
    orgId,
    orgName,
    children,
}: OrganizationPopoverProps) {
    const [isOpen, setIsOpen] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Use the new getOrgDetails procedure
    const { data: orgDetails, isLoading } =
        trpc.organizations.getOrgDetails.useQuery(
            { orgId },
            { enabled: isOpen && !!orgId },
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
                ) : orgDetails ? (
                    <div className="space-y-3">
                        {/* Organization header */}
                        <div className="flex items-center space-x-3 border-b p-4">
                            <Avatar className="h-12 w-12">
                                <AvatarFallback className="bg-blue-100 text-blue-600">
                                    {getInitials(orgDetails.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                                <h3 className="font-medium">
                                    {orgDetails.name}
                                </h3>
                                <p className="text-muted-foreground text-sm">
                                    Organization
                                </p>
                            </div>
                        </div>

                        {/* Organization details */}
                        <div className="space-y-2 px-4 py-2">
                            <div className="flex items-center text-sm">
                                <Users className="text-muted-foreground mr-2 h-4 w-4" />
                                <span>
                                    Members:{' '}
                                    <span className="font-medium">
                                        {orgDetails.membersCount}
                                    </span>
                                </span>
                            </div>

                            <div className="flex items-center text-sm">
                                <FileText className="text-muted-foreground mr-2 h-4 w-4" />
                                <span>
                                    Posts:{' '}
                                    <span className="font-medium">
                                        {orgDetails.postsCount}
                                    </span>
                                </span>
                            </div>

                            <div className="flex items-center text-sm">
                                <MessageSquare className="text-muted-foreground mr-2 h-4 w-4" />
                                <span>
                                    Comments:{' '}
                                    <span className="font-medium">
                                        {orgDetails.commentsCount}
                                    </span>
                                </span>
                            </div>
                        </div>

                        {/* Admin section */}
                        {orgDetails.admins && orgDetails.admins.length > 0 && (
                            <div className="border-t px-4 py-3">
                                <h4 className="mb-2 flex items-center text-sm font-medium">
                                    <ShieldCheck className="mr-1.5 h-4 w-4" />
                                    Organization Admins
                                </h4>
                                <div className="space-y-2">
                                    {orgDetails.admins.map((admin) => (
                                        <div
                                            key={admin.id}
                                            className="flex items-center text-sm"
                                        >
                                            <Mail className="text-muted-foreground mr-2 h-3.5 w-3.5" />
                                            <span className="text-muted-foreground text-xs">
                                                {admin.email}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-4 text-center">
                        <p className="text-muted-foreground text-sm">
                            Organization not found
                        </p>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
