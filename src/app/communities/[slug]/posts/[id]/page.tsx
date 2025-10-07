'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useState, useRef, useMemo } from 'react';
import { trpc } from '@/providers/trpc-provider';
import { useSession } from '@/server/auth/client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Edit,
    Trash2,
    ArrowLeft,
    Home,
    Users,
    Share2,
    Bookmark,
    BookmarkCheck,
} from 'lucide-react';
import CommentItem from '@/components/CommentItem';
import type { CommentWithReplies } from '@/components/CommentItem';
import TipTapEditor from '@/components/TipTapEditor';
import { UserProfilePopover } from '@/components/ui/user-profile-popover';
import { SafeHtml } from '@/lib/sanitize';
import { Loading } from '@/components/ui/loading';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { isHtmlContentEmpty } from '@/lib/utils';
import { ImageCarousel } from '@/components/ui/image-carousel';
import { SafeHtmlWithoutImages } from '@/components/ui/safe-html-without-images';
import { LikeButton } from '@/components/ui/like-button';
import { toast } from 'sonner';

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
    // Like count, reaction and saved status for this single post
    const likeCountsQuery = trpc.community.getPostLikeCounts.useQuery(
        { postIds: [postId] },
        { enabled: !!session && !!postId },
    );
    const userReactionsQuery = trpc.community.getUserReactions.useQuery(
        { postIds: [postId] },
        { enabled: !!session && !!postId },
    );
    const userSavedMapQuery = trpc.community.getUserSavedMap.useQuery(
        { postIds: [postId] },
        { enabled: !!session && !!postId },
    );

    // Get comment IDs for helpful vote queries
    const commentIds = useMemo(() => {
        if (!post?.comments) return [];
        const extractCommentIds = (comments: any[]): number[] => {
            const ids: number[] = [];
            comments.forEach((comment) => {
                ids.push(comment.id);
                if (comment.replies && comment.replies.length > 0) {
                    ids.push(...extractCommentIds(comment.replies));
                }
            });
            return ids;
        };
        return extractCommentIds(post.comments);
    }, [post?.comments]);

    // Helpful vote queries for comments
    const commentHelpfulCountsQuery =
        trpc.community.getCommentHelpfulCounts.useQuery(
            { commentIds },
            { enabled: commentIds.length > 0 },
        );
    const userHelpfulVotesQuery = trpc.community.getUserHelpfulVotes.useQuery(
        { commentIds },
        { enabled: commentIds.length > 0 && !!session },
    );

    const savePostMutation = trpc.community.savePost.useMutation({
        onSuccess: () => {
            utils.community.getSavedPosts.invalidate();
            userSavedMapQuery.refetch();
            toast.success('Saved');
        },
        onError: () => toast.error('Failed to save'),
    });
    const unsavePostMutation = trpc.community.unsavePost.useMutation({
        onSuccess: () => {
            utils.community.getSavedPosts.invalidate();
            userSavedMapQuery.refetch();
            toast.success('Removed from saved');
        },
        onError: () => toast.error('Failed to unsave'),
    });

    const toggleHelpfulMutation =
        trpc.community.toggleCommentHelpful.useMutation({
            onSuccess: () => {
                // Invalidate helpful vote queries
                utils.community.getCommentHelpfulCounts.invalidate();
                utils.community.getUserHelpfulVotes.invalidate();
            },
            onError: () => toast.error('Failed to toggle helpful vote'),
        });

    const likeCount = likeCountsQuery.data?.[postId] ?? 0;
    const isLiked = (userReactionsQuery.data?.[postId] ?? false) as boolean;
    const isSaved = (userSavedMapQuery.data?.[postId] ?? false) as boolean;

    const handleToggleSave = () => {
        if (!session) return;
        if (isSaved) {
            unsavePostMutation.mutate({ postId });
        } else {
            savePostMutation.mutate({ postId });
        }
    };

    const handleToggleHelpful = (commentId: number) => {
        if (!session) return;
        toggleHelpfulMutation.mutate({ commentId });
    };

    const shareUrl =
        typeof window !== 'undefined'
            ? `${window.location.origin}/communities/${communitySlug}/posts/${postId}`
            : '';

    const handleShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: post?.title || 'Post',
                    text: post?.title || 'Check this out',
                    url: shareUrl,
                });
            } else {
                await navigator.clipboard.writeText(shareUrl);
                toast.success('Link copied to clipboard');
            }
        } catch (e) {
            // User cancelled or sharing failed
        }
    };

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

                {/* Post images */}
                {postData.attachments && postData.attachments.length > 0 && (
                    <div className="mt-6">
                        <ImageCarousel
                            images={postData.attachments.filter(
                                (att) => att.type === 'image',
                            )}
                            className="max-w-2xl"
                        />
                    </div>
                )}
            </div>

            {/* Like count and comments summary */}
            <div className="mt-2 flex items-center justify-between">
                <span className="text-muted-foreground text-xs">
                    {likeCount > 0
                        ? isLiked
                            ? likeCount === 1
                                ? 'You liked this'
                                : `You & ${likeCount - 1} ${likeCount - 1 === 1 ? 'other' : 'others'} liked this`
                            : `${likeCount} ${likeCount === 1 ? 'person' : 'people'} liked this`
                        : ''}
                </span>
                <span className="text-muted-foreground text-xs">
                    {Array.isArray(postData.comments)
                        ? postData.comments.length
                        : 0}{' '}
                    Comments
                </span>
            </div>

            {/* Actions: Like, Save, Share */}
            {!postData.isDeleted && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <LikeButton
                        postId={postId}
                        initialLikeCount={likeCount}
                        initialIsLiked={isLiked}
                        size="sm"
                        variant="ghost"
                        showCount={false}
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleToggleSave}
                        disabled={
                            savePostMutation.isPending ||
                            unsavePostMutation.isPending
                        }
                    >
                        {isSaved ? (
                            <span className="flex items-center gap-2">
                                <BookmarkCheck className="h-4 w-4" /> Saved
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <Bookmark className="h-4 w-4" /> Save
                            </span>
                        )}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleShare}>
                        <Share2 className="mr-2 h-4 w-4" /> Share
                    </Button>
                </div>
            )}

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
                            helpfulCount={
                                commentHelpfulCountsQuery.data?.[comment.id] ||
                                0
                            }
                            isHelpful={
                                userHelpfulVotesQuery.data?.[comment.id] ||
                                false
                            }
                            onToggleHelpful={handleToggleHelpful}
                            helpfulMutationPending={
                                toggleHelpfulMutation.isPending
                            }
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
