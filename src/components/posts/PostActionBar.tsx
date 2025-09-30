'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { LikeButton } from '@/components/ui/like-button';
import { ShareButton } from '@/components/ui/share-button';
import { Bookmark, MessageSquare } from 'lucide-react';
import type { PostDisplay } from '@/app/posts/page';

function preventEventPropagation(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
}

export default function PostActionBar({
    post,
    canInteract,
    isCommentsExpanded,
    onToggleComments,
    onToggleSave,
    shareUrl,
    sessionExists,
}: {
    post: PostDisplay;
    canInteract: boolean;
    isCommentsExpanded: boolean;
    onToggleComments: () => void;
    onToggleSave: () => void;
    shareUrl: string;
    sessionExists: boolean;
}) {
    if (!canInteract) return null;
    return (
        <>
            <Separator className="my-1" />
            <div className="mb-1 grid grid-cols-4">
                <div
                    className="col-span-1 flex items-center justify-center gap-0 md:gap-2"
                    onClick={preventEventPropagation}
                >
                    <LikeButton
                        postId={post.id}
                        initialLikeCount={post.likeCount ?? 0}
                        initialIsLiked={post.isLiked ?? false}
                        size="sm"
                        variant="ghost"
                        disabled={!sessionExists}
                        showCount={false}
                        showLabel={true}
                    />
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="col-span-1 justify-center"
                    aria-expanded={isCommentsExpanded}
                    onClick={(e) => {
                        preventEventPropagation(e);
                        onToggleComments();
                    }}
                >
                    <MessageSquare className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Comment</span>
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="col-span-1 justify-center"
                    onClick={(e) => {
                        preventEventPropagation(e);
                        if (!sessionExists) return;
                        onToggleSave();
                    }}
                >
                    <Bookmark
                        className={`h-4 w-4 md:mr-2 ${post.isSaved ? 'fill-current' : ''}`}
                    />
                    <span className="hidden md:inline">
                        {post.isSaved ? 'Saved' : 'Save'}
                    </span>
                </Button>
                <div
                    className="col-span-1 flex items-center justify-center"
                    onClick={preventEventPropagation}
                >
                    <ShareButton
                        title={post.title}
                        text={`Check out this post: ${post.title}`}
                        url={shareUrl}
                        variant="ghost"
                        size="sm"
                        showLabel={true}
                    />
                </div>
            </div>
        </>
    );
}
