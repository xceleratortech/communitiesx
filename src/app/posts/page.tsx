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
    MessageSquare,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { posts, users, communities, comments } from '@/server/db/schema';
import { UserProfilePopover } from '@/components/ui/user-profile-popover';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

// Updated Post type to match the backend and include all fields from posts schema
// and correctly typed author from users schema
type PostFromDb = typeof posts.$inferSelect;
type UserFromDb = typeof users.$inferSelect;
type CommunityFromDb = typeof communities.$inferSelect;
type CommentFromDb = typeof comments.$inferSelect;

type PostDisplay = PostFromDb & {
    author: UserFromDb | null; // Author can be null if relation is not found
    community?: CommunityFromDb | null; // Community can be null or undefined for non-community posts
    source?: {
        type: string;
        orgId?: string;
        communityId?: number;
        reason: string;
    };
    comments?: CommentFromDb[]; // Properly typed comments array
};

export default function PostsPage() {
    const sessionData = useSession();
    const session = sessionData.data;
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);
    const [selectedCommunity, setSelectedCommunity] = useState<string>('all');

    // State for collapsible sections
    const [aboutOpen, setAboutOpen] = useState(true);
    const [statsOpen, setStatsOpen] = useState(false);
    const [adminsOpen, setAdminsOpen] = useState(false);

    const utils = trpc.useUtils();

    // Comment out the old queries
    // const postsQuery = trpc.community.getPosts.useQuery(undefined, {
    //     enabled: !!session,
    // });

    // const postsQuery = trpc.community.getRelevantPosts.useQuery(undefined, {
    //     enabled: !!session,
    // });

    // Use the new getAllRelevantPosts query that includes both org and community posts
    const postsQuery = trpc.community.getAllRelevantPosts.useQuery(undefined, {
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

    // Get user's communities for the filter
    const userCommunitiesQuery = trpc.communities.getUserCommunities.useQuery(
        undefined,
        {
            enabled: !!session,
        },
    );

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
    const userCommunities = userCommunitiesQuery.data || [];

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
                <h1 className="mb-4 text-3xl font-bold dark:text-white">
                    Access Denied
                </h1>
                <p className="mb-4 text-gray-600 dark:text-gray-400">
                    Please sign in to view community posts.
                </p>
                <Button asChild>
                    <Link href="/auth/login">Sign In</Link>
                </Button>
            </div>
        );
    }

    const renderPosts = () => {
        // Filter posts based on selected community
        const filteredPosts =
            selectedCommunity === 'all'
                ? posts
                : selectedCommunity === 'org-only'
                  ? posts?.filter(
                        (post: PostDisplay) => post.source?.type === 'org',
                    )
                  : posts?.filter(
                        (post: PostDisplay) =>
                            post.community?.id === parseInt(selectedCommunity),
                    );

        if (!filteredPosts || filteredPosts.length === 0) {
            return (
                <div className="p-4 text-center">
                    <p className="mb-4 text-gray-600 dark:text-gray-400">
                        {selectedCommunity === 'org-only'
                            ? 'No organization posts found.'
                            : selectedCommunity !== 'all'
                              ? 'No posts found in this community.'
                              : 'No posts found. Join or follow more communities to see posts here.'}
                    </p>
                    <Button asChild>
                        <Link href="/communities">Browse Communities</Link>
                    </Button>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {filteredPosts.map((post: PostDisplay) => (
                    <Link
                        key={post.id}
                        href={`/posts/${post.id}`}
                        className="block"
                        style={{ textDecoration: 'none' }}
                    >
                        <Card className="relative py-2 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
                            {/* Source info at top */}
                            {post.source && (
                                <div className="border-b border-gray-200 px-4 pt-0.5 pb-1.5 dark:border-gray-600">
                                    <div className="flex items-center">
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {post.source.reason}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Post content */}
                            <div className="px-4 py-0">
                                {/* Post title */}
                                <h3 className="mt-0 mb-2 text-base font-medium">
                                    {post.isDeleted ? '[Deleted]' : post.title}
                                </h3>

                                {/* Post content */}
                                {post.isDeleted ? (
                                    <div className="space-y-1">
                                        <span className="text-sm text-gray-500 italic dark:text-gray-400">
                                            [Content deleted]
                                        </span>
                                        <span className="block text-xs text-gray-400 dark:text-gray-500">
                                            Removed on{' '}
                                            {new Date(
                                                post.updatedAt,
                                            ).toLocaleString()}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="text-sm text-gray-600 dark:text-gray-300">
                                        <div
                                            dangerouslySetInnerHTML={{
                                                __html:
                                                    post.content.length > 200
                                                        ? `${post.content.slice(0, 200)}...`
                                                        : post.content,
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Post metadata */}
                                <div className="mt-3 flex items-center justify-between">
                                    <div className="flex items-center">
                                        {post.community && (
                                            <span
                                                className="mr-2 inline-flex cursor-pointer items-center rounded-full bg-blue-50 px-2 py-0 text-xs font-medium text-blue-700 hover:underline dark:bg-blue-900/30 dark:text-blue-300"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (post.community?.slug) {
                                                        router.push(
                                                            `/communities/${post.community.slug}`,
                                                        );
                                                    }
                                                }}
                                            >
                                                {post.community?.name}
                                            </span>
                                        )}
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            Posted by{' '}
                                            {post.author?.id ? (
                                                <UserProfilePopover
                                                    userId={post.author.id}
                                                >
                                                    <span className="cursor-pointer hover:underline">
                                                        {post.author.name ||
                                                            'Unknown'}
                                                    </span>
                                                </UserProfilePopover>
                                            ) : (
                                                'Unknown'
                                            )}{' '}
                                            •{' '}
                                            {new Date(
                                                post.createdAt,
                                            ).toLocaleDateString()}
                                        </span>

                                        <div className="ml-4 items-center space-x-4">
                                            <button
                                                className="flex items-center text-xs text-gray-500 dark:text-gray-400"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    router.push(
                                                        `/posts/${post.id}`,
                                                    );
                                                }}
                                            >
                                                <MessageSquare className="mr-1 h-3 w-3" />
                                                {Array.isArray(post.comments)
                                                    ? post.comments.length
                                                    : 0}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    {session?.user?.id === post.authorId &&
                                        !post.isDeleted && (
                                            <div className="flex space-x-1">
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
                                                    className="rounded-full p-1 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:hover:bg-gray-700"
                                                    title="Edit post"
                                                >
                                                    <Edit className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) =>
                                                        handleDeletePost(
                                                            post.id,
                                                            e,
                                                        )
                                                    }
                                                    className="rounded-full p-1 hover:bg-gray-100 focus:ring-2 focus:ring-red-500 focus:outline-none dark:hover:bg-gray-700"
                                                    title="Delete post"
                                                    disabled={
                                                        deletePostMutation.isPending
                                                    }
                                                >
                                                    <Trash2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                                </button>
                                            </div>
                                        )}
                                </div>

                                {/* Engagement stats */}
                                {/* <div className="mt-2 flex items-center space-x-4">
                                    <button className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                        <MessageSquare className="h-3 w-3 mr-1" />
                                        {post.comments?.length || 0}
                                    </button>
                                </div> */}
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>
        );
    };

    return (
        <div className="py-4">
            <div className="mb-4">
                {/* Simplified header with cleaner styling */}
                <div className="mb-4 flex flex-col items-center justify-between sm:flex-row">
                    {/* Filter dropdown - replaced with shadcn Select */}
                    <div className="flex items-center">
                        <label
                            htmlFor="community-filter"
                            className="mr-2 text-sm text-gray-600 dark:text-gray-300"
                        >
                            Filter:
                        </label>
                        <Select
                            value={selectedCommunity}
                            onValueChange={(value) =>
                                setSelectedCommunity(value)
                            }
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select filter" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All posts</SelectItem>
                                <SelectItem value="org-only">
                                    Organization posts only
                                </SelectItem>
                                {userCommunities.map((community) => (
                                    <SelectItem
                                        key={community.id}
                                        value={community.id.toString()}
                                    >
                                        {community.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center space-x-4">
                        {/* Create Post button */}
                        {session && (
                            <Button size="sm" asChild className="mr-2">
                                <Link href="/posts/new">
                                    <PlusCircleIcon className="mr-1 h-4 w-4" />{' '}
                                    New Post
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Info banner with horizontal scrolling animation */}
                <div className="mb-4 overflow-hidden rounded-md bg-gray-50 p-3 dark:bg-gray-800">
                    <div className="scrolling-container relative w-full overflow-hidden">
                        <p className="scrolling-text text-sm whitespace-nowrap text-gray-600 dark:text-gray-300">
                            You are seeing posts from your organization and
                            communities you're following or are a member of.
                            &nbsp;&nbsp;&nbsp;&nbsp; You are seeing posts from
                            your organization and communities you're following
                            or are a member of. &nbsp;&nbsp;&nbsp;&nbsp; You are
                            seeing posts from your organization and communities
                            you're following or are a member of.
                            &nbsp;&nbsp;&nbsp;&nbsp;
                        </p>
                    </div>
                    <style jsx global>{`
                        @keyframes scrollText {
                            0% {
                                transform: translateX(-33.33%);
                            }
                            100% {
                                transform: translateX(0%);
                            }
                        }
                        .scrolling-container {
                            mask-image: linear-gradient(
                                to right,
                                transparent,
                                black 5%,
                                black 95%,
                                transparent
                            );
                            overflow: hidden;
                        }
                        .scrolling-text {
                            display: inline-block;
                            animation: scrollText 20s linear infinite;
                            padding-right: 50px;
                        }
                    `}</style>
                </div>
            </div>

            <div className="flex flex-col gap-4 md:flex-row">
                {/* Main content area */}
                <div className="flex-1">{renderPosts()}</div>

                {/* Right sidebar */}
                <div className="w-full shrink-0 md:w-80 lg:w-96">
                    <div className="scrollbar-thin scrollbar-thumb-rounded-md scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent sticky top-4 max-h-[calc(100vh-2rem)] space-y-4 overflow-y-auto pr-2">
                        {/* Site info section */}
                        <div className="flex flex-col space-y-4 pb-6">
                            {/* Community name and logo */}
                            <div className="mb-2 flex items-center space-x-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                                    <span className="text-xl font-bold dark:text-white">
                                        C
                                    </span>
                                </div>
                                <div>
                                    <h3 className="font-semibold dark:text-white">
                                        communities
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        communities.app
                                    </p>
                                </div>
                            </div>

                            {/* About Section - Collapsible */}
                            <div className="overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={() => setAboutOpen(!aboutOpen)}
                                    className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
                                >
                                    <span className="font-medium dark:text-white">
                                        About
                                    </span>
                                    {aboutOpen ? (
                                        <ChevronUp
                                            size={18}
                                            className="dark:text-gray-400"
                                        />
                                    ) : (
                                        <ChevronDown
                                            size={18}
                                            className="dark:text-gray-400"
                                        />
                                    )}
                                </button>

                                {aboutOpen && (
                                    <div className="space-y-4 p-4 dark:bg-gray-900">
                                        <div>
                                            <h4 className="mb-2 font-medium dark:text-white">
                                                About this site
                                            </h4>
                                            <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                                                General-purpose Community
                                                instance. New users and
                                                communities welcome!
                                            </p>

                                            <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-400">
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
                                                        className="text-blue-600 hover:underline dark:text-blue-400"
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
                                            <h4 className="mb-2 font-medium dark:text-white">
                                                Rules are simple:
                                            </h4>
                                            <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-400">
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
                            <div className="overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={() => setStatsOpen(!statsOpen)}
                                    className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
                                >
                                    <span className="font-medium dark:text-white">
                                        Statistics
                                    </span>
                                    {statsOpen ? (
                                        <ChevronUp
                                            size={18}
                                            className="dark:text-gray-400"
                                        />
                                    ) : (
                                        <ChevronDown
                                            size={18}
                                            className="dark:text-gray-400"
                                        />
                                    )}
                                </button>

                                {statsOpen && (
                                    <div className="p-4 dark:bg-gray-900">
                                        <ul className="space-y-2 text-sm">
                                            <li className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    Total users:
                                                </span>
                                                <span className="font-medium dark:text-white">
                                                    {statsQuery.isLoading
                                                        ? '...'
                                                        : stats.totalUsers}
                                                </span>
                                            </li>
                                            <li className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    Total posts:
                                                </span>
                                                <span className="font-medium dark:text-white">
                                                    {statsQuery.isLoading
                                                        ? '...'
                                                        : stats.totalPosts}
                                                </span>
                                            </li>
                                            <li className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    Total communities:
                                                </span>
                                                <span className="font-medium dark:text-white">
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
                            <div className="overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={() => setAdminsOpen(!adminsOpen)}
                                    className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
                                >
                                    <span className="font-medium dark:text-white">
                                        Admins
                                    </span>
                                    {adminsOpen ? (
                                        <ChevronUp
                                            size={18}
                                            className="dark:text-gray-400"
                                        />
                                    ) : (
                                        <ChevronDown
                                            size={18}
                                            className="dark:text-gray-400"
                                        />
                                    )}
                                </button>

                                {adminsOpen && (
                                    <div className="p-4 dark:bg-gray-900">
                                        {adminsQuery.isLoading ? (
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Loading admins...
                                            </p>
                                        ) : admins.length === 0 ? (
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
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
                                                            <span className="text-sm dark:text-gray-300">
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
