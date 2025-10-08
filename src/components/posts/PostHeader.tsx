'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CommunityPopover } from '@/components/ui/community-popover';
import { UserProfilePopover } from '@/components/ui/user-profile-popover';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Ellipsis, Edit, Trash2 } from 'lucide-react';
import type { PostDisplay } from '@/app/posts/page';

function preventEventPropagation(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
}

export default function PostHeader({
    post,
    canEdit,
    canDelete,
    onEdit,
    onDelete,
    onAuthorClick,
    onCommunityClick,
    formatRelativeTime,
}: {
    post: PostDisplay;
    canEdit: boolean;
    canDelete: boolean;
    onEdit: () => void;
    onDelete: (e: React.MouseEvent) => void;
    onAuthorClick?: () => void;
    onCommunityClick?: () => void;
    formatRelativeTime: (date: any) => string;
}) {
    return (
        <div className="border-b px-4 py-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    {post.community ? (
                        <CommunityPopover communityId={post.community.id}>
                            <div
                                className="flex cursor-pointer items-center"
                                onClick={onCommunityClick}
                            >
                                <Avatar className="mr-2 h-6 w-6">
                                    <AvatarImage
                                        src={post.community.avatar || undefined}
                                    />
                                    <AvatarFallback className="text-[10px]">
                                        {post.community.name
                                            .substring(0, 2)
                                            .toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                        </CommunityPopover>
                    ) : (
                        <Avatar className="mr-2 h-6 w-6">
                            <AvatarFallback className="text-[10px]">
                                OR
                            </AvatarFallback>
                        </Avatar>
                    )}
                    <div className="flex flex-col leading-tight">
                        <span className="text-sm font-medium">
                            {post.author?.id ? (
                                <UserProfilePopover userId={post.author.id}>
                                    <span
                                        className="cursor-pointer hover:underline"
                                        onClick={onAuthorClick}
                                    >
                                        {post.author.name || 'Unknown'}
                                    </span>
                                </UserProfilePopover>
                            ) : (
                                'Unknown'
                            )}
                        </span>
                        <span className="text-muted-foreground text-xs">
                            {post.community?.name ||
                                post.author?.organization?.name ||
                                'Organization'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                        {formatRelativeTime(post.createdAt)}
                    </span>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={preventEventPropagation}
                            >
                                <Ellipsis className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                        >
                            {post.author?.id && (
                                <DropdownMenuItem onClick={onAuthorClick}>
                                    Author details
                                </DropdownMenuItem>
                            )}
                            {post.community?.slug && (
                                <DropdownMenuItem onClick={onCommunityClick}>
                                    View community
                                </DropdownMenuItem>
                            )}
                            {(canEdit || canDelete) && (
                                <DropdownMenuSeparator />
                            )}
                            {canEdit && (
                                <DropdownMenuItem onClick={onEdit}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                            )}
                            {canDelete && (
                                <DropdownMenuItem onClick={onDelete}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
}
