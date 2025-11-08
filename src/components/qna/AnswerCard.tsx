'use client';

import React from 'react';
import { trpc } from '@/providers/trpc-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BadgeCheck, Bookmark, MessageSquare } from 'lucide-react';
import { SafeHtml } from '@/lib/sanitize';
import { ShareButton } from '@/components/ui/share-button';
import { UserProfilePopover } from '@/components/ui/user-profile-popover';
import TipTapEditor from '@/components/TipTapEditor';
import { isHtmlContentEmpty } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import { qaAnswers, users, qaAnswerComments } from '@/server/db/schema';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type AnswerWithAuthor = typeof qaAnswers.$inferSelect & {
    author: typeof users.$inferSelect | null;
};

type CommentWithAuthor = typeof qaAnswerComments.$inferSelect & {
    author: typeof users.$inferSelect | null;
};

type SessionType = { user?: { id: string } | null } | null;

type AnswerCardProps = {
    answer: AnswerWithAuthor;
    postId: number;
    postTitle?: string;
    communitySlug?: string | null;
    isSaved: boolean;
    isHighlighted: boolean;
    isHelpful: boolean;
    helpfulCount: number;
    isCommentsExpanded: boolean;
    onToggleComments: () => void;
    onMarkHelpful: () => void;
    onSave: () => void;
    session: SessionType;
    buildAnswerShareUrl: (answerId: number) => string;
    createAnswerComment: {
        mutate: (
            variables: {
                answerId: number;
                content: string;
            },
            options?: {
                onSuccess?: () => void;
                onError?: (error: unknown) => void;
            },
        ) => void;
        isPending: boolean;
    };
    updateAnswerComment: {
        mutate: (
            variables: {
                commentId: number;
                content: string;
            },
            options?: {
                onSuccess?: () => void;
                onError?: (error: unknown) => void;
            },
        ) => void;
        isPending: boolean;
    };
    deleteAnswerComment: {
        mutate: (
            variables: { commentId: number },
            options?: {
                onSuccess?: () => void;
                onError?: (error: unknown) => void;
            },
        ) => void;
        isPending: boolean;
    };
};

export function AnswerCard({
    answer,
    postId,
    postTitle,
    communitySlug,
    isSaved,
    isHighlighted,
    isHelpful,
    helpfulCount,
    isCommentsExpanded,
    onToggleComments,
    onMarkHelpful,
    onSave,
    session,
    buildAnswerShareUrl,
    createAnswerComment,
    updateAnswerComment,
    deleteAnswerComment,
}: AnswerCardProps) {
    const [replyContent, setReplyContent] = React.useState('');
    const [editingCommentId, setEditingCommentId] = React.useState<
        number | null
    >(null);
    const [editedCommentContent, setEditedCommentContent] = React.useState('');
    const [hasAutoExpanded, setHasAutoExpanded] = React.useState(false);
    const [visibleCommentsCount, setVisibleCommentsCount] = React.useState(2);
    const [commentToDelete, setCommentToDelete] = React.useState<number | null>(
        null,
    );

    // Comment query - always enabled to show accurate count, but only display when expanded
    const answerCommentsQuery = trpc.community.listAnswerComments.useQuery(
        { answerId: answer.id },
        {
            enabled: true,
        },
    );
    const allComments = answerCommentsQuery.data || [];
    const comments = isCommentsExpanded
        ? (allComments as CommentWithAuthor[]).slice(0, visibleCommentsCount)
        : [];
    const hasMoreComments = allComments.length > visibleCommentsCount;

    // Auto-expand comments for highlighted answer (only once)
    React.useEffect(() => {
        if (isHighlighted && !isCommentsExpanded && !hasAutoExpanded) {
            onToggleComments();
            setHasAutoExpanded(true);
        }
    }, [isHighlighted, isCommentsExpanded, hasAutoExpanded, onToggleComments]);

    // Reset visible comments count when comments are collapsed
    React.useEffect(() => {
        if (!isCommentsExpanded) {
            setVisibleCommentsCount(2);
        }
    }, [isCommentsExpanded]);

    return (
        <Card
            id={`answer-${answer.id}`}
            className={`p-3 ${
                isSaved ? 'border-primary bg-primary/5 border-2' : ''
            } ${isHighlighted ? 'ring-primary ring-2' : ''}`}
        >
            <div className="mb-1 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                    <UserProfilePopover userId={answer.author?.id || ''}>
                        <div className="flex cursor-pointer items-center gap-2">
                            <Avatar className="h-5 w-5">
                                <AvatarImage
                                    src={answer.author?.image || undefined}
                                />
                                <AvatarFallback className="text-[10px]">
                                    {(answer.author?.name || 'U')
                                        .substring(0, 2)
                                        .toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-foreground font-medium hover:underline">
                                {answer.author?.name || 'Unknown'}
                            </span>
                        </div>
                    </UserProfilePopover>
                </div>
                <span className="text-muted-foreground whitespace-nowrap">
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
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleComments();
                    }}
                >
                    {allComments.length}{' '}
                    {allComments.length === 1 ? 'Comment' : 'Comments'}
                </span>
            </div>

            <div className="bg-border my-2 h-px w-full" />

            {/* Action row */}
            <div className="mt-1 flex items-center gap-3 text-xs">
                {session && (
                    <Button
                        variant="ghost"
                        className="hover:text-foreground inline-flex items-center gap-1"
                        onClick={onMarkHelpful}
                        aria-label="Mark helpful"
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
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleComments();
                    }}
                    aria-label="Toggle comments"
                >
                    <MessageSquare className="h-4 w-4" />
                    <span className="hidden md:inline">Comment</span>
                </Button>
                {session && (
                    <Button
                        variant="ghost"
                        className="hover:text-foreground inline-flex items-center gap-1"
                        onClick={onSave}
                        aria-label="Save answer"
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
                    title={postTitle || 'Check out this answer'}
                    text={`Answer to: ${postTitle || 'the question'}`}
                    url={buildAnswerShareUrl(answer.id)}
                    variant="ghost"
                    size="sm"
                    showLabel={false}
                />
            </div>

            {/* Comments section */}
            {isCommentsExpanded && (
                <div className="mt-4 space-y-3 border-t pt-3">
                    {/* Comment Editor - shown immediately when expanded */}
                    {session && (
                        <div className="space-y-2">
                            <TipTapEditor
                                content={replyContent}
                                onChange={setReplyContent}
                                placeholder="Write a comment..."
                                variant="compact"
                                postId={postId}
                            />
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setReplyContent('');
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        createAnswerComment.mutate(
                                            {
                                                answerId: answer.id,
                                                content: replyContent,
                                            },
                                            {
                                                onSuccess: () => {
                                                    setReplyContent('');
                                                    // Increase visible count to show the new comment
                                                    setVisibleCommentsCount(
                                                        (prev) => prev + 1,
                                                    );
                                                    answerCommentsQuery.refetch();
                                                },
                                            },
                                        );
                                    }}
                                    disabled={
                                        createAnswerComment.isPending ||
                                        isHtmlContentEmpty(replyContent)
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
                    {answerCommentsQuery.isLoading ? (
                        <div className="text-muted-foreground text-xs">
                            Loading comments...
                        </div>
                    ) : comments.length > 0 ? (
                        <div className="space-y-2">
                            {comments
                                .filter((c) => !c.isDeleted)
                                .map((comment) => (
                                    <div
                                        key={comment.id}
                                        className="rounded-md border p-2"
                                    >
                                        <div className="mb-1 flex items-center gap-2">
                                            <UserProfilePopover
                                                userId={
                                                    comment.author?.id || ''
                                                }
                                            >
                                                <span className="text-xs font-medium hover:underline">
                                                    {comment.author?.name ||
                                                        'Unknown'}
                                                </span>
                                            </UserProfilePopover>
                                            <span className="text-muted-foreground text-xs">
                                                {formatRelativeTime(
                                                    comment.createdAt,
                                                )}
                                            </span>
                                            {session?.user?.id ===
                                                comment.authorId && (
                                                <>
                                                    <button
                                                        className="text-muted-foreground hover:text-foreground text-xs underline"
                                                        onClick={() => {
                                                            setEditingCommentId(
                                                                comment.id,
                                                            );
                                                            setEditedCommentContent(
                                                                comment.content,
                                                            );
                                                        }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className="text-muted-foreground hover:text-destructive text-xs underline"
                                                        onClick={() => {
                                                            setCommentToDelete(
                                                                comment.id,
                                                            );
                                                        }}
                                                    >
                                                        Delete
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                        {editingCommentId === comment.id ? (
                                            <div className="space-y-2">
                                                <TipTapEditor
                                                    content={
                                                        editedCommentContent
                                                    }
                                                    onChange={
                                                        setEditedCommentContent
                                                    }
                                                    placeholder="Edit comment..."
                                                    variant="compact"
                                                    postId={postId}
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setEditingCommentId(
                                                                null,
                                                            );
                                                            setEditedCommentContent(
                                                                '',
                                                            );
                                                        }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => {
                                                            updateAnswerComment.mutate(
                                                                {
                                                                    commentId:
                                                                        comment.id,
                                                                    content:
                                                                        editedCommentContent,
                                                                },
                                                                {
                                                                    onSuccess:
                                                                        () => {
                                                                            answerCommentsQuery.refetch();
                                                                        },
                                                                },
                                                            );
                                                        }}
                                                        disabled={
                                                            updateAnswerComment.isPending ||
                                                            isHtmlContentEmpty(
                                                                editedCommentContent,
                                                            )
                                                        }
                                                    >
                                                        {updateAnswerComment.isPending
                                                            ? 'Saving...'
                                                            : 'Save'}
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <SafeHtml
                                                html={comment.content}
                                                className="prose prose-sm dark:prose-invert max-w-none text-xs"
                                            />
                                        )}
                                    </div>
                                ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-xs">
                            No comments yet.
                        </p>
                    )}

                    {/* Load more comments button */}
                    {hasMoreComments && (
                        <div className="text-center">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setVisibleCommentsCount((prev) => prev + 2);
                                }}
                            >
                                Load more comments
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Delete Comment Alert Dialog */}
            <AlertDialog
                open={commentToDelete !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setCommentToDelete(null);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this comment? This
                            action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (commentToDelete !== null) {
                                    deleteAnswerComment.mutate(
                                        {
                                            commentId: commentToDelete,
                                        },
                                        {
                                            onSuccess: () => {
                                                setCommentToDelete(null);
                                                answerCommentsQuery.refetch();
                                            },
                                        },
                                    );
                                }
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
