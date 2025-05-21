'use client';

import Link from 'next/link';
import React from 'react';
import { trpc } from '@/providers/trpc-provider';
import { useSession } from '@/server/auth/client';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardFooter,
    CardAction,
} from '@/components/ui/card';
import { Edit } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { posts, users } from '@/server/db/schema';

// Updated Post type to match the backend and include all fields from posts schema
// and correctly typed author from users schema
type PostFromDb = typeof posts.$inferSelect;
type UserFromDb = typeof users.$inferSelect;

type PostDisplay = PostFromDb & {
    author: UserFromDb | null; // Author can be null if relation is not found
};

export default function PostsPage() {
    // const { data: session } = useSession();
    const sessionData = useSession();
    const session = sessionData.data;
    const router = useRouter();

    // const { data: posts, isLoading } = trpc.community.getPosts.useQuery(
    //     undefined,
    //     {
    //         enabled: !!session, // Only fetch posts if user is authenticated
    //     },
    // );

    const postsQuery = trpc.community.getPosts.useQuery(undefined, {
        enabled: !!session,
    });

    const posts = postsQuery.data;
    const isLoading = postsQuery.isLoading;

    if (session === undefined) {
        return null;
    }
    if (isLoading) {
        return <div className="p-4">Loading posts...</div>;
    }

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
                {posts.map((post: PostDisplay) => (
                    <Link
                        key={post.id}
                        href={`/posts/${post.id}`}
                        className="block"
                        style={{ textDecoration: 'none' }}
                    >
                        <Card className="relative transition-shadow hover:shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between gap-2">
                                <CardTitle className="flex-1 truncate text-xl font-semibold">
                                    {post.title}
                                </CardTitle>
                                {session?.user?.id === post.authorId && (
                                    <CardAction className="ml-2 p-0">
                                        <button
                                            type="button"
                                            onClick={(e: React.MouseEvent) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                router.push(
                                                    `/posts/${post.id}/edit`,
                                                );
                                            }}
                                            className="rounded-full p-2 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            title="Edit post"
                                        >
                                            <Edit className="h-5 w-5 text-gray-500" />
                                        </button>
                                    </CardAction>
                                )}
                            </CardHeader>
                            <CardContent>
                                <p className="mb-2 text-gray-600">
                                    {post.content.length > 200
                                        ? `${post.content.slice(0, 200)}...`
                                        : post.content}
                                </p>
                            </CardContent>
                            <CardFooter>
                                <div className="text-sm text-gray-500">
                                    Posted by {post.author?.name || 'Unknown'}{' '}
                                    on{' '}
                                    {new Date(
                                        post.createdAt,
                                    ).toLocaleDateString()}
                                </div>
                            </CardFooter>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
