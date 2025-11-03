'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useState, useRef } from 'react';
import { trpc } from '@/providers/trpc-provider';
import { useSession } from '@/server/auth/client';
import { Button } from '@/components/ui/button';
import { ShareDialog } from '@/components/ui/share-dialog';
import CommentItem from '@/components/CommentItem';
import type { CommentWithReplies } from '@/components/CommentItem';
import TipTapEditor from '@/components/TipTapEditor';
import { SafeHtml } from '@/lib/sanitize';
import { Loading } from '@/components/ui/loading';
import { isHtmlContentEmpty } from '@/lib/utils';
import { MixedMediaCarousel } from '@/components/ui/mixed-media-carousel';
import { SafeHtmlWithoutImages } from '@/components/ui/safe-html-without-images';
import { QnADisplay } from '@/components/qna/QnADisplay';

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
    attachments?: Array<{
        id: number;
        filename: string;
        mimetype: string;
        type: string;
        size: number | null;
        r2Key: string;
        r2Url: string | null;
        publicUrl: string | null;
        thumbnailUrl: string | null;
        uploadedBy: string;
        postId: number | null;
        communityId: number | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
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
        return <Loading message="Initializing..." />;
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
        return <Loading message="Loading post..." />;
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
        if (isHtmlContentEmpty(comment)) return;

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
        if (isHtmlContentEmpty(replyContent)) return;

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
        <div className="mx-auto mt-4 max-w-7xl px-0 py-4 sm:px-6 lg:px-0">
            <div className="mx-auto">
                <div className="mb-8">
                    <div className="mb-2 flex items-start justify-between">
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold dark:text-white">
                                {postData.isDeleted
                                    ? '[Deleted]'
                                    : postData.title}
                            </h1>
                        </div>
                        <div className="ml-4 flex items-center space-x-2">
                            <ShareDialog
                                title={postData.title}
                                text={`Check out this post: ${postData.title}`}
                                url={
                                    typeof window !== 'undefined'
                                        ? window.location.href
                                        : ''
                                }
                                trigger={
                                    <Button variant="outline" size="sm">
                                        Share
                                    </Button>
                                }
                            />
                        </div>
                    </div>
                    <div className="prose prose-ul:list-disc prose-ol:list-decimal dark:prose-invert dark:prose-headings:text-white dark:prose-a:text-blue-400 max-w-none">
                        {postData.isDeleted ? (
                            <div className="space-y-2">
                                <span className="block text-gray-500 italic dark:text-gray-300">
                                    [Content deleted]
                                </span>
                                <span className="block text-sm text-gray-400 dark:text-gray-400">
                                    Removed on{' '}
                                    {new Date(
                                        postData.updatedAt,
                                    ).toLocaleString()}
                                </span>
                            </div>
                        ) : (
                            <div>
                                {postData.attachments &&
                                postData.attachments.length > 0 ? (
                                    <SafeHtmlWithoutImages
                                        html={postData.content}
                                        className="whitespace-pre-wrap"
                                    />
                                ) : (
                                    <SafeHtml
                                        html={postData.content}
                                        className="whitespace-pre-wrap"
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    {/* Post media */}
                    {postData.attachments &&
                        postData.attachments.length > 0 && (
                            <div className="mt-6">
                                <MixedMediaCarousel
                                    media={postData.attachments}
                                    className="max-w-2xl"
                                />
                            </div>
                        )}
                </div>

                <div className="mb-8">
                    {/* Q&A section (if this post has Q&A config) */}
                    {post?.qa && <QnADisplay postId={postId} />}

                    <h2 className="mb-4 text-2xl font-bold dark:text-white">
                        Comments
                    </h2>
                    {session && !postData.isDeleted && (
                        <form onSubmit={handleSubmitComment} className="mb-6">
                            <TipTapEditor
                                content={comment}
                                onChange={setComment}
                                placeholder="Write a comment..."
                                variant="compact"
                                postId={postId}
                                communityId={post?.communityId || undefined}
                                communitySlug={
                                    post?.community?.slug || undefined
                                }
                            />
                            <Button
                                type="submit"
                                disabled={
                                    createComment.isPending ||
                                    isHtmlContentEmpty(comment)
                                }
                                className="mt-2"
                            >
                                {createComment.isPending
                                    ? 'Posting...'
                                    : 'Post Comment'}
                            </Button>
                        </form>
                    )}

                    {postData.isDeleted && (
                        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
                            <p>
                                This post has been deleted. New comments are
                                disabled, but existing comments are still
                                visible.
                            </p>
                        </div>
                    )}

                    <div className="space-y-4">
                        {postData.comments?.map(
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
                </div>
            </div>
        </div>
    );
}
