'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useState, useRef } from 'react';
import { trpc } from '@/providers/trpc-provider';
import { useSession } from '@/server/auth/client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Trash2, ArrowLeft, Home, Users } from 'lucide-react';
import CommentItem from '@/components/CommentItem';
import type { CommentWithReplies } from '@/components/CommentItem';
import TipTapEditor from '@/components/TipTapEditor';
import { UserProfilePopover } from '@/components/ui/user-profile-popover';
import { SafeHtml } from '@/lib/sanitize';
import { Loading } from '@/components/ui/loading';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
    community?: {
        id: number;
        name: string;
        slug: string;
        type: 'public' | 'private';
    };
};

export default function CommunityPostPage() {
    const params = useParams();
    const postId = parseInt(params.id as string);
    const communitySlug = params.slug as string;
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

    // Fetch community data for context
    const { data: community } = trpc.communities.getBySlug.useQuery(
        { slug: communitySlug },
        { enabled: !!session && !!communitySlug },
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
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
            {/* Breadcrumb Navigation */}
            <nav className="text-muted-foreground mb-6 flex flex-wrap items-center gap-2 text-sm">
                <Link
                    href="/"
                    className="hover:text-foreground flex items-center transition-colors"
                >
                    <Home className="mr-1 h-4 w-4" />
                    <span className="hidden sm:inline">Home</span>
                </Link>
                <span className="hidden sm:inline">/</span>
                <Link
                    href="/communities"
                    className="hover:text-foreground flex items-center transition-colors"
                >
                    <Users className="mr-1 h-4 w-4" />
                    <span className="hidden sm:inline">Communities</span>
                </Link>
                <span className="hidden sm:inline">/</span>
                <Link
                    href={`/communities/${communitySlug}`}
                    className="hover:text-foreground flex items-center transition-colors"
                >
                    {community?.name || 'Community'}
                </Link>
                <span className="hidden sm:inline">/</span>
                <span className="text-foreground truncate font-medium">
                    {postData.isDeleted ? '[Deleted]' : postData.title}
                </span>
            </nav>

            {/* Community Context Card */}
            {community && (
                <Card className="mb-6">
                    <CardContent className="p-4">
                        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                            <div className="flex items-center space-x-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage
                                        src={community.avatar || undefined}
                                        alt={community.name}
                                    />
                                    <AvatarFallback className="bg-primary text-sm font-semibold">
                                        {community.name
                                            .substring(0, 2)
                                            .toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h2 className="text-lg font-semibold">
                                        {community.name}
                                    </h2>
                                    <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
                                        <Badge
                                            variant={
                                                community.type === 'private'
                                                    ? 'secondary'
                                                    : 'outline'
                                            }
                                        >
                                            {community.type === 'private'
                                                ? 'Private'
                                                : 'Public'}
                                        </Badge>
                                        <span className="hidden sm:inline">
                                            •
                                        </span>
                                        <span>Community Post</span>
                                    </div>
                                </div>
                            </div>
                            <Link href={`/communities/${communitySlug}`}>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full sm:w-auto"
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back to Community
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Post Content */}
            <div className="mb-8">
                <div className="mb-2 flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-2xl font-bold break-words sm:text-3xl dark:text-white">
                            {postData.isDeleted ? '[Deleted]' : postData.title}
                        </h1>
                    </div>
                </div>
                <div className="prose prose-ul:list-disc prose-ol:list-decimal dark:prose-invert dark:prose-headings:text-white dark:prose-a:text-blue-400 max-w-none rounded-lg shadow-sm">
                    {postData.isDeleted ? (
                        <div className="space-y-2">
                            <span className="block text-gray-500 italic dark:text-gray-300">
                                [Content deleted]
                            </span>
                            <span className="block text-sm text-gray-400 dark:text-gray-400">
                                Removed on{' '}
                                {new Date(postData.updatedAt).toLocaleString()}
                            </span>
                        </div>
                    ) : (
                        <SafeHtml
                            html={postData.content}
                            className="whitespace-pre-wrap"
                        />
                    )}
                </div>
            </div>

            {/* Comments Section */}
            <div className="mb-8">
                <h2 className="mb-4 text-xl font-bold sm:text-2xl dark:text-white">
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
                            communitySlug={post?.community?.slug || undefined}
                        />
                        <Button
                            type="submit"
                            disabled={createComment.isPending}
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
                            disabled, but existing comments are still visible.
                        </p>
                    </div>
                )}

                <div className="space-y-4">
                    {postData.comments?.map((comment: CommentWithReplies) => (
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
                            replyMutationPending={createComment.isPending}
                            onDeleteComment={handleDeleteComment}
                            deleteCommentPending={
                                deleteCommentMutation.isPending
                            }
                            autoExpandedComments={autoExpandedComments}
                            onExpansionChange={handleCommentExpansionChange}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
