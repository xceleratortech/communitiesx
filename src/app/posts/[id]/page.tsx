'use client';

import { useParams } from 'next/navigation';
import React, { useState } from 'react';
import { trpc } from '@/providers/trpc-provider';
import { useSession } from '@/server/auth/client';
import Link from 'next/link';

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
            refetch();
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
                <h1 className="mb-4 text-3xl font-bold">{post.title}</h1>
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
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="mb-2 w-full rounded border p-2"
                            rows={3}
                            placeholder="Write a comment..."
                        />
                        <button
                            type="submit"
                            disabled={createComment.isPending}
                            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
                        >
                            {createComment.isPending
                                ? 'Posting...'
                                : 'Post Comment'}
                        </button>
                    </form>
                )}

                <div className="space-y-4">
                    {post.comments?.map((comment: Comment) => (
                        <div
                            key={comment.id}
                            className="rounded bg-gray-50 p-4"
                        >
                            <p className="mb-2">{comment.content}</p>
                            <div className="text-sm text-gray-500">
                                {comment.author?.name || 'Unknown'} •{' '}
                                {new Date(
                                    comment.createdAt,
                                ).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
