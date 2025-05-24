'use client';

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
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
import {
    Edit,
    Trash2,
    ChevronDown,
    ChevronUp,
    PlusCircleIcon,
} from 'lucide-react';
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
    const sessionData = useSession();
    const session = sessionData.data;
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);

    // State for collapsible sections
    const [aboutOpen, setAboutOpen] = useState(true);
    const [statsOpen, setStatsOpen] = useState(false);
    const [adminsOpen, setAdminsOpen] = useState(false);

    const utils = trpc.useUtils();
    const postsQuery = trpc.community.getPosts.useQuery(undefined, {
        enabled: !!session,
    });

    // Fetch statistics data
    const statsQuery = trpc.community.getStats.useQuery(undefined, {
        enabled: !!session,
    });

    // Fetch admin users
    const adminsQuery = trpc.community.getAdmins.useQuery(undefined, {
        enabled: !!session,
    });

    const deletePostMutation = trpc.community.deletePost.useMutation({
        onSuccess: () => {
            // Invalidate the posts query to refresh the list
            utils.community.getPosts.invalidate();
        },
    });

    const handleDeletePost = async (postId: number, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

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

    const posts = postsQuery.data;
    const isLoading = postsQuery.isLoading;
    const stats = statsQuery.data || {
        totalUsers: 0,
        totalPosts: 0,
        totalCommunities: 0,
        activeToday: 0,
    };
    const admins = adminsQuery.data || [];

    // Helper function to get initials from name
    const getInitials = (name: string) => {
        if (!name) return '?';
        return name
            .split(' ')
            .map((part) => part[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    // Helper function to generate a consistent color for a user
    const getUserColor = (userId: string) => {
        const colors = [
            { bg: 'bg-blue-100', text: 'text-blue-600' },
            { bg: 'bg-green-100', text: 'text-green-600' },
            { bg: 'bg-purple-100', text: 'text-purple-600' },
            { bg: 'bg-red-100', text: 'text-red-600' },
            { bg: 'bg-orange-100', text: 'text-orange-600' },
            { bg: 'bg-pink-100', text: 'text-pink-600' },
            { bg: 'bg-teal-100', text: 'text-teal-600' },
            { bg: 'bg-indigo-100', text: 'text-indigo-600' },
        ];

        // Simple hash function to get a consistent index
        const hash = userId.split('').reduce((acc, char) => {
            return acc + char.charCodeAt(0);
        }, 0);

        const colorIndex = hash % colors.length;
        return colors[colorIndex];
    };

    // Use useEffect to mark when component is hydrated on client
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Don't render anything meaningful during SSR to avoid hydration mismatches
    if (!isClient) {
        return <div className="p-4">Loading...</div>;
    }

    if (session === undefined) {
        return null;
    }

    // Only show loading state on client after hydration
    if (isClient && isLoading) {
        return <div className="p-4">Loading posts...</div>;
    }

    if (!session) {
        return (
            <div className="mx-auto max-w-7xl p-4">
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

    const renderPosts = () => {
        if (!posts || posts.length === 0) {
            return (
                <div className="p-4">
                    <p className="text-gray-600">
                        No posts yet. Be the first to create one!
                    </p>
                </div>
            );
        }

        return (
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
                                    {post.isDeleted ? '[Deleted]' : post.title}
                                </CardTitle>
                                {session?.user?.id === post.authorId &&
                                    !post.isDeleted && (
                                        <CardAction className="ml-2 flex space-x-1 p-0">
                                            <button
                                                type="button"
                                                onClick={(
                                                    e: React.MouseEvent,
                                                ) => {
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
                                            <button
                                                type="button"
                                                onClick={(e) =>
                                                    handleDeletePost(post.id, e)
                                                }
                                                className="rounded-full p-2 hover:bg-gray-100 focus:ring-2 focus:ring-red-500 focus:outline-none"
                                                title="Delete post"
                                                disabled={
                                                    deletePostMutation.isPending
                                                }
                                            >
                                                <Trash2 className="h-5 w-5 text-gray-500" />
                                            </button>
                                        </CardAction>
                                    )}
                            </CardHeader>
                            <CardContent>
                                {post.isDeleted ? (
                                    <div className="space-y-1">
                                        <span className="text-gray-500 italic">
                                            [Content deleted]
                                        </span>
                                        <span className="block text-sm text-gray-400">
                                            Removed on{' '}
                                            {new Date(
                                                post.updatedAt,
                                            ).toLocaleString()}
                                        </span>
                                    </div>
                                ) : (
                                    <div
                                        className="prose mb-2 max-w-none text-gray-600"
                                        dangerouslySetInnerHTML={{
                                            __html:
                                                post.content.length > 200
                                                    ? `${post.content.slice(0, 200)}...`
                                                    : post.content,
                                        }}
                                    />
                                )}
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
        );
    };

    return (
        <div className="mx-auto max-w-7xl p-4">
            <div className="flex flex-col gap-6 md:flex-row">
                {/* Main content area */}
                <div className="flex-1">
                    <div className="mb-6 flex items-center justify-between">
                        <h1 className="text-3xl font-bold">Community Posts</h1>
                        {session && (
                            <Button asChild>
                                <Link href="/posts/new">
                                    <PlusCircleIcon /> Create Post
                                </Link>
                            </Button>
                        )}
                    </div>
                    {renderPosts()}
                </div>

                {/* Right sidebar */}
                <div className="w-full shrink-0 md:w-80 lg:w-96">
                    <div className="scrollbar-thin scrollbar-thumb-rounded-md scrollbar-thumb-gray-300 scrollbar-track-transparent sticky top-4 max-h-[calc(100vh-2rem)] space-y-4 overflow-y-auto pr-2">
                        {/* Site info section */}
                        <div className="flex flex-col space-y-4 pb-6">
                            {/* Community name and logo */}
                            <div className="mb-2 flex items-center space-x-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                                    <span className="text-xl font-bold">C</span>
                                </div>
                                <div>
                                    <h3 className="font-semibold">
                                        communities
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        communities.app
                                    </p>
                                </div>
                            </div>

                            {/* About Section - Collapsible */}
                            <div className="overflow-hidden rounded-md border border-gray-200">
                                <button
                                    onClick={() => setAboutOpen(!aboutOpen)}
                                    className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 hover:bg-gray-100"
                                >
                                    <span className="font-medium">About</span>
                                    {aboutOpen ? (
                                        <ChevronUp size={18} />
                                    ) : (
                                        <ChevronDown size={18} />
                                    )}
                                </button>

                                {aboutOpen && (
                                    <div className="space-y-4 p-4">
                                        <div>
                                            <h4 className="mb-2 font-medium">
                                                About this site
                                            </h4>
                                            <p className="mb-2 text-sm text-gray-600">
                                                General-purpose Community
                                                instance. New users and
                                                communities welcome!
                                            </p>

                                            <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
                                                <li>
                                                    Sign-ups are via invite only
                                                </li>
                                                <li>
                                                    E-mail verification is
                                                    required
                                                </li>
                                                <li>
                                                    User community creation is
                                                    enabled
                                                </li>
                                                <li>
                                                    For now Image/Video upload
                                                    is disabled
                                                </li>
                                                <li>
                                                    We have a{' '}
                                                    <Link
                                                        href="/"
                                                        className="text-blue-600 hover:underline"
                                                    >
                                                        policy for
                                                        administration,
                                                        moderation, and
                                                        federation
                                                    </Link>
                                                </li>
                                            </ul>
                                        </div>

                                        <div>
                                            <h4 className="mb-2 font-medium">
                                                Rules are simple:
                                            </h4>
                                            <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
                                                <li>No abusive language</li>
                                                <li>
                                                    Be respectful to other
                                                    members
                                                </li>
                                                <li>
                                                    No spam or self-promotion
                                                </li>
                                                <li>
                                                    Follow community-specific
                                                    guidelines
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Statistics Section - Collapsible */}
                            <div className="overflow-hidden rounded-md border border-gray-200">
                                <button
                                    onClick={() => setStatsOpen(!statsOpen)}
                                    className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 hover:bg-gray-100"
                                >
                                    <span className="font-medium">
                                        Statistics
                                    </span>
                                    {statsOpen ? (
                                        <ChevronUp size={18} />
                                    ) : (
                                        <ChevronDown size={18} />
                                    )}
                                </button>

                                {statsOpen && (
                                    <div className="p-4">
                                        <ul className="space-y-2 text-sm">
                                            <li className="flex justify-between">
                                                <span className="text-gray-600">
                                                    Total users:
                                                </span>
                                                <span className="font-medium">
                                                    {statsQuery.isLoading
                                                        ? '...'
                                                        : stats.totalUsers}
                                                </span>
                                            </li>
                                            <li className="flex justify-between">
                                                <span className="text-gray-600">
                                                    Total posts:
                                                </span>
                                                <span className="font-medium">
                                                    {statsQuery.isLoading
                                                        ? '...'
                                                        : stats.totalPosts}
                                                </span>
                                            </li>
                                            <li className="flex justify-between">
                                                <span className="text-gray-600">
                                                    Total communities:
                                                </span>
                                                <span className="font-medium">
                                                    {statsQuery.isLoading
                                                        ? '...'
                                                        : stats.totalCommunities}
                                                </span>
                                            </li>
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Admins Section - Collapsible */}
                            <div className="overflow-hidden rounded-md border border-gray-200">
                                <button
                                    onClick={() => setAdminsOpen(!adminsOpen)}
                                    className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 hover:bg-gray-100"
                                >
                                    <span className="font-medium">Admins</span>
                                    {adminsOpen ? (
                                        <ChevronUp size={18} />
                                    ) : (
                                        <ChevronDown size={18} />
                                    )}
                                </button>

                                {adminsOpen && (
                                    <div className="p-4">
                                        {adminsQuery.isLoading ? (
                                            <p className="text-sm text-gray-500">
                                                Loading admins...
                                            </p>
                                        ) : admins.length === 0 ? (
                                            <p className="text-sm text-gray-500">
                                                No admins found
                                            </p>
                                        ) : (
                                            <div className="space-y-3">
                                                {admins.map((admin) => {
                                                    const color = getUserColor(
                                                        admin.id,
                                                    );
                                                    const initials =
                                                        getInitials(admin.name);

                                                    // For demo purposes, add version number to first admin
                                                    const showVersion =
                                                        admin.id ===
                                                        admins[0].id;

                                                    return (
                                                        <div
                                                            key={admin.id}
                                                            className="flex items-center space-x-2"
                                                        >
                                                            <div
                                                                className={`h-8 w-8 ${color.bg} flex items-center justify-center rounded-full ${color.text}`}
                                                            >
                                                                {initials}
                                                            </div>
                                                            <span className="text-sm">
                                                                {admin.name}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
