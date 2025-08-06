'use client';

import React, { useEffect, useState } from 'react';
import { Edit, Trash2, Plus, Minus, Reply } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { users } from '@/server/db/schema'; // Assuming UserFromDb is similar or can be imported
import { useSession } from '@/server/auth/client'; // Import useSession to infer its return type
import TipTapEditor from '@/components/TipTapEditor';
import { UserProfilePopover } from '@/components/ui/user-profile-popover';
import { SafeHtml } from '@/lib/sanitize';

type SessionData = ReturnType<typeof useSession>['data'];

type UserFromDb = typeof users.$inferSelect;

export type CommentWithReplies = {
    id: number;
    content: string;
    postId: number;
    authorId: string;
    createdAt: Date;
    updatedAt: Date;
    author: UserFromDb | null;
    parentId: number | null;
    isDeleted: boolean;
    replies?: CommentWithReplies[];
};

interface CommentItemProps {
    comment: CommentWithReplies;
    session: SessionData;
    onStartEdit: (comment: CommentWithReplies) => void;
    onCancelEdit: () => void;
    onSaveEdit: (commentId: number) => void;
    editingCommentId: number | null;
    editedCommentContent: string;
    onSetEditedContent: (content: string) => void;
    updateCommentMutationPending: boolean;
    replyingToCommentId: number | null;
    replyContent: string;
    onStartReply: (commentId: number) => void;
    onCancelReply: () => void;
    onSetReplyContent: (content: string) => void;
    onSubmitReply: (parentId: number) => void;
    replyMutationPending: boolean;
    onDeleteComment: (commentId: number) => void;
    deleteCommentPending: boolean;
    depth?: number;
    autoExpandedComments: Set<number>;
    onExpansionChange: (commentId: number, isExpanded: boolean) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
    comment,
    session,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    editingCommentId,
    editedCommentContent,
    onSetEditedContent,
    updateCommentMutationPending,
    replyingToCommentId,
    replyContent,
    onStartReply,
    onCancelReply,
    onSetReplyContent,
    onSubmitReply,
    replyMutationPending,
    onDeleteComment,
    deleteCommentPending,
    depth = 0,
    autoExpandedComments,
    onExpansionChange,
}) => {
    const shouldAutoExpand = autoExpandedComments.has(comment.id);
    const [isExpanded, setIsExpanded] = useState(shouldAutoExpand);
    const isEditingThisComment = editingCommentId === comment.id;
    const isReplyingToThisComment = replyingToCommentId === comment.id;
    const canEdit =
        !comment.isDeleted && session?.user?.id === comment.authorId;
    const canDelete =
        !comment.isDeleted && session?.user?.id === comment.authorId;
    const canReply = !!session?.user;
    const replies = comment.replies || [];
    const hasReplies = replies.length > 0;

    // Update expansion state when autoExpandedComments changes
    useEffect(() => {
        if (autoExpandedComments.has(comment.id) && !isExpanded) {
            setIsExpanded(true);
        }
    }, [autoExpandedComments, comment.id, isExpanded]);

    // Function to handle expand/collapse
    const toggleExpanded = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newExpandedState = !isExpanded;
        setIsExpanded(!isExpanded);
        onExpansionChange(comment.id, newExpandedState);
    };

    // Calculate left margin for thread indentation
    const leftMargin = Math.min(depth * 12, 48); // 12px per level, max 48px on mobile

    return (
        <div className="relative">
            {/* Thread line for nested comments */}
            {depth > 0 && (
                <div
                    className="bg-border/40 hover:bg-border/60 absolute top-0 w-px transition-colors"
                    style={{
                        left: `${leftMargin - 6}px`,
                        height: '100%',
                    }}
                />
            )}

            <div
                className="hover:bg-muted/10 group relative px-2 py-1.5 transition-colors"
                style={{ marginLeft: `${leftMargin}px` }}
            >
                <div className="flex min-w-0 gap-1.5">
                    {/* Collapse/Expand button */}
                    <div className="flex w-4 flex-shrink-0 justify-center">
                        {hasReplies && (
                            <button
                                onClick={toggleExpanded}
                                className="hover:bg-muted text-muted-foreground hover:text-foreground flex h-3 w-3 items-center justify-center rounded-sm transition-colors"
                                title={
                                    isExpanded
                                        ? 'Collapse thread'
                                        : 'Expand thread'
                                }
                            >
                                {isExpanded ? (
                                    <Minus className="h-2.5 w-2.5" />
                                ) : (
                                    <Plus className="h-2.5 w-2.5" />
                                )}
                            </button>
                        )}
                    </div>

                    {/* Comment content */}
                    <div className="min-w-0 flex-1">
                        {isEditingThisComment ? (
                            <div className="space-y-2">
                                <TipTapEditor
                                    content={editedCommentContent}
                                    onChange={onSetEditedContent}
                                    placeholder="Edit your comment..."
                                    variant="compact"
                                    postId={comment.postId}
                                />
                                <div className="flex justify-end gap-1.5">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onCancelEdit}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => onSaveEdit(comment.id)}
                                        disabled={
                                            updateCommentMutationPending ||
                                            !editedCommentContent.trim()
                                        }
                                    >
                                        {updateCommentMutationPending
                                            ? 'Saving...'
                                            : 'Save'}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Comment metadata */}
                                <div className="text-muted-foreground mb-1 flex flex-wrap items-center gap-1 text-xs">
                                    {comment.author?.id ? (
                                        <UserProfilePopover
                                            userId={comment.author.id}
                                        >
                                            <span className="text-foreground cursor-pointer text-xs font-medium hover:underline">
                                                {comment.author.name ||
                                                    'Unknown'}
                                            </span>
                                        </UserProfilePopover>
                                    ) : (
                                        <span className="text-foreground text-xs font-medium">
                                            Unknown
                                        </span>
                                    )}
                                    <span className="hidden sm:inline">•</span>
                                    <span className="text-xs">
                                        {new Date(
                                            comment.createdAt,
                                        ).toLocaleString(undefined, {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                    {comment.createdAt !==
                                        comment.updatedAt && (
                                        <>
                                            <span className="hidden sm:inline">
                                                •
                                            </span>
                                            <span className="text-xs italic">
                                                edited
                                            </span>
                                        </>
                                    )}
                                </div>

                                {/* Comment content */}
                                <div className="mb-1.5 break-words">
                                    {comment.isDeleted ? (
                                        <p className="text-muted-foreground text-sm italic">
                                            [Comment deleted]
                                        </p>
                                    ) : (
                                        <SafeHtml
                                            html={comment.content}
                                            className="prose prose-sm dark:prose-invert max-w-none text-sm leading-normal"
                                        />
                                    )}
                                </div>

                                {/* Comment actions */}
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {canReply && !comment.isDeleted && (
                                        <button
                                            onClick={() =>
                                                onStartReply(comment.id)
                                            }
                                            className="text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs transition-colors"
                                        >
                                            <Reply className="h-2.5 w-2.5" />
                                            <span>Reply</span>
                                        </button>
                                    )}

                                    {hasReplies && (
                                        <button
                                            onClick={toggleExpanded}
                                            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded px-1.5 py-0.5 text-xs transition-colors"
                                        >
                                            {replies.length}{' '}
                                            {replies.length === 1
                                                ? 'reply'
                                                : 'replies'}
                                        </button>
                                    )}

                                    {canEdit && (
                                        <button
                                            onClick={() => onStartEdit(comment)}
                                            className="text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                                            title="Edit comment"
                                        >
                                            <Edit className="h-2.5 w-2.5" />
                                            <span>Edit</span>
                                        </button>
                                    )}

                                    {canDelete && (
                                        <button
                                            onClick={() =>
                                                onDeleteComment(comment.id)
                                            }
                                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                                            title="Delete comment"
                                            disabled={deleteCommentPending}
                                        >
                                            <Trash2 className="h-2.5 w-2.5" />
                                            <span>Delete</span>
                                        </button>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Reply form */}
                        {isReplyingToThisComment && (
                            <div className="mt-2 space-y-2">
                                <TipTapEditor
                                    content={replyContent}
                                    onChange={onSetReplyContent}
                                    placeholder="Write your reply..."
                                    variant="compact"
                                    postId={comment.postId}
                                />
                                <div className="flex justify-end gap-1.5">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onCancelReply}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() =>
                                            onSubmitReply(comment.id)
                                        }
                                        disabled={
                                            replyMutationPending ||
                                            !replyContent.trim()
                                        }
                                    >
                                        {replyMutationPending
                                            ? 'Posting...'
                                            : 'Post Reply'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Nested replies */}
            {hasReplies && isExpanded && (
                <div>
                    {replies.map((reply) => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            session={session}
                            onStartEdit={onStartEdit}
                            onCancelEdit={onCancelEdit}
                            onSaveEdit={onSaveEdit}
                            editingCommentId={editingCommentId}
                            editedCommentContent={editedCommentContent}
                            onSetEditedContent={onSetEditedContent}
                            updateCommentMutationPending={
                                updateCommentMutationPending
                            }
                            replyingToCommentId={replyingToCommentId}
                            replyContent={replyContent}
                            onStartReply={onStartReply}
                            onCancelReply={onCancelReply}
                            onSetReplyContent={onSetReplyContent}
                            onSubmitReply={onSubmitReply}
                            replyMutationPending={replyMutationPending}
                            onDeleteComment={onDeleteComment}
                            deleteCommentPending={deleteCommentPending}
                            depth={depth + 1}
                            autoExpandedComments={autoExpandedComments}
                            onExpansionChange={onExpansionChange}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default CommentItem;
