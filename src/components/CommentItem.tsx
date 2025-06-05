'use client';

import React, { useState } from 'react';
import { Edit, Trash2, Plus, Minus, Reply } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { users } from '@/server/db/schema'; // Assuming UserFromDb is similar or can be imported
import { useSession } from '@/server/auth/client'; // Import useSession to infer its return type
import TipTapEditor from '@/components/TipTapEditor';
import { UserProfilePopover } from '@/components/ui/user-profile-popover';

// Infer Session type from useSession hook
type SessionData = ReturnType<typeof useSession>['data'];

// Define the Comment type, including replies, matching the backend structure
// This should align with the types used in your PostPage
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
}) => {
    const [isExpanded, setIsExpanded] = useState(false); // Default to collapsed
    const isEditingThisComment = editingCommentId === comment.id;
    const isReplyingToThisComment = replyingToCommentId === comment.id;
    const canEdit =
        !comment.isDeleted && session?.user?.id === comment.authorId;
    const canDelete =
        !comment.isDeleted && session?.user?.id === comment.authorId;
    const canReply = !!session?.user;
    const replies = comment.replies || [];
    const hasReplies = replies.length > 0;

    // Function to get background color based on depth
    const getBackgroundColor = (depth: number) => {
        // Limit the darkness to a maximum depth of 3
        const clampedDepth = Math.min(depth, 3);
        switch (clampedDepth) {
            case 0:
                return 'bg-gray-50 dark:bg-gray-800';
            case 1:
                return 'bg-gray-100 dark:bg-gray-700';
            case 2:
                return 'bg-gray-200 dark:bg-gray-600';
            case 3:
            default:
                return 'bg-gray-300 dark:bg-gray-500';
        }
    };

    // Function to handle expand/collapse
    const toggleExpanded = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent event bubbling
        setIsExpanded(!isExpanded);
    };

    // Calculate indentation with a smaller step size
    const getIndentation = (depth: number) => {
        // Limit the maximum indentation to prevent excessive nesting
        const maxIndent = 6; // Reduced maximum levels
        const indentSize = 8; // Further reduced pixels per level
        const clampedDepth = Math.min(depth, maxIndent);
        return clampedDepth * indentSize;
    };

    return (
        <div
            style={{ marginLeft: `${getIndentation(depth)}px` }}
            className="min-w-0 py-1"
        >
            <div
                className={`rounded p-3 ${getBackgroundColor(depth)} group relative min-w-0`}
            >
                {depth > 0 && (
                    <div className="absolute top-0 bottom-0 -left-[1px] w-[1px] bg-gray-300/50 transition-colors group-hover:bg-gray-400/70 dark:bg-gray-500/70 dark:group-hover:bg-gray-400/80" />
                )}
                {isEditingThisComment ? (
                    <div className="space-y-2">
                        <TipTapEditor
                            content={editedCommentContent}
                            onChange={onSetEditedContent}
                            placeholder="Edit your comment..."
                            variant="compact"
                        />
                        <div className="flex justify-end space-x-2">
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
                        <div className="flex min-w-0 flex-col space-y-2">
                            <div className="flex min-w-0 items-start gap-2">
                                <div className="flex-shrink-0">
                                    {hasReplies && (
                                        <button
                                            onClick={toggleExpanded}
                                            className="mt-1 p-1 text-gray-500 hover:text-gray-700 focus:outline-none dark:text-gray-300 dark:hover:text-white"
                                            title={
                                                isExpanded
                                                    ? 'Collapse replies'
                                                    : 'Expand replies'
                                            }
                                        >
                                            {isExpanded ? (
                                                <Minus className="h-3 w-3" />
                                            ) : (
                                                <Plus className="h-3 w-3" />
                                            )}
                                        </button>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    {comment.isDeleted ? (
                                        <p className="mb-2 break-words text-gray-500 italic dark:text-gray-300">
                                            [Comment deleted]
                                        </p>
                                    ) : (
                                        <div
                                            className="prose prose-sm dark:prose-invert dark:prose-headings:text-gray-100 dark:prose-a:text-blue-400 mb-2 max-w-none break-words dark:text-gray-100"
                                            dangerouslySetInnerHTML={{
                                                __html: comment.content,
                                            }}
                                        />
                                    )}
                                </div>
                                <div className="flex flex-shrink-0 items-start space-x-1">
                                    {canEdit && (
                                        <button
                                            onClick={() => onStartEdit(comment)}
                                            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                                            title="Edit comment"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </button>
                                    )}
                                    {canDelete && (
                                        <button
                                            onClick={() =>
                                                onDeleteComment(comment.id)
                                            }
                                            className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400"
                                            title="Delete comment"
                                            disabled={deleteCommentPending}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="min-w-0 text-sm break-words text-gray-500 dark:text-gray-300">
                                    {comment.isDeleted ? (
                                        <span className="italic">
                                            Deleted comment
                                        </span>
                                    ) : (
                                        <>
                                            {comment.author?.id ? (
                                                <UserProfilePopover
                                                    userId={comment.author.id}
                                                >
                                                    <span className="cursor-pointer font-medium hover:underline dark:text-gray-100">
                                                        {comment.author.name ||
                                                            'Unknown'}
                                                    </span>
                                                </UserProfilePopover>
                                            ) : (
                                                <span className="font-medium dark:text-gray-100">
                                                    Unknown
                                                </span>
                                            )}{' '}
                                            •{' '}
                                            {new Date(
                                                comment.createdAt,
                                            ).toLocaleString(undefined, {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                            {hasReplies && (
                                                <>
                                                    {' '}
                                                    •{' '}
                                                    <button
                                                        onClick={toggleExpanded}
                                                        className="text-gray-400 hover:text-gray-600 focus:outline-none dark:text-gray-300 dark:hover:text-white"
                                                    >
                                                        {replies.length}{' '}
                                                        {replies.length === 1
                                                            ? 'reply'
                                                            : 'replies'}
                                                    </button>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                                {!comment.isDeleted && canReply && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-auto px-2 py-1 text-xs dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white"
                                        onClick={() => onStartReply(comment.id)}
                                    >
                                        Reply
                                    </Button>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* Reply Form */}
                {isReplyingToThisComment && (
                    <div className="mt-3 space-y-2">
                        <TipTapEditor
                            content={replyContent}
                            onChange={onSetReplyContent}
                            placeholder="Write your reply..."
                            variant="compact"
                        />
                        <div className="flex justify-end space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onCancelReply}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => onSubmitReply(comment.id)}
                                disabled={
                                    replyMutationPending || !replyContent.trim()
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

            {hasReplies && isExpanded && (
                <div className="relative mt-1 pl-4">
                    <div className="absolute top-0 bottom-0 left-0 w-[1px] bg-gray-200 transition-colors group-hover:bg-gray-300 dark:bg-gray-500 dark:group-hover:bg-gray-400" />
                    <div className="absolute top-0 left-0 h-3 w-4 rounded-bl border-b-[1px] border-l-[1px] border-gray-200 transition-colors group-hover:border-gray-300 dark:border-gray-500 dark:group-hover:border-gray-400" />
                    <div className="space-y-1">
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
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommentItem;
