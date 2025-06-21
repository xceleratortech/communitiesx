'use client';

import Link from 'next/link';
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    Loader2,
    Building,
    Mail,
    CalendarDays,
    ShieldCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { posts, users, communities, comments } from '@/server/db/schema';
import { UserProfilePopover } from '@/components/ui/user-profile-popover';
import { CommunityPopover } from '@/components/ui/community-popover';
import { OrganizationPopover } from '@/components/ui/organization-popover';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { CardDescription } from '@/components/ui/card';

// Updated Post type to match the backend and include all fields from posts schema
// and correctly typed author from users schema
type PostFromDb = typeof posts.$inferSelect;
type UserFromDb = typeof users.$inferSelect;
type CommunityFromDb = typeof communities.$inferSelect;
type CommentFromDb = typeof comments.$inferSelect;

// Extended community type that includes user role
type UserCommunity = typeof communities.$inferSelect & {
    userRole?: 'admin' | 'moderator' | 'member' | 'follower';
};

type PostDisplay = PostFromDb & {
    author:
        | (UserFromDb & {
              organization?: {
                  id: string;
                  name: string;
              };
          })
        | null; // Author can be null if relation is not found
    community?: CommunityFromDb | null; // Community can be null or undefined for non-community posts
    source?: {
        type: string;
        orgId?: string;
        communityId?: number;
        reason: string;
    };
    comments?: CommentFromDb[]; // Properly typed comments array
};

// Post skeleton component for loading state
function PostSkeleton() {
    return (
        <div className="space-y-4">
            {[...Array(5)].map((_, index) => (
                <Card
                    key={index}
                    className="relative gap-2 py-2 dark:border-gray-700 dark:bg-gray-800"
                >
                    {/* Source info skeleton */}
                    {index % 2 === 0 && (
                        <div className="border-b border-gray-200 px-4 pt-0.5 pb-1.5 dark:border-gray-600">
                            <div className="flex items-center">
                                {/* Community/Org avatar and name */}
                                <div className="mr-2 flex items-center">
                                    <Skeleton className="mr-1.5 h-5 w-5 rounded-full" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                                {/* Source reason */}
                                <Skeleton className="h-3 w-24" />
                            </div>
                        </div>
                    )}

                    {/* Post content skeleton */}
                    <div className="px-4 py-0">
                        {/* Title skeleton */}
                        <Skeleton className="mb-2 h-6 w-3/4" />

                        {/* Content skeleton */}
                        <Skeleton className="mb-2 h-4 w-full" />
                        <Skeleton className="mb-2 h-4 w-full" />
                        <Skeleton className="mb-2 h-4 w-2/3" />

                        {/* Post metadata skeleton */}
                        <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {index % 3 === 0 && (
                                    <Skeleton className="mr-2 h-5 w-20 rounded-full" />
                                )}
                                <Skeleton className="h-4 w-32" />
                                <div className="ml-4">
                                    <Skeleton className="h-4 w-8" />
                                </div>
                            </div>

                            {/* Action buttons skeleton */}
                            {index % 2 === 1 && (
                                <div className="flex space-x-1">
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
}

export default function PostsPage() {
    const sessionData = useSession();
    const session = sessionData.data;
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);
    const [selectedCommunity, setSelectedCommunity] = useState<string>('all');

    // State for infinite scrolling
    const [posts, setPosts] = useState<PostDisplay[]>([]);
    const [offset, setOffset] = useState(0);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

    // State for collapsible sections
    const [aboutOpen, setAboutOpen] = useState(true);
    const [statsOpen, setStatsOpen] = useState(false);
    const [adminsOpen, setAdminsOpen] = useState(false);

    const utils = trpc.useUtils();
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Use the new getAllRelevantPosts query that includes both org and community posts
    const postsQuery = trpc.community.getAllRelevantPosts.useQuery({
        limit: 10,
        offset: 0,
    });

    // Update posts state when query data changes
    useEffect(() => {
        if (postsQuery.data) {
            setPosts(postsQuery.data.posts);
            setOffset(postsQuery.data.posts.length);
            setHasNextPage(postsQuery.data.hasNextPage);
            setTotalCount(postsQuery.data.totalCount);
        }
    }, [postsQuery.data]);

    // Function to fetch more posts
    const fetchNextPage = useCallback(async () => {
        if (!session || !hasNextPage || isFetchingNextPage) return;

        setIsFetchingNextPage(true);
        try {
            const data = await utils.community.getAllRelevantPosts.fetch({
                limit: 10,
                offset: offset,
            });

            setPosts((prev) => [...prev, ...data.posts]);
            setOffset((prev) => prev + data.posts.length);
            setHasNextPage(data.hasNextPage);
            setTotalCount(data.totalCount);
        } catch (error) {
            console.error('Error fetching more posts:', error);
        } finally {
            setIsFetchingNextPage(false);
        }
    }, [
        session,
        hasNextPage,
        isFetchingNextPage,
        offset,
        utils.community.getAllRelevantPosts,
    ]);

    // Setup intersection observer for infinite scrolling
    useEffect(() => {
        if (!isClient) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (
                    entries[0]?.isIntersecting &&
                    hasNextPage &&
                    !isFetchingNextPage
                ) {
                    fetchNextPage();
                }
            },
            {
                rootMargin: '0px 0px 300px 0px', // Trigger 300px before the element comes into view
                threshold: 0.1,
            },
        );

        observerRef.current = observer;

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [isClient, hasNextPage, isFetchingNextPage, fetchNextPage]);

    // Observe the load more element
    useEffect(() => {
        const currentObserver = observerRef.current;
        const currentLoadMoreRef = loadMoreRef.current;

        if (currentObserver && currentLoadMoreRef) {
            currentObserver.observe(currentLoadMoreRef);

            return () => {
                if (currentLoadMoreRef) {
                    currentObserver.unobserve(currentLoadMoreRef);
                }
            };
        }
    }, [posts]);

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

    // Get user profile with organization info
    const userProfileQuery = trpc.users.getUserProfile.useQuery(
        { userId: session?.user?.id || '' },
        {
            enabled: !!session?.user?.id,
        },
    );

    const deletePostMutation = trpc.community.deletePost.useMutation({
        onSuccess: () => {
            // Reset pagination and refetch
            setPosts([]);
            setOffset(0);
            setHasNextPage(true);
            // Invalidate the posts query to refresh the list
            utils.community.getAllRelevantPosts.invalidate();
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

    const isLoading = postsQuery.isLoading;
    const stats = statsQuery.data || {
        totalUsers: 0,
        totalPosts: 0,
        totalCommunities: 0,
        activeToday: 0,
    };
    const admins = adminsQuery.data || [];
    const userCommunities =
        userCommunitiesQuery.data || ([] as UserCommunity[]);

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

    // Separate effect for stats invalidation
    useEffect(() => {
        if (isClient) {
            utils.community.getStats.invalidate();
        }
    }, [isClient, utils.community.getStats]);

    // Don't render anything meaningful during SSR to avoid hydration mismatches
    if (!isClient) {
        return <PostSkeleton />;
    }

    if (session === undefined) {
        return null;
    }

    // Only show loading state on client after hydration
    if (isClient && isLoading && posts.length === 0) {
        return <PostSkeleton />;
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

    // Handle community filter change
    const handleCommunityFilterChange = (value: string) => {
        setSelectedCommunity(value);
        setPosts([]); // Clear current posts
        setOffset(0); // Reset offset
        setHasNextPage(true); // Reset hasNextPage

        // Refetch with the new filter
        utils.community.getAllRelevantPosts.invalidate();
    };

    const renderPosts = () => {
        // Filter posts based on selected community
        const filteredPosts =
            selectedCommunity === 'all'
                ? posts
                : selectedCommunity === 'org-only'
                  ? posts.filter(
                        (post: PostDisplay) => post.source?.type === 'org',
                    )
                  : posts.filter(
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
                        <Card className="relative gap-2 py-2 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
                            {/* Source info at top with community or org info */}
                            {post.source ? (
                                <div className="border-b border-gray-200 px-4 pt-0.5 pb-1.5 dark:border-gray-600">
                                    <div className="flex items-center">
                                        {post.community ? (
                                            <CommunityPopover
                                                communityId={post.community.id}
                                            >
                                                <div className="mr-2 flex cursor-pointer items-center">
                                                    <Avatar className="mr-1.5 h-5 w-5">
                                                        <AvatarImage
                                                            src={
                                                                post.community
                                                                    .avatar ||
                                                                undefined
                                                            }
                                                        />
                                                        <AvatarFallback className="text-xs">
                                                            {post.community.name
                                                                .substring(0, 2)
                                                                .toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-xs font-medium hover:underline">
                                                        {post.community.name}
                                                    </span>
                                                </div>
                                            </CommunityPopover>
                                        ) : post.source.type === 'org' &&
                                          post.source.orgId ? (
                                            <OrganizationPopover
                                                orgId={post.source.orgId}
                                                orgName={
                                                    post.author?.organization
                                                        ?.name || 'Organization'
                                                }
                                            >
                                                <div className="mr-2 flex cursor-pointer items-center">
                                                    <Avatar className="mr-1.5 h-5 w-5">
                                                        <AvatarFallback className="bg-blue-100 text-xs text-blue-600">
                                                            {(
                                                                post.author
                                                                    ?.organization
                                                                    ?.name ||
                                                                'Org'
                                                            )
                                                                .substring(0, 2)
                                                                .toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-xs font-medium hover:underline">
                                                        {post.author
                                                            ?.organization
                                                            ?.name ||
                                                            'Organization'}
                                                    </span>
                                                </div>
                                            </OrganizationPopover>
                                        ) : null}
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            • {post.source.reason}
                                        </span>
                                    </div>
                                </div>
                            ) : post.community ? (
                                <div className="border-b border-gray-200 px-4 pt-0.5 pb-1.5 dark:border-gray-600">
                                    <div className="flex items-center">
                                        <CommunityPopover
                                            communityId={post.community.id}
                                        >
                                            <div className="flex cursor-pointer items-center">
                                                <Avatar className="mr-1.5 h-5 w-5">
                                                    <AvatarImage
                                                        src={
                                                            post.community
                                                                .avatar ||
                                                            undefined
                                                        }
                                                    />
                                                    <AvatarFallback className="text-xs">
                                                        {post.community.name
                                                            .substring(0, 2)
                                                            .toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs font-medium hover:underline">
                                                    {post.community.name}
                                                </span>
                                            </div>
                                        </CommunityPopover>
                                    </div>
                                </div>
                            ) : null}

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
                                            className="line-clamp-2 overflow-hidden leading-5 text-ellipsis"
                                            dangerouslySetInnerHTML={{
                                                __html: post.content,
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Post metadata */}
                                <div className="mt-3 flex items-center justify-between">
                                    <div className="flex items-center">
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
                                                    className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) =>
                                                        handleDeletePost(
                                                            post.id,
                                                            e,
                                                        )
                                                    }
                                                    className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-red-500 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-red-400"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                </div>
                            </div>
                        </Card>
                    </Link>
                ))}

                {/* Loading indicator and intersection observer target */}
                <div ref={loadMoreRef} className="py-4 text-center">
                    {isFetchingNextPage ? (
                        <div className="flex items-center justify-center space-x-2">
                            <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                            <span className="text-sm text-gray-500">
                                Loading more posts...
                            </span>
                        </div>
                    ) : hasNextPage ? (
                        <div className="flex flex-col items-center">
                            <span className="text-sm text-gray-500">
                                Showing {posts.length} of {totalCount} posts
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2"
                                onClick={() => fetchNextPage()}
                            >
                                <ChevronDown className="mr-1 h-4 w-4" />
                                Load more
                            </Button>
                            {/* Debug info */}
                            {process.env.NODE_ENV === 'development' && (
                                <div className="mt-2 text-xs text-gray-400">
                                    offset: {offset}, hasNextPage:{' '}
                                    {hasNextPage.toString()}, totalCount:{' '}
                                    {totalCount}
                                </div>
                            )}
                        </div>
                    ) : posts.length > 0 ? (
                        <span className="text-sm text-gray-500">
                            All posts loaded
                        </span>
                    ) : (
                        <span className="text-sm text-gray-500">
                            No posts found
                        </span>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="px-4 py-2 md:px-0 md:py-4">
            <div className="mb-4">
                {/* Mobile-optimized header */}
                <div className="mb-4 space-y-3 sm:flex sm:items-center sm:justify-between sm:space-y-0">
                    {/* Filter dropdown */}
                    <div className="flex items-center">
                        <Select
                            value={selectedCommunity}
                            onValueChange={(value) =>
                                handleCommunityFilterChange(value)
                            }
                        >
                            <SelectTrigger className="w-full sm:w-[180px]">
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

                    {/* Create Post button */}
                    {session && (
                        <Button size="sm" asChild className="w-full sm:w-auto">
                            <Link href="/posts/new">
                                <PlusCircleIcon className="mr-2 h-4 w-4" />
                                New Post
                            </Link>
                        </Button>
                    )}
                </div>

                {/* Feed info banner */}
                <div className="border-border/40 bg-muted/30 mb-4 flex items-center justify-between rounded-lg border px-4 py-2.5">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 flex h-6 w-6 items-center justify-center rounded-full">
                            <Building className="text-primary h-3 w-3" />
                        </div>
                        <p className="text-muted-foreground text-sm font-medium">
                            <span className="hidden sm:inline">
                                Showing posts from your organization and
                                communities
                            </span>
                            <span className="sm:hidden">Your feed</span>
                        </p>
                    </div>
                    <div className="text-muted-foreground flex items-center gap-1 text-xs">
                        <span className="hidden md:inline">
                            {totalCount} posts
                        </span>
                        <div className="bg-muted-foreground/50 hidden h-1 w-1 rounded-full md:block"></div>
                        <span className="hidden md:inline">Live feed</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row">
                {/* Main content area */}
                <div className="w-full lg:flex-1">{renderPosts()}</div>

                {/* Right sidebar - hidden on mobile, shown on large screens */}
                <div className="hidden w-80 shrink-0 lg:block xl:w-96">
                    <div className="scrollbar-thin scrollbar-thumb-rounded-md scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent sticky top-4 max-h-[calc(100vh-2rem)] space-y-4 overflow-y-auto pr-2">
                        {/* Your Communities Section */}
                        {userCommunities.length > 0 ? (
                            <div className="overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
                                <div className="bg-gray-50 px-4 py-3 dark:bg-gray-800">
                                    <span className="font-medium dark:text-white">
                                        Your Community
                                    </span>
                                </div>

                                {userCommunitiesQuery.isLoading ? (
                                    <div className="p-4 dark:bg-gray-900">
                                        <div className="space-y-3">
                                            {[1, 2, 3].map((i) => (
                                                <div
                                                    key={i}
                                                    className="flex items-center space-x-3"
                                                >
                                                    <Skeleton className="h-8 w-8 rounded-full" />
                                                    <Skeleton className="h-4 w-40" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-2 dark:bg-gray-900">
                                        {userCommunities.map((community) => (
                                            <Link
                                                key={community.id}
                                                href={`/communities/${community.slug}`}
                                                className="flex items-center space-x-3 rounded-md p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                                            >
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage
                                                        src={
                                                            community.avatar ||
                                                            undefined
                                                        }
                                                        alt={community.name}
                                                    />
                                                    <AvatarFallback className="bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                                        {community.name
                                                            .substring(0, 2)
                                                            .toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-sm font-medium dark:text-white">
                                                        {community.name}
                                                    </span>
                                                    {(community.userRole ===
                                                        'admin' ||
                                                        community.userRole ===
                                                            'moderator') && (
                                                        <div
                                                            className={`flex items-center rounded-full px-1.5 py-0.5 text-xs ${
                                                                community.userRole ===
                                                                'admin'
                                                                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                                                    : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                                            }`}
                                                            title={`You are a ${community.userRole}`}
                                                        >
                                                            <ShieldCheck className="mr-0.5 h-3 w-3" />
                                                            {community.userRole ===
                                                            'admin'
                                                                ? 'Admin'
                                                                : 'Mod'}
                                                        </div>
                                                    )}
                                                </div>
                                            </Link>
                                        ))}
                                        <div className="mt-2 px-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full"
                                                asChild
                                            >
                                                <Link href="/communities">
                                                    Browse Communities
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Building className="h-5 w-5" />
                                        Organization
                                    </CardTitle>
                                    <CardDescription>
                                        Your organization information
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {userProfileQuery.isLoading ? (
                                        <div className="space-y-3">
                                            <Skeleton className="h-6 w-40" />
                                            <Skeleton className="h-5 w-32" />
                                            <Skeleton className="h-5 w-36" />
                                        </div>
                                    ) : userProfileQuery.data ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-12 w-12">
                                                    <AvatarFallback className="bg-primary/10">
                                                        {getInitials(
                                                            userProfileQuery
                                                                .data
                                                                ?.orgName ||
                                                                'OR',
                                                        )}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <h3 className="font-medium">
                                                        {userProfileQuery.data
                                                            ?.orgName ||
                                                            'Organization'}
                                                    </h3>
                                                    <p className="text-muted-foreground text-sm">
                                                        Organization
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="pt-2">
                                                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                                                    <Mail className="h-4 w-4" />
                                                    {
                                                        userProfileQuery.data
                                                            ?.email
                                                    }
                                                </p>
                                                <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                                                    <CalendarDays className="h-4 w-4" />
                                                    Joined as member
                                                </p>
                                            </div>

                                            {/* Admin emails section */}
                                            {admins && admins.length > 0 && (
                                                <div className="mt-3 border-t pt-2">
                                                    <h4 className="mb-2 flex items-center text-sm font-medium">
                                                        <ShieldCheck className="mr-1.5 h-4 w-4" />
                                                        Admin Contacts
                                                    </h4>
                                                    <div className="space-y-1">
                                                        {admins.map((admin) => (
                                                            <p
                                                                key={admin.id}
                                                                className="text-muted-foreground flex items-center gap-2 text-xs"
                                                            >
                                                                <Mail className="h-3 w-3" />
                                                                {admin.email}
                                                            </p>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground">
                                            Unable to load organization details
                                        </p>
                                    )}
                                </CardContent>
                                <CardHeader className="border-t pt-4">
                                    <CardTitle className="text-lg">
                                        Statistics
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {statsQuery.isLoading ? (
                                        <div className="space-y-2">
                                            <Skeleton className="h-5 w-28" />
                                            <Skeleton className="h-5 w-24" />
                                            <Skeleton className="h-5 w-32" />
                                        </div>
                                    ) : stats ? (
                                        <div className="space-y-2">
                                            <p className="flex items-center justify-between">
                                                <span className="text-muted-foreground">
                                                    Members:
                                                </span>
                                                <span className="font-medium">
                                                    {stats.totalUsers}
                                                </span>
                                            </p>
                                            <p className="flex items-center justify-between">
                                                <span className="text-muted-foreground">
                                                    Posts:
                                                </span>
                                                <span className="font-medium">
                                                    {stats.totalPosts}
                                                </span>
                                            </p>
                                            <p className="flex items-center justify-between">
                                                <span className="text-muted-foreground">
                                                    Communities:
                                                </span>
                                                <span className="font-medium">
                                                    {stats.totalCommunities}
                                                </span>
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground">
                                            Unable to load statistics
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>

                {/* Mobile community access - show at bottom on small screens */}
                <div className="lg:hidden">
                    {userCommunities.length > 0 && (
                        <div className="mt-6 overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
                            <div className="bg-gray-50 px-4 py-3 dark:bg-gray-800">
                                <span className="font-medium dark:text-white">
                                    Your Communities
                                </span>
                            </div>
                            <div className="p-2 dark:bg-gray-900">
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    {userCommunities
                                        .slice(0, 6)
                                        .map((community) => (
                                            <Link
                                                key={community.id}
                                                href={`/communities/${community.slug}`}
                                                className="flex items-center space-x-2 rounded-md p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                                            >
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage
                                                        src={
                                                            community.avatar ||
                                                            undefined
                                                        }
                                                        alt={community.name}
                                                    />
                                                    <AvatarFallback className="bg-gray-200 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                                        {community.name
                                                            .substring(0, 2)
                                                            .toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="truncate text-xs font-medium dark:text-white">
                                                    {community.name}
                                                </span>
                                            </Link>
                                        ))}
                                </div>
                                <div className="mt-3 px-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        asChild
                                    >
                                        <Link href="/communities">
                                            Browse All Communities
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
