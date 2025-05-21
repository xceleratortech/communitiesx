'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { trpc } from '@/providers/trpc-provider';
import { useSession } from '@/server/auth/client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Edit } from 'lucide-react';

type User = {
    id: string;
    name: string | null;
    email: string;
};

type Comment = {
    id: number;
    content: string;
    postId: number;
    authorId: string;
    createdAt: Date;
    updatedAt: Date;
    author: User;
};

type Post = {
    id: number;
    title: string;
    content: string;
    authorId: string;
    createdAt: Date;
    updatedAt: Date;
    author: User;
    comments: Comment[];
};

export default function PostPage() {
    const params = useParams();
    const postId = parseInt(params.id as string);
    const { data: session } = useSession();
    const [comment, setComment] = useState('');
    const router = useRouter();

    // State for inline comment editing
    const [editingCommentId, setEditingCommentId] = useState<number | null>(
        null,
    );
    const [editedCommentContent, setEditedCommentContent] =
        useState<string>('');

    const utils = trpc.useUtils();

    const {
        data: post,
        isLoading,
        refetch,
    } = trpc.community.getPost.useQuery(
        { postId },
        {
            enabled: !!session, // Only fetch post if user is authenticated
        },
    );

    const createComment = trpc.community.createComment.useMutation({
        onSuccess: () => {
            setComment('');
            // refetch(); // Use invalidate instead for more targeted updates
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

    if (!session) {
        return (
            <div className="mx-auto max-w-4xl p-4">
                <h1 className="mb-4 text-3xl font-bold">Access Denied</h1>
                <p className="mb-4 text-gray-600">
                    Please sign in to view this post.
                </p>
                <Link
                    href="/auth/login"
                    className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                >
                    Sign In
                </Link>
            </div>
        );
    }

    if (isLoading) {
        return <div className="p-4">Loading post...</div>;
    }

    if (!post) {
        return <div className="p-4">Post not found</div>;
    }

    const handleStartEdit = (commentToEdit: Comment) => {
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
            content: editedCommentContent.trim(),
        });
    };

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim()) return;

        await createComment.mutate({
            postId,
            content: comment.trim(),
        });
    };

    return (
        <div className="mx-auto max-w-4xl p-4">
            <article className="mb-8">
                <div className="mb-4 flex items-center">
                    <h1 className="flex-grow text-3xl font-bold">
                        {post.title}
                    </h1>
                    {session?.user?.id === post.authorId && (
                        <button
                            type="button"
                            onClick={(e: React.MouseEvent) => {
                                e.preventDefault();
                                e.stopPropagation();
                                router.push(`/posts/${post.id}/edit`);
                            }}
                            className="ml-2 rounded-full p-2 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            title="Edit post"
                        >
                            <Edit className="h-5 w-5 text-gray-500" />
                        </button>
                    )}
                </div>
                <div className="mb-2 text-gray-600">
                    Posted by {post.author?.name || 'Unknown'} on{' '}
                    {new Date(post.createdAt).toLocaleDateString()}
                </div>
                <p className="text-lg whitespace-pre-wrap">{post.content}</p>
            </article>

            <div className="mb-8">
                <h2 className="mb-4 text-2xl font-bold">Comments</h2>
                {session && (
                    <form onSubmit={handleSubmitComment} className="mb-6">
                        <Textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={3}
                            placeholder="Write a comment..."
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

                <div className="space-y-4">
                    {post.comments?.map((comment: Comment) => (
                        <div
                            key={comment.id}
                            className="rounded bg-gray-50 p-4"
                        >
                            {editingCommentId === comment.id ? (
                                <div className="space-y-2">
                                    <Textarea
                                        value={editedCommentContent}
                                        onChange={(e) =>
                                            setEditedCommentContent(
                                                e.target.value,
                                            )
                                        }
                                        rows={3}
                                        className="w-full"
                                    />
                                    <div className="flex justify-end space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleCancelEdit}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() =>
                                                handleSaveEdit(comment.id)
                                            }
                                            disabled={
                                                updateCommentMutation.isPending ||
                                                !editedCommentContent.trim()
                                            }
                                        >
                                            {updateCommentMutation.isPending
                                                ? 'Saving...'
                                                : 'Save'}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-start justify-between">
                                        <p className="mb-2 flex-grow whitespace-pre-wrap">
                                            {comment.content}
                                        </p>
                                        {session?.user?.id ===
                                            comment.authorId && (
                                            <button
                                                onClick={() =>
                                                    handleStartEdit(comment)
                                                }
                                                className="ml-2 flex-shrink-0 p-1 text-gray-500 hover:text-gray-700"
                                                title="Edit comment"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {comment.author?.name || 'Unknown'} •{' '}
                                        {new Date(
                                            comment.createdAt,
                                        ).toLocaleDateString()}
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
