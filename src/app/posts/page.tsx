'use client';
import Link from 'next/link';
import type React from 'react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { trpc } from '@/providers/trpc-provider';
import { useSession } from '@/server/auth/client';
import { Button } from '@/components/ui/button';
import { ChevronDown, Loader2, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { posts, users, communities, comments } from '@/server/db/schema';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { PostsFilter } from '@/components/post-filter';
import { usePermission } from '@/hooks/use-permission';
import { PERMISSIONS } from '@/lib/permissions/permission-const';
import { Input } from '@/components/ui/input';
import { SortSelect, type SortOption } from '@/components/ui/sort-select';
import { DateFilterState } from '@/components/date-filter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import PostSkeleton from '@/components/posts/PostSkeleton';
import PostCard from '@/components/posts/PostCard';
import { useSavedPostsSync } from '@/hooks/use-saved-posts-sync';
import { formatRelativeTime } from '@/lib/utils';

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

type PostTag = {
    id: number;
    name: string;
    color?: string;
};

export type PostDisplay = PostFromDb & {
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
    tags?: PostTag[]; // Add tags to the type
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
    }>; // Add attachments to the type
    poll?: {
        id: number;
        postId: number;
        question: string;
        pollType: string;
        expiresAt: Date | null;
        isClosed: boolean;
        createdAt: Date;
        updatedAt: Date;
        options: Array<{
            id: number;
            pollId: number;
            text: string;
            orderIndex: number;
            createdAt: Date;
        }>;
    } | null; // Add poll to the type
    likeCount?: number; // Add like count
    isLiked?: boolean; // Add user's like status
    isSaved?: boolean; // Add user's saved status
};

// Filter state type
type FilterState = {
    communities: number[];
    tags: number[];
    showOrgOnly: boolean;
    showMyPosts: boolean;
    dateFilter: DateFilterState;
};

// PostSkeleton moved to src/components/posts/PostSkeleton

function getInitials(name: string): string {
    if (!name) return '';
    const words = name.trim().split(' ');
    if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
    }
    return (words[0][0] + words[1][0]).toUpperCase();
}

// Utility function to prevent event propagation
const preventEventPropagation = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
};

export default function PostsPage() {
    const sessionData = useSession();
    const session = sessionData.data;
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);
    const [expandedCommentPostIds, setExpandedCommentPostIds] = useState<
        Set<number>
    >(new Set());

    // Use the custom hook for cross-page synchronization
    useSavedPostsSync();

    // State for infinite scrolling
    const [posts, setPosts] = useState<PostDisplay[]>([]);
    const [offset, setOffset] = useState(0);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

    // Filter state
    const [activeFilters, setActiveFilters] = useState<FilterState>({
        communities: [],
        tags: [],
        showOrgOnly: false,
        showMyPosts: false,
        dateFilter: { type: 'all' },
    });

    // Sort state
    const [sortOption, setSortOption] = useState<SortOption>('latest');

    // Tab state
    const [activeTab, setActiveTab] = useState<'for-me' | 'from-communities'>(
        'for-me',
    );

    // Fixed search state - separate input value from search term
    const [searchInputValue, setSearchInputValue] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<PostDisplay[] | null>(
        null,
    );
    const [isSearching, setIsSearching] = useState(false);

    const utils = trpc.useUtils();
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const { checkCommunityPermission } = usePermission();

    // Handle like changes from LikeButton
    const handleLikeChange = useCallback(
        (postId: number, isLiked: boolean, likeCount: number) => {
            setPosts((prev) =>
                prev.map((post) =>
                    post.id === postId ? { ...post, isLiked, likeCount } : post,
                ),
            );
        },
        [],
    );

    // Set isClient to true after component mounts
    useEffect(() => {
        setIsClient(true);
    }, []);

    const canEditPost = (post: PostDisplay) => {
        if (!session) return false;

        // Check if user is the post author
        if (post.author && post.author.id === session.user.id) return true;

        // Check community permissions for non-community posts or community-based permissions
        if (!post.communityId) {
            return false;
        }
        return checkCommunityPermission(
            post.communityId.toString(),
            PERMISSIONS.EDIT_POST,
            post.community?.orgId, // Pass community's orgId for org admin validation
        );
    };

    const canDeletePost = (post: PostDisplay) => {
        if (!session) return false;

        // Check if user is the post author
        if (post.author && post.author.id === session.user.id) return true;

        // Check community permissions for non-community posts or community-based permissions
        if (!post.communityId) {
            return false;
        }
        return checkCommunityPermission(
            post.communityId.toString(),
            PERMISSIONS.DELETE_POST,
            post.community?.orgId, // Pass community's orgId for org admin validation
        );
    };

    const canInteractWithPost = (post: PostDisplay) => {
        if (!session) return false;

        // For org posts, user can always interact
        if (!post.communityId) return true;

        // For public community posts shown to non-members, block interactions
        if (post.source?.reason === 'Based on your interests') {
            return false;
        }

        // For other community posts, user can interact
        return true;
    };

    // Use different queries based on active tab
    const forMePostsQuery = trpc.community.getForMePosts.useQuery(
        {
            limit: 10,
            offset: 0,
            sort: sortOption,
            dateFilter: activeFilters.dateFilter,
        },
        {
            staleTime: 30 * 1000, // Cache for 30 seconds
            refetchOnWindowFocus: false, // Don't refetch on window focus
        },
    );

    const fromCommunitiesPostsQuery =
        trpc.community.getMemberCommunityPosts.useQuery(
            {
                limit: 10,
                offset: 0,
                sort: sortOption,
                dateFilter: activeFilters.dateFilter,
            },
            {
                staleTime: 30 * 1000, // Cache for 30 seconds
                refetchOnWindowFocus: false, // Don't refetch on window focus
            },
        );

    // Use the appropriate query based on active tab
    const postsQuery =
        activeTab === 'for-me' ? forMePostsQuery : fromCommunitiesPostsQuery;

    // Function to fetch more posts
    const fetchNextPage = useCallback(async () => {
        if (!session || !hasNextPage || isFetchingNextPage) return;

        setIsFetchingNextPage(true);
        try {
            const queryToUse =
                activeTab === 'for-me'
                    ? 'getForMePosts'
                    : 'getMemberCommunityPosts';
            const data = await utils.community[queryToUse].fetch({
                limit: 10,
                offset: offset,
                sort: sortOption,
                dateFilter: activeFilters.dateFilter,
            });

            // Get like counts and user reactions for new posts
            const newPostIds = data.posts.map((post) => post.id);
            const [likeCounts, userReactions] = await Promise.all([
                utils.community.getPostLikeCounts.fetch({
                    postIds: newPostIds,
                }),
                session
                    ? utils.community.getUserReactions.fetch({
                          postIds: newPostIds,
                      })
                    : Promise.resolve({}),
            ]);

            const postsWithLikes = data.posts.map((post) => ({
                ...post,
                likeCount: likeCounts[post.id] || 0,
                isLiked:
                    (userReactions as Record<number, boolean>)[post.id] ||
                    false,
            }));

            setPosts((prev) => [...prev, ...postsWithLikes]);
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
        sortOption,
        activeTab,
        utils.community.getForMePosts,
        utils.community.getAllRelevantPosts,
        utils.community.getPostLikeCounts,
        utils.community.getUserReactions,
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

    // Get like counts for all posts
    const postIds = useMemo(() => posts.map((post) => post.id), [posts]);
    const likeCountsQuery = trpc.community.getPostLikeCounts.useQuery(
        { postIds },
        {
            enabled: postIds.length > 0,
            staleTime: 30 * 1000, // Cache for 30 seconds
            refetchOnWindowFocus: false, // Only refetch on manual actions
        },
    );

    // Get user's reaction status for all posts
    const userReactionsQuery = trpc.community.getUserReactions.useQuery(
        { postIds },
        {
            enabled: postIds.length > 0 && !!session,
            staleTime: 30 * 1000, // Cache for 30 seconds
            refetchOnWindowFocus: false, // Only refetch on manual actions
        },
    );

    // Get user's saved status for all posts
    const userSavedMapQuery = trpc.community.getUserSavedMap.useQuery(
        { postIds },
        {
            enabled: postIds.length > 0 && !!session,
            staleTime: 60 * 1000, // Cache for 1 minute
            refetchOnWindowFocus: false, // Only refetch on manual actions
        },
    );

    // Update posts with like/saved data only when new values are present (avoid flicker)
    useEffect(() => {
        setPosts((prevPosts) =>
            prevPosts.map((post) => {
                const next = { ...post } as PostDisplay;
                if (likeCountsQuery.data && post.id in likeCountsQuery.data) {
                    next.likeCount = likeCountsQuery.data[post.id] ?? 0;
                }
                if (
                    userReactionsQuery.data &&
                    post.id in userReactionsQuery.data
                ) {
                    next.isLiked = userReactionsQuery.data[post.id] ?? false;
                }
                if (
                    userSavedMapQuery.data &&
                    post.id in userSavedMapQuery.data
                ) {
                    next.isSaved = userSavedMapQuery.data[post.id] ?? false;
                }
                return next;
            }),
        );
    }, [likeCountsQuery.data, userReactionsQuery.data, userSavedMapQuery.data]);

    // Reset and update posts when tab or query data changes
    useEffect(() => {
        if (postsQuery.data) {
            setPosts(postsQuery.data.posts);
            setOffset(postsQuery.data.posts.length);
            setHasNextPage(postsQuery.data.hasNextPage);
            setTotalCount(postsQuery.data.totalCount);
        }
    }, [activeTab, postsQuery.data]);

    // Clear list and invalidate when switching tabs
    useEffect(() => {
        setPosts([]);
        setOffset(0);
        setHasNextPage(true);
        if (activeTab === 'for-me') {
            utils.community.getForMePosts.invalidate();
        } else {
            utils.community.getMemberCommunityPosts.invalidate();
        }
    }, [
        activeTab,
        utils.community.getForMePosts,
        utils.community.getMemberCommunityPosts,
    ]);

    const deletePostMutation = trpc.community.deletePost.useMutation({
        onSuccess: () => {
            // Reset pagination and refetch
            setPosts([]);
            setOffset(0);
            setHasNextPage(true);
            // Invalidate the posts query to refresh the list
            if (activeTab === 'for-me') {
                utils.community.getForMePosts.invalidate();
            } else {
                utils.community.getMemberCommunityPosts.invalidate();
            }
        },
    });

    const savePostMutation = trpc.community.savePost.useMutation({
        onMutate: (variables) => {
            // Optimistically update the UI
            setPosts((prev) =>
                prev.map((p) =>
                    p.id === variables.postId ? { ...p, isSaved: true } : p,
                ),
            );
        },
        onSuccess: (_data, variables) => {
            // Invalidate saved posts query to update saved page
            utils.community.getSavedPosts.invalidate();
            toast.success('Saved');
        },
        onError: (_error, variables) => {
            // Revert optimistic update on error
            setPosts((prev) =>
                prev.map((p) =>
                    p.id === variables.postId ? { ...p, isSaved: false } : p,
                ),
            );
            toast.error('Failed to save');
        },
    });

    const unsavePostMutation = trpc.community.unsavePost.useMutation({
        onMutate: (variables) => {
            // Optimistically update the UI
            setPosts((prev) =>
                prev.map((p) =>
                    p.id === variables.postId ? { ...p, isSaved: false } : p,
                ),
            );
        },
        onSuccess: (_data, variables) => {
            // Invalidate saved posts query to update saved page
            utils.community.getSavedPosts.invalidate();
            toast.success('Removed from saved');
        },
        onError: (_error, variables) => {
            // Revert optimistic update on error
            setPosts((prev) =>
                prev.map((p) =>
                    p.id === variables.postId ? { ...p, isSaved: true } : p,
                ),
            );
            toast.error('Failed to unsave');
        },
    });

    // Join community from feed (for public community posts)
    const [joiningCommunityId, setJoiningCommunityId] = useState<number | null>(
        null,
    );
    const joinCommunityMutation = trpc.communities.joinCommunity.useMutation({
        onSuccess: (result) => {
            setJoiningCommunityId(null);
            toast.success(
                result.status === 'approved'
                    ? "You've joined the community!"
                    : 'Join request sent! Waiting for admin approval.',
            );
            // Refresh feeds
            utils.community.getForMePosts.invalidate();
            utils.community.getMemberCommunityPosts.invalidate();
        },
        onError: (error) => {
            setJoiningCommunityId(null);
            toast.error(error.message || 'Failed to join community');
        },
    });

    const handleJoinCommunity = (communityId: number) => {
        if (joiningCommunityId) return;
        setJoiningCommunityId(communityId);
        joinCommunityMutation.mutate({ communityId });
    };

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

    // Extract all unique tags from posts
    const availableTags = useMemo(() => {
        const tagMap = new Map();
        if (posts) {
            posts.forEach((post: PostDisplay) => {
                if (post.tags) {
                    post.tags.forEach((tag: PostTag) => {
                        if (!tagMap.has(tag.id)) {
                            tagMap.set(tag.id, tag);
                        }
                    });
                }
            });
        }
        return Array.from(tagMap.values()) as PostTag[];
    }, [posts]);

    // Filter posts based on active filters
    const filteredPosts = useMemo(() => {
        let filtered = posts || [];

        // Filter by organization only
        if (activeFilters.showOrgOnly) {
            filtered = filtered.filter(
                (post: PostDisplay) => post.source?.type === 'org',
            );
        }

        // Filter by My Posts (posts by the current user)
        if (activeFilters.showMyPosts) {
            filtered = filtered.filter(
                (post: PostDisplay) => post.author?.id === session?.user?.id,
            );
        }

        // Filter by communities
        if (activeFilters.communities.length > 0) {
            filtered = filtered.filter(
                (post: PostDisplay) =>
                    post.community &&
                    activeFilters.communities.includes(post.community.id),
            );
        }

        // Filter by tags
        if (activeFilters.tags.length > 0) {
            filtered = filtered.filter(
                (post: PostDisplay) =>
                    post.tags &&
                    post.tags.some((tag: PostTag) =>
                        activeFilters.tags.includes(tag.id),
                    ),
            );
        }

        // Date filtering is now handled on the backend

        return filtered;
    }, [posts, activeFilters, session?.user?.id]);

    const handleFilterChange = (filters: FilterState) => {
        setActiveFilters(filters);
    };

    // Fixed debounced search handler
    const handleSearchInputChange = useCallback((value: string) => {
        setSearchInputValue(value);

        // Clear existing timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Set new timer
        debounceTimerRef.current = setTimeout(() => {
            setSearchTerm(value.trim());
        }, 300);
    }, []);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    // Search API call with proper enabled condition
    const searchQuery = trpc.community.searchRelevantPost.useQuery(
        {
            search: searchTerm,
            limit: 50,
            offset: 0,
            sort: sortOption,
            dateFilter: activeFilters.dateFilter,
        }, // Increased limit for better search results
        {
            enabled: !!searchTerm && searchTerm.length >= 2, // Only search if term is at least 2 characters
            staleTime: 5 * 60 * 1000, // Cache results for 5 minutes
            refetchOnWindowFocus: false, // Don't refetch on window focus
        },
    );

    // Listen for search results
    useEffect(() => {
        if (searchTerm.length >= 2) {
            if (searchQuery.data) {
                setSearchResults(searchQuery.data.posts);
                setIsSearching(false); // Set to false when we have results
            } else if (searchQuery.isLoading) {
                setIsSearching(true); // Only set to true when actually loading
            }
        } else {
            setIsSearching(false);
            setSearchResults(null);
        }
    }, [searchTerm, searchQuery.data, searchQuery.isLoading]);

    // Clear search when input is cleared
    useEffect(() => {
        if (searchInputValue.length === 0) {
            setSearchTerm('');
            setSearchResults(null);
            setIsSearching(false);
        }
    }, [searchInputValue]);

    // Use searchResults if searching, else use filteredPosts
    const postsToRender =
        isSearching && searchResults !== null ? searchResults : filteredPosts;

    const renderPosts = () => {
        // Show loading skeleton only during initial load, not during search or other operations
        if (isLoading && posts.length === 0) {
            return <PostSkeleton />;
        }

        // Show loading only for search if we're actively searching and have no results yet
        if (isSearching && searchQuery.isLoading && !searchResults) {
            return <PostSkeleton />;
        }

        if (!postsToRender || postsToRender.length === 0) {
            return (
                <div className="p-4 text-center">
                    <p className="text-muted-foreground mb-4">
                        {isSearching
                            ? `No posts found for "${searchInputValue}"`
                            : activeFilters.communities.length > 0 ||
                                activeFilters.tags.length > 0 ||
                                activeFilters.showOrgOnly ||
                                activeFilters.showMyPosts
                              ? 'No posts match your current filters.'
                              : 'No posts found. Join more communities to see posts here.'}
                    </p>
                    {isSearching ? (
                        <Button
                            onClick={() => {
                                setSearchInputValue('');
                                setSearchTerm('');
                            }}
                        >
                            Clear Search
                        </Button>
                    ) : activeFilters.communities.length > 0 ||
                      activeFilters.tags.length > 0 ||
                      activeFilters.showOrgOnly ||
                      activeFilters.showMyPosts ? (
                        <Button
                            onClick={() =>
                                setActiveFilters({
                                    communities: [],
                                    tags: [],
                                    showOrgOnly: false,
                                    showMyPosts: false,
                                    dateFilter: { type: 'all' },
                                })
                            }
                        >
                            Clear Filters
                        </Button>
                    ) : (
                        <Button asChild>
                            <Link href="/communities">Browse Communities</Link>
                        </Button>
                    )}
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {postsToRender.map((post: PostDisplay) => {
                    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}${post.community ? `/communities/${post.community.slug}/posts/${post.id}` : `/posts/${post.id}`}`;
                    const isExpanded = expandedCommentPostIds.has(post.id);
                    return (
                        <PostCard
                            key={post.id}
                            post={post}
                            session={session}
                            canEdit={canEditPost(post)}
                            canDelete={canDeletePost(post)}
                            canInteract={canInteractWithPost(post)}
                            onEdit={() => {
                                router.push(
                                    post.community
                                        ? `/communities/${post.community.slug}/posts/${post.id}/edit`
                                        : `/posts/${post.id}/edit`,
                                );
                            }}
                            onDelete={(e) =>
                                handleDeletePost(
                                    post.id,
                                    e as unknown as React.MouseEvent,
                                )
                            }
                            onAuthorClick={() => {
                                if (post.author?.id) {
                                    router.push(
                                        `/userProfile-details/${post.author.id}`,
                                    );
                                }
                            }}
                            onCommunityClick={() => {
                                if (post.community?.slug) {
                                    router.push(
                                        `/communities/${post.community.slug}`,
                                    );
                                }
                            }}
                            isCommentsExpanded={isExpanded}
                            onToggleComments={() => {
                                setExpandedCommentPostIds((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(post.id)) next.delete(post.id);
                                    else next.add(post.id);
                                    return next;
                                });
                            }}
                            onToggleSave={() => {
                                if (!session) return;
                                if (post.isSaved) {
                                    unsavePostMutation.mutate({
                                        postId: post.id,
                                    });
                                } else {
                                    savePostMutation.mutate({
                                        postId: post.id,
                                    });
                                }
                            }}
                            shareUrl={shareUrl}
                            formatRelativeTime={formatRelativeTime}
                            joiningCommunityId={joiningCommunityId}
                            isJoinPending={joinCommunityMutation.isPending}
                            onJoinCommunity={handleJoinCommunity}
                            onLikeChange={handleLikeChange}
                        />
                    );
                })}

                {/* Only show infinite scroll controls when not searching */}
                {!isSearching && (
                    <div ref={loadMoreRef} className="py-4 text-center">
                        {isFetchingNextPage ? (
                            <div className="flex items-center justify-center space-x-2">
                                <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                                <span className="text-muted-foreground text-sm">
                                    Loading more posts...
                                </span>
                            </div>
                        ) : hasNextPage ? (
                            <div className="flex flex-col items-center">
                                <span className="text-muted-foreground text-sm">
                                    Showing {filteredPosts.length} of{' '}
                                    {totalCount} posts
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
                                    <div className="text-muted-foreground mt-2 text-xs">
                                        offset: {offset}, hasNextPage:{' '}
                                        {hasNextPage.toString()}, totalCount:{' '}
                                        {totalCount}
                                    </div>
                                )}
                            </div>
                        ) : filteredPosts.length > 0 ? (
                            <span className="text-muted-foreground text-sm"></span>
                        ) : (
                            <span className="text-muted-foreground text-sm">
                                No posts found
                            </span>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Handle sort change
    const handleSortChange = (newSort: SortOption) => {
        setSortOption(newSort);
        // Reset pagination when sort changes
        setPosts([]);
        setOffset(0);
        setHasNextPage(true);
        // Invalidate both the posts query and search query to refresh with new sort
        if (activeTab === 'for-me') {
            utils.community.getForMePosts.invalidate();
        } else {
            utils.community.getMemberCommunityPosts.invalidate();
        }
        utils.community.searchRelevantPost.invalidate();
    };

    // Handle date filter change
    const handleDateFilterChange = (dateFilter: DateFilterState) => {
        setActiveFilters((prev) => ({ ...prev, dateFilter }));
        // Reset pagination when date filter changes
        setPosts([]);
        setOffset(0);
        setHasNextPage(true);
        // Invalidate queries to refresh with new date filter
        if (activeTab === 'for-me') {
            utils.community.getForMePosts.invalidate();
        } else {
            utils.community.getAllRelevantPosts.invalidate();
        }
        utils.community.searchRelevantPost.invalidate();
    };

    return (
        <div className="py-4">
            <div className="mb-4">
                {/* Header with tabs and search */}
                <div className="mb-4">
                    <Tabs
                        value={activeTab}
                        onValueChange={(value) =>
                            setActiveTab(value as 'for-me' | 'from-communities')
                        }
                    >
                        {/* Constrain header to post column width (subtract right sidebar on md+/lg+) */}
                        <div className="md:mr-auto md:max-w-[calc(100%-20rem)] lg:max-w-[calc(100%-24rem)]">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="for-me">For me</TabsTrigger>
                                <TabsTrigger value="from-communities">
                                    From my Communities
                                </TabsTrigger>
                            </TabsList>
                            {/* Filters below tabs, in one row, constrained to post column */}
                            <div className="mt-2 flex w-full flex-wrap items-center gap-2">
                                <div className="min-w-0 flex-1 md:basis-1/3">
                                    <div className="relative">
                                        <Input
                                            type="text"
                                            placeholder="Search..."
                                            className="h-8 w-full pr-9 text-sm"
                                            value={searchInputValue}
                                            onChange={(e) =>
                                                handleSearchInputChange(
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        <Search className="text-muted-foreground absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2" />
                                    </div>
                                </div>
                                <div className="md:basis-auto">
                                    <SortSelect
                                        value={sortOption}
                                        onValueChange={handleSortChange}
                                    />
                                </div>
                                <div className="md:basis-auto">
                                    <PostsFilter
                                        userCommunities={userCommunities.map(
                                            (c) => ({
                                                ...c,
                                                userRole: c.userRole as
                                                    | 'admin'
                                                    | 'moderator'
                                                    | 'member'
                                                    | 'follower'
                                                    | undefined,
                                            }),
                                        )}
                                        availableTags={availableTags}
                                        onFilterChange={handleFilterChange}
                                        onDateFilterChange={
                                            handleDateFilterChange
                                        }
                                        isLoading={isLoading}
                                    />
                                </div>
                            </div>
                        </div>

                        <TabsContent value="for-me" className="mt-4">
                            <div className="flex flex-col gap-4 md:flex-row">
                                {/* Main content area */}
                                <div className="flex-1">{renderPosts()}</div>

                                {/* Right sidebar */}
                                <div className="w-full shrink-0 md:w-80 lg:w-96">
                                    <div className="scrollbar-thin scrollbar-thumb-rounded-md scrollbar-thumb-muted scrollbar-track-transparent sticky top-4 max-h-[calc(100vh-2rem)] space-y-4 overflow-y-auto pr-2">
                                        {/* Your Communities Section */}
                                        {userCommunities.length > 0 && (
                                            <div className="overflow-hidden rounded-md border">
                                                <div className="bg-muted/50 px-4 py-3">
                                                    <span className="font-medium">
                                                        Your Community
                                                    </span>
                                                </div>
                                                {userCommunitiesQuery.isLoading ? (
                                                    <div className="p-4">
                                                        <div className="space-y-3">
                                                            {[1, 2, 3].map(
                                                                (i) => (
                                                                    <div
                                                                        key={i}
                                                                        className="flex items-center space-x-3"
                                                                    >
                                                                        <Skeleton className="h-8 w-8 rounded-full" />
                                                                        <Skeleton className="h-4 w-40" />
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="p-2">
                                                        {userCommunities.map(
                                                            (community) => (
                                                                <Link
                                                                    key={
                                                                        community.id
                                                                    }
                                                                    href={`/communities/${community.slug}`}
                                                                    className="hover:bg-accent flex items-center space-x-3 rounded-md p-2 transition-colors"
                                                                >
                                                                    <Avatar className="h-8 w-8">
                                                                        <AvatarImage
                                                                            src={
                                                                                community.avatar ||
                                                                                undefined
                                                                            }
                                                                            alt={
                                                                                community.name
                                                                            }
                                                                        />
                                                                        <AvatarFallback className="bg-muted">
                                                                            {community.name
                                                                                .substring(
                                                                                    0,
                                                                                    2,
                                                                                )
                                                                                .toUpperCase()}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-sm font-medium">
                                                                            {
                                                                                community.name
                                                                            }
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
                                                            ),
                                                        )}
                                                        <div className="mt-2 px-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="w-full bg-transparent"
                                                                asChild
                                                            >
                                                                <Link href="/communities">
                                                                    Browse
                                                                    Communities
                                                                </Link>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="from-communities" className="mt-4">
                            <div className="flex flex-col gap-4 md:flex-row">
                                {/* Main content area */}
                                <div className="flex-1">{renderPosts()}</div>

                                {/* Right sidebar */}
                                <div className="w-full shrink-0 md:w-80 lg:w-96">
                                    <div className="scrollbar-thin scrollbar-thumb-rounded-md scrollbar-thumb-muted scrollbar-track-transparent sticky top-4 max-h-[calc(100vh-2rem)] space-y-4 overflow-y-auto pr-2">
                                        {/* Your Communities Section */}
                                        {userCommunities.length > 0 && (
                                            <div className="overflow-hidden rounded-md border">
                                                <div className="bg-muted/50 px-4 py-3">
                                                    <span className="font-medium">
                                                        Your Community
                                                    </span>
                                                </div>
                                                {userCommunitiesQuery.isLoading ? (
                                                    <div className="p-4">
                                                        <div className="space-y-3">
                                                            {[1, 2, 3].map(
                                                                (i) => (
                                                                    <div
                                                                        key={i}
                                                                        className="flex items-center space-x-3"
                                                                    >
                                                                        <Skeleton className="h-8 w-8 rounded-full" />
                                                                        <Skeleton className="h-4 w-40" />
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="p-2">
                                                        {userCommunities.map(
                                                            (community) => (
                                                                <Link
                                                                    key={
                                                                        community.id
                                                                    }
                                                                    href={`/communities/${community.slug}`}
                                                                    className="hover:bg-accent flex items-center space-x-3 rounded-md p-2 transition-colors"
                                                                >
                                                                    <Avatar className="h-8 w-8">
                                                                        <AvatarImage
                                                                            src={
                                                                                community.avatar ||
                                                                                undefined
                                                                            }
                                                                            alt={
                                                                                community.name
                                                                            }
                                                                        />
                                                                        <AvatarFallback className="bg-muted">
                                                                            {community.name
                                                                                .substring(
                                                                                    0,
                                                                                    2,
                                                                                )
                                                                                .toUpperCase()}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-sm font-medium">
                                                                            {
                                                                                community.name
                                                                            }
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
                                                            ),
                                                        )}
                                                        <div className="mt-2 px-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="w-full bg-transparent"
                                                                asChild
                                                            >
                                                                <Link href="/communities">
                                                                    Browse
                                                                    Communities
                                                                </Link>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
