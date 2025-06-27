'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useState, useRef } from 'react';
import { trpc } from '@/providers/trpc-provider';
import { useSession } from '@/server/auth/client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Trash2 } from 'lucide-react';
import CommentItem from '@/components/CommentItem';
import type { CommentWithReplies } from '@/components/CommentItem';
import TipTapEditor from '@/components/TipTapEditor';
import { UserProfilePopover } from '@/components/ui/user-profile-popover';

type User = {
    id: string;
    name: string | null;
    email: string;
};

type Post = {
    id: number;
    title: string;
    content: string;
    authorId: string;
    createdAt: Date;
    updatedAt: Date;
    author: User;
    comments: CommentWithReplies[];
    isDeleted: boolean;
};

export default function PostPage() {
    const params = useParams();
    const postId = parseInt(params.id as string);
    const { data: session } = useSession();
    const [comment, setComment] = useState('');
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);
    const editorRef = useRef<{ reset: () => void } | null>(null);
    const [autoExpandedComments, setAutoExpandedComments] = useState<
        Set<number>
    >(new Set());

    // State for inline comment editing
    const [editingCommentId, setEditingCommentId] = useState<number | null>(
        null,
    );
    const [editedCommentContent, setEditedCommentContent] =
        useState<string>('');

    // New state for reply functionality
    const [replyingToCommentId, setReplyingToCommentId] = useState<
        number | null
    >(null);
    const [replyContent, setReplyContent] = useState('');

    const utils = trpc.useUtils();

    const {
        data: post,
        isLoading,
        refetch,
    } = trpc.community.getPost.useQuery(
        { postId },
        {
            enabled: !!session,
        },
    );

    // Use useEffect to mark when component is hydrated on client
    React.useEffect(() => {
        setIsClient(true);
    }, []);

    const createComment = trpc.community.createComment.useMutation({
        onSuccess: (newComment, variables) => {
            // Reset the editor content to empty string
            setComment('');

            // Force editor reset if needed
            if (comment !== '') {
                // This is a backup in case the state update doesn't trigger the editor to clear
                setTimeout(() => {
                    setComment('');
                }, 0);
            }

            // If this was a reply, add the parent comment to auto-expanded set
            if (variables.parentId && replyingToCommentId) {
                setAutoExpandedComments(
                    (prev) => new Set([...prev, replyingToCommentId]),
                );
            }

            setReplyContent(''); // Clear reply content on success
            setReplyingToCommentId(null); // Reset replying state
            utils.community.getPost.invalidate({ postId });
        },
    });

    // Placeholder for updateComment mutation (to be created)
    const updateCommentMutation = trpc.community.updateComment.useMutation({
        onSuccess: () => {
            utils.community.getPost.invalidate({ postId });
            setEditingCommentId(null);
            setEditedCommentContent('');
        },
        onError: (error) => {
            // Handle error, e.g., show a toast notification
            console.error('Failed to update comment:', error);
            alert('Failed to update comment: ' + error.message);
        },
    });

    const deleteCommentMutation = trpc.community.deleteComment.useMutation({
        onSuccess: () => {
            utils.community.getPost.invalidate({ postId });
        },
    });

    const deletePostMutation = trpc.community.deletePost.useMutation({
        onSuccess: () => {
            utils.community.getPost.invalidate({ postId });
        },
    });

    if (!isClient) {
        return <div className="p-4">Loading...</div>;
    }

    if (!session) {
        return (
            <div className="mx-auto max-w-4xl p-4">
                <h1 className="mb-4 text-3xl font-bold dark:text-white">
                    Access Denied
                </h1>
                <p className="mb-4 text-gray-600 dark:text-gray-400">
                    Please sign in to view this post.
                </p>
                <Button onClick={() => router.push('/auth/login')}>
                    Sign In
                </Button>
            </div>
        );
    }

    if (isClient && isLoading) {
        return <div className="p-4 dark:text-gray-300">Loading post...</div>;
    }

    if (isClient && !post) {
        return <div className="p-4 dark:text-gray-300">Post not found</div>;
    }

    const postData = post!;

    const handleStartEdit = (commentToEdit: CommentWithReplies) => {
        setEditingCommentId(commentToEdit.id);
        setEditedCommentContent(commentToEdit.content);
    };

    const handleCancelEdit = () => {
        setEditingCommentId(null);
        setEditedCommentContent('');
    };

    const handleSaveEdit = async (commentId: number) => {
        if (!editedCommentContent.trim()) return;
        updateCommentMutation.mutate({
            commentId,
            content: editedCommentContent,
        });
    };

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim()) return;

        try {
            await createComment.mutate({
                postId,
                content: comment,
            });

            // Explicitly clear the comment state after submission
            setComment('');
        } catch (error) {
            console.error('Error posting comment:', error);
        }
    };

    // New handlers for reply functionality
    const handleStartReply = (commentId: number) => {
        setReplyingToCommentId(commentId);
        setReplyContent('');
    };

    const handleCancelReply = () => {
        setReplyingToCommentId(null);
        setReplyContent('');
    };

    const handleSubmitReply = async (parentId: number) => {
        if (!replyContent.trim()) return;

        await createComment.mutate({
            postId,
            content: replyContent,
            parentId, // Include parentId when creating a reply
        });
    };

    const handleDeleteComment = async (commentId: number) => {
        if (window.confirm('Are you sure you want to delete this comment?')) {
            await deleteCommentMutation.mutate({ commentId });
        }
    };

    const handleDeletePost = async () => {
        if (
            !confirm(
                'Are you sure you want to delete this post? The comments will still be visible.',
            )
        ) {
            return;
        }

        try {
            await deletePostMutation.mutateAsync({ postId });
        } catch (error) {
            console.error('Error deleting post:', error);
            alert('Failed to delete post');
        }
    };

    // Handler to manage comment expansion state
    const handleCommentExpansionChange = (
        commentId: number,
        isExpanded: boolean,
    ) => {
        if (!isExpanded) {
            // If comment is being collapsed, remove it from auto-expanded set
            setAutoExpandedComments((prev) => {
                const newSet = new Set(prev);
                newSet.delete(commentId);
                return newSet;
            });
        }
    };

    return (
        <div className="mx-auto max-w-4xl px-3 py-3">
            {/* Post container */}
            <div className="mb-4">
                {/* Post header */}
                <div className="border-border/20 border-b px-1 py-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                            <span>Posted by</span>
                            {postData.author?.id ? (
                                <UserProfilePopover userId={postData.author.id}>
                                    <span className="cursor-pointer font-medium hover:underline">
                                        u/{postData.author.name || 'Unknown'}
                                    </span>
                                </UserProfilePopover>
                            ) : (
                                <span className="font-medium">u/Unknown</span>
                            )}
                            <span>•</span>
                            <span>
                                {new Date(
                                    postData.createdAt,
                                ).toLocaleDateString()}
                            </span>
                        </div>
                        {session.user.id === postData.authorId &&
                            !postData.isDeleted && (
                                <div className="flex gap-1 self-end sm:self-auto">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            router.push(
                                                `/posts/${postData.id}/edit`,
                                            )
                                        }
                                        className="h-6 px-1.5 text-xs"
                                    >
                                        <Edit className="mr-1 h-3 w-3" />
                                        <span className="hidden sm:inline">
                                            Edit
                                        </span>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleDeletePost}
                                        className="h-6 px-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                                        disabled={deletePostMutation.isPending}
                                    >
                                        <Trash2 className="mr-1 h-3 w-3" />
                                        <span className="hidden sm:inline">
                                            Delete
                                        </span>
                                    </Button>
                                </div>
                            )}
                    </div>
                </div>

                {/* Post content */}
                <div className="px-1 py-2">
                    <h1 className="text-foreground mb-2 text-lg leading-tight font-semibold">
                        {postData.isDeleted ? '[Deleted]' : postData.title}
                    </h1>

                    <div className="text-sm leading-normal">
                        {postData.isDeleted ? (
                            <div className="text-muted-foreground italic">
                                <p>[Content deleted]</p>
                                <p className="mt-2 text-xs">
                                    Removed on{' '}
                                    {new Date(
                                        postData.updatedAt,
                                    ).toLocaleString()}
                                </p>
                            </div>
                        ) : (
                            <div
                                className="prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{
                                    __html: postData.content,
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Comments section */}
            <div>
                <div className="mb-3">
                    <h2 className="text-foreground text-base font-medium">
                        Comments ({postData.comments?.length || 0})
                    </h2>
                </div>

                {session && !postData.isDeleted && (
                    <div className="mb-4">
                        <form onSubmit={handleSubmitComment}>
                            <TipTapEditor
                                content={comment}
                                onChange={setComment}
                                placeholder="What are your thoughts?"
                                variant="compact"
                            />
                            <div className="mt-2 flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={
                                        createComment.isPending ||
                                        !comment.trim()
                                    }
                                    size="sm"
                                    className="w-full sm:w-auto"
                                >
                                    {createComment.isPending
                                        ? 'Posting...'
                                        : 'Comment'}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                {postData.isDeleted && (
                    <div className="bg-muted/30 text-muted-foreground mb-4 rounded p-2 text-xs">
                        This post has been deleted. New comments are disabled,
                        but existing comments are still visible.
                    </div>
                )}

                {postData.comments && postData.comments.length > 0 ? (
                    <div className="divide-border/20 space-y-0 divide-y">
                        {postData.comments.map(
                            (comment: CommentWithReplies) => (
                                <CommentItem
                                    key={comment.id}
                                    comment={comment}
                                    session={session}
                                    onStartEdit={handleStartEdit}
                                    onCancelEdit={handleCancelEdit}
                                    onSaveEdit={handleSaveEdit}
                                    editingCommentId={editingCommentId}
                                    editedCommentContent={editedCommentContent}
                                    onSetEditedContent={setEditedCommentContent}
                                    updateCommentMutationPending={
                                        updateCommentMutation.isPending
                                    }
                                    replyingToCommentId={replyingToCommentId}
                                    replyContent={replyContent}
                                    onStartReply={handleStartReply}
                                    onCancelReply={handleCancelReply}
                                    onSetReplyContent={setReplyContent}
                                    onSubmitReply={handleSubmitReply}
                                    replyMutationPending={
                                        createComment.isPending
                                    }
                                    onDeleteComment={handleDeleteComment}
                                    deleteCommentPending={
                                        deleteCommentMutation.isPending
                                    }
                                    autoExpandedComments={autoExpandedComments}
                                    onExpansionChange={
                                        handleCommentExpansionChange
                                    }
                                />
                            ),
                        )}
                    </div>
                ) : (
                    <div className="text-muted-foreground py-4 text-center text-sm">
                        No comments yet. Be the first to comment!
                    </div>
                )}
            </div>
        </div>
    );
}
