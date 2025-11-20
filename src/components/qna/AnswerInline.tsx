'use client';

import React from 'react';
import { trpc } from '@/providers/trpc-provider';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BadgeCheck, Bookmark, MessageSquare } from 'lucide-react';
import { SafeHtml } from '@/lib/sanitize';
import { ShareButton } from '@/components/ui/share-button';
import TipTapEditor from '@/components/TipTapEditor';
import { isHtmlContentEmpty } from '@/lib/utils';
import { qaAnswers, users, qaAnswerComments } from '@/server/db/schema';

type AnswerWithAuthor = typeof qaAnswers.$inferSelect & {
    author: typeof users.$inferSelect | null;
};

type CommentWithAuthor = typeof qaAnswerComments.$inferSelect & {
    author: typeof users.$inferSelect | null;
};

type AnswerInlineProps = {
    answer: AnswerWithAuthor;
    postId: number;
    postTitle: string;
    postCommunity?: {
        id: number;
        slug: string;
    } | null;
    session: { user?: { id: string } | null } | null;
    formatRelativeTime: (date: Date | string) => string;
    isCommentsExpanded: boolean;
    onToggleComments: () => void;
    isHelpful: boolean;
    helpfulCount: number;
    isSaved: boolean;
    onMarkHelpful: () => void;
    onSave: () => void;
    markHelpfulMutation: {
        mutate: (variables: { answerId: number }) => void;
        isPending: boolean;
    };
    unmarkHelpfulMutation: {
        mutate: (variables: { answerId: number }) => void;
        isPending: boolean;
    };
    saveAnswerMutation: {
        mutate: (variables: { answerId: number }) => void;
        isPending: boolean;
    };
    unsaveAnswerMutation: {
        mutate: (variables: { answerId: number }) => void;
        isPending: boolean;
    };
    createAnswerComment: {
        mutate: (variables: { answerId: number; content: string }) => void;
        isPending: boolean;
    };
};

export function AnswerInline({
    answer,
    postId,
    postTitle,
    postCommunity,
    session,
    formatRelativeTime,
    isCommentsExpanded,
    onToggleComments,
    isHelpful,
    helpfulCount,
    isSaved,
    onMarkHelpful,
    onSave,
    markHelpfulMutation,
    unmarkHelpfulMutation,
    saveAnswerMutation,
    unsaveAnswerMutation,
    createAnswerComment,
}: AnswerInlineProps) {
    const [commentContent, setCommentContent] = React.useState('');

    const postUrl = postCommunity
        ? `/communities/${postCommunity.slug}/posts/${postId}`
        : `/posts/${postId}`;
    const shareUrlForAnswer = `${
        typeof window !== 'undefined' ? window.location.origin : ''
    }${postUrl}?answerId=${answer.id}`;

    // Fetch comments - always enabled to show count, but only fetch full data when expanded
    const commentsQuery = trpc.community.listAnswerComments.useQuery(
        { answerId: answer.id },
        { enabled: true },
    );
    const comments = isCommentsExpanded ? commentsQuery.data || [] : [];
    const commentsCount = (commentsQuery.data?.length || 0) as number;

    return (
        <div className="rounded-md border p-3">
            <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                        <AvatarImage src={answer.author?.image || undefined} />
                        <AvatarFallback className="text-[10px]">
                            {(answer.author?.name || 'U')
                                .substring(0, 2)
                                .toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-foreground font-medium">
                        {answer.author?.name || 'Unknown'}
                    </span>
                </div>
                <span className="whitespace-nowrap">
                    {formatRelativeTime(answer.createdAt)}
                </span>
            </div>
            <SafeHtml
                html={answer.content}
                className="prose prose-sm dark:prose-invert max-w-none"
            />

            {/* Stats row */}
            <div className="text-muted-foreground mt-2 flex items-center justify-between text-xs">
                <span>
                    {helpfulCount} {helpfulCount === 1 ? 'person' : 'people'}{' '}
                    found this helpful
                </span>
                <span
                    className="cursor-pointer hover:underline"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggleComments();
                    }}
                >
                    {commentsCount}{' '}
                    {commentsCount === 1 ? 'Comment' : 'Comments'}
                </span>
            </div>

            <div className="bg-border my-2 h-px w-full" />

            {/* Action row */}
            <div className="mt-1 flex items-center gap-3 text-xs">
                {session && (
                    <Button
                        variant="ghost"
                        className="hover:text-foreground inline-flex items-center gap-1"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onMarkHelpful();
                        }}
                    >
                        <BadgeCheck
                            className={`h-4 w-4 ${isHelpful ? 'fill-current' : ''}`}
                        />
                        <span className="hidden md:inline">Helpful</span>
                    </Button>
                )}
                <Button
                    variant="ghost"
                    className="hover:text-foreground inline-flex items-center gap-1"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggleComments();
                    }}
                >
                    <MessageSquare className="h-4 w-4" />
                    <span className="hidden md:inline">Comment</span>
                </Button>
                {session && (
                    <Button
                        variant="ghost"
                        className="hover:text-foreground inline-flex items-center gap-1"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onSave();
                        }}
                    >
                        <Bookmark
                            className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`}
                        />
                        <span className="hidden md:inline">
                            {isSaved ? 'Saved' : 'Save'}
                        </span>
                    </Button>
                )}
                <ShareButton
                    title={postTitle}
                    text={`Answer to: ${postTitle}`}
                    url={shareUrlForAnswer}
                    variant="ghost"
                    size="sm"
                    showLabel={true}
                />
            </div>

            {/* Inline Comments Section */}
            {isCommentsExpanded && (
                <div
                    className="mt-4 space-y-3 border-t pt-3"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                >
                    {/* Comment Editor */}
                    {session && (
                        <div className="space-y-2">
                            <TipTapEditor
                                content={commentContent}
                                onChange={setCommentContent}
                                placeholder="Write a comment..."
                                variant="compact"
                                postId={postId}
                                communityId={postCommunity?.id || undefined}
                            />
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setCommentContent('');
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (
                                            !isHtmlContentEmpty(commentContent)
                                        ) {
                                            createAnswerComment.mutate({
                                                answerId: answer.id,
                                                content: commentContent,
                                            });
                                            setCommentContent('');
                                        }
                                    }}
                                    disabled={
                                        createAnswerComment.isPending ||
                                        isHtmlContentEmpty(commentContent)
                                    }
                                >
                                    {createAnswerComment.isPending
                                        ? 'Posting...'
                                        : 'Post Comment'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Comments List */}
                    {commentsQuery.isLoading ? (
                        <div className="text-muted-foreground text-xs">
                            Loading comments...
                        </div>
                    ) : comments.length > 0 ? (
                        <div className="space-y-2">
                            {(comments as CommentWithAuthor[])
                                .filter((c) => !c.isDeleted)
                                .map((comment) => (
                                    <div
                                        key={comment.id}
                                        className="rounded-md border p-2"
                                    >
                                        <div className="mb-1 flex items-center gap-2">
                                            <Avatar className="h-4 w-4">
                                                <AvatarImage
                                                    src={
                                                        comment.author?.image ||
                                                        undefined
                                                    }
                                                />
                                                <AvatarFallback className="text-[8px]">
                                                    {(
                                                        comment.author?.name ||
                                                        'U'
                                                    )
                                                        .substring(0, 2)
                                                        .toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs font-medium">
                                                {comment.author?.name ||
                                                    'Unknown'}
                                            </span>
                                            <span className="text-muted-foreground text-xs">
                                                {formatRelativeTime(
                                                    comment.createdAt,
                                                )}
                                            </span>
                                        </div>
                                        <SafeHtml
                                            html={comment.content}
                                            className="prose prose-sm dark:prose-invert max-w-none text-xs"
                                        />
                                    </div>
                                ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-xs">
                            No comments yet.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
