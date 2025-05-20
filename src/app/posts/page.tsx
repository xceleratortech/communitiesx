'use client';

import Link from 'next/link';
import React from 'react';
import { trpc } from '@/providers/trpc-provider';
import { useSession } from '@/server/auth/client';
import { Button } from '@/components/ui/button';

type Post = {
    id: number;
    title: string;
    content: string;
    authorId: string;
    createdAt: Date;
    updatedAt: Date;
    author: {
        id: string;
        name: string | null;
        email: string;
    };
};

export default function PostsPage() {
    const { data: session } = useSession();
    const { data: posts, isLoading } = trpc.community.getPosts.useQuery(
        undefined,
        {
            enabled: !!session, // Only fetch posts if user is authenticated
        },
    );

    if (!session) {
        return (
            <div className="mx-auto max-w-4xl p-4">
                <h1 className="mb-4 text-3xl font-bold">Access Denied</h1>
                <p className="mb-4 text-gray-600">
                    Please sign in to view community posts.
                </p>
                <Button asChild>
                    <Link href="/auth/login">Sign In</Link>
                </Button>
            </div>
        );
    }

    if (isLoading) {
        return <div className="p-4">Loading posts...</div>;
    }

    if (!posts || posts.length === 0) {
        return (
            <div className="mx-auto max-w-4xl p-4">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Community Posts</h1>
                    {session && (
                        <Button asChild>
                            <Link href="/posts/new">Create Post</Link>
                        </Button>
                    )}
                </div>
                <p className="text-gray-600">
                    No posts yet. Be the first to create one!
                </p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl p-4">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-3xl font-bold">Community Posts</h1>
                {session && (
                    <Button asChild>
                        <Link href="/posts/new">Create Post</Link>
                    </Button>
                )}
            </div>

            <div className="space-y-4">
                {posts.map((post: Post) => (
                    <Link
                        key={post.id}
                        href={`/posts/${post.id}`}
                        className="block rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-md"
                    >
                        <h2 className="mb-2 text-xl font-semibold">
                            {post.title}
                        </h2>
                        <p className="mb-2 text-gray-600">
                            {post.content.length > 200
                                ? `${post.content.slice(0, 200)}...`
                                : post.content}
                        </p>
                        <div className="text-sm text-gray-500">
                            Posted by {post.author?.name || 'Unknown'} on{' '}
                            {new Date(post.createdAt).toLocaleDateString()}
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
