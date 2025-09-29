'use client';

import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Building,
    Users,
    Plus,
    MessageSquare,
    Edit,
    Trash2,
    Ellipsis,
    Bookmark,
} from 'lucide-react';
import { ShareButton } from '@/components/ui/share-button';
import { LikeButton } from '@/components/ui/like-button';
import Link from 'next/link';
import { UserProfilePopover } from '@/components/ui/user-profile-popover';
import { SafeHtml } from '@/lib/sanitize';
import { ImageCarousel } from '@/components/ui/image-carousel';
import { SafeHtmlWithoutImages } from '@/components/ui/safe-html-without-images';
import { DateFilter, type DateFilterState } from '@/components/date-filter';
import { trpc } from '@/providers/trpc-provider';
import { useSession } from '@/server/auth/client';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { CommunityPopover } from '@/components/ui/community-popover';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';

interface CommunityPostsProps {
    community: any;
    isLoading: boolean;
    isMember: boolean;
    canInteract: boolean;
    canCreatePost: boolean;
    filteredPosts: any[];
    showMyPosts: boolean;
    selectedTagFilters: number[];
    dateFilter: DateFilterState;
    onDateFilterChange: (filter: DateFilterState) => void;
    onPostFilterToggle: () => void;
    onTagFilterToggle: (tagId: number) => void;
    onClearTagFilters: () => void;
    onClearPostFilter: () => void;
    onDeletePost: (postId: number, e: React.MouseEvent) => void;
    canEditPost: (post: any) => boolean;
    canDeletePost: (post: any) => boolean;
    router: any;
}

export function CommunityPosts({
    community,
    isLoading,
    isMember,
    canInteract,
    canCreatePost,
    filteredPosts,
    showMyPosts,
    selectedTagFilters,
    dateFilter,
    onDateFilterChange,
    onPostFilterToggle,
    onTagFilterToggle,
    onClearTagFilters,
    onClearPostFilter,
    onDeletePost,
    canEditPost,
    canDeletePost,
    router,
}: CommunityPostsProps) {
    const sessionData = useSession();
    const session = sessionData.data;
    const [postsWithLikes, setPostsWithLikes] = useState<any[]>([]);
    const utils = trpc.useUtils();

    // Save/unsave mutations
    const savePostMutation = trpc.community.savePost.useMutation({
        onMutate: (variables) => {
            // Optimistically update the UI
            setPostsWithLikes((prev) =>
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
            setPostsWithLikes((prev) =>
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
            setPostsWithLikes((prev) =>
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
            setPostsWithLikes((prev) =>
                prev.map((p) =>
                    p.id === variables.postId ? { ...p, isSaved: true } : p,
                ),
            );
            toast.error('Failed to unsave');
        },
    });

    // Get like counts for all posts
    const postIds = useMemo(
        () => filteredPosts.map((post) => post.id),
        [filteredPosts],
    );
    const likeCountsQuery = trpc.community.getPostLikeCounts.useQuery(
        { postIds },
        {
            enabled: postIds.length > 0,
            staleTime: 0, // Always fetch fresh data
            refetchOnWindowFocus: true,
            refetchInterval: 5 * 1000, // More frequent polling to reflect others' likes
            refetchIntervalInBackground: true, // Continue polling even when tab is not active
        },
    );

    // Get user's reaction status for all posts
    const userReactionsQuery = trpc.community.getUserReactions.useQuery(
        { postIds },
        {
            enabled: postIds.length > 0 && !!session,
            staleTime: 0, // Always fetch fresh data
            refetchOnWindowFocus: true,
            refetchInterval: 5 * 1000, // More frequent polling to reflect others' likes
            refetchIntervalInBackground: true, // Continue polling even when tab is not active
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

    // Update posts with like and saved data when queries change
    useEffect(() => {
        if (
            likeCountsQuery.data ||
            userReactionsQuery.data ||
            userSavedMapQuery.data
        ) {
            setPostsWithLikes(
                filteredPosts.map((post) => ({
                    ...post,
                    likeCount: likeCountsQuery.data?.[post.id] ?? 0,
                    isLiked: userReactionsQuery.data?.[post.id] ?? false,
                    isSaved: userSavedMapQuery.data?.[post.id] ?? false,
                })),
            );
        } else {
            setPostsWithLikes(filteredPosts);
        }
    }, [
        filteredPosts,
        likeCountsQuery.data,
        userReactionsQuery.data,
        userSavedMapQuery.data,
    ]);

    // Memoize refetch functions to prevent dependency array changes
    const refetchLikeCounts = useCallback(() => {
        utils.community.getPostLikeCounts.refetch();
    }, [utils.community.getPostLikeCounts]);

    const refetchUserReactions = useCallback(() => {
        utils.community.getUserReactions.refetch();
    }, [utils.community.getUserReactions]);

    // Refetch like data when filtered posts change
    useEffect(() => {
        if (filteredPosts.length > 0) {
            refetchLikeCounts();
            if (session) {
                refetchUserReactions();
            }
        }
    }, [
        filteredPosts.length,
        session,
        refetchLikeCounts,
        refetchUserReactions,
    ]);
    // Check if we're still loading like data
    const isLikeDataLoading =
        postsWithLikes.length > 0 && !likeCountsQuery.data;

    return (
        <TabsContent value="posts" className="mt-0 space-y-6">
            {/* Show loading skeleton while data is being fetched */}
            {isLoading || isLikeDataLoading ? (
                <div className="space-y-4">
                    {[...Array(3)].map((_, index) => (
                        <Card key={index} className="relative gap-2 py-2">
                            <div className="px-4 py-0">
                                <Skeleton className="mb-2 h-6 w-3/4" />
                                <Skeleton className="mb-2 h-4 w-full" />
                                <Skeleton className="mb-2 h-4 w-full" />
                                <Skeleton className="mb-2 h-4 w-2/3" />
                                <div className="mt-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-4 w-32" />
                                        <div className="ml-4">
                                            <Skeleton className="h-4 w-8" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <>
                    {/* Post creation restriction message - only show when there are actual restrictions */}
                    {(() => {
                        const currentRequirement =
                            community.postCreationMinRole || 'member';

                        // Only show the message if there are actual restrictions (not for 'member')
                        if (currentRequirement === 'member') {
                            return null;
                        }

                        const roleDisplay = {
                            moderator: 'Moderators and admins',
                            admin: 'Admins only',
                        };

                        return (
                            <div className="mb-4">
                                <p className="text-muted-foreground">
                                    Post creation is restricted to:{' '}
                                    <span className="font-medium">
                                        {
                                            roleDisplay[
                                                currentRequirement as keyof typeof roleDisplay
                                            ]
                                        }
                                    </span>
                                </p>
                            </div>
                        );
                    })()}

                    {/* Posts header and tag filters */}
                    <div className="mb-6 flex items-center justify-between">
                        <div className="flex flex-col">
                            <h2 className="text-xl font-semibold">Posts</h2>
                            <p className="text-muted-foreground text-sm">
                                All the posts in this community
                            </p>
                        </div>
                        {canCreatePost && (
                            <Button asChild>
                                <Link
                                    href={`/posts/new?communityId=${community.id}&communitySlug=${community.slug}`}
                                >
                                    Create Post
                                </Link>
                            </Button>
                        )}
                    </div>

                    {/* Post Filter */}
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onPostFilterToggle}
                                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                                    !showMyPosts
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                }`}
                            >
                                <Building className="h-4 w-4" />
                                All Posts
                            </button>
                            <button
                                onClick={onPostFilterToggle}
                                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                                    showMyPosts
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                }`}
                            >
                                <Users className="h-4 w-4" />
                                My Posts
                            </button>
                        </div>
                        <DateFilter
                            value={dateFilter}
                            onChange={onDateFilterChange}
                        />
                    </div>
                    {/* Tag Filter */}
                    {community.tags && community.tags.length > 0 && (
                        <div className="mt-4 mb-6">
                            <div className="flex flex-wrap gap-2">
                                {community.tags.map((tag: any) => (
                                    <button
                                        key={tag.id}
                                        onClick={() =>
                                            onTagFilterToggle(tag.id)
                                        }
                                        className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                                            selectedTagFilters.includes(tag.id)
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                        }`}
                                    >
                                        {tag.name}
                                    </button>
                                ))}
                                {selectedTagFilters.length > 0 && (
                                    <button
                                        onClick={onClearTagFilters}
                                        className="bg-muted text-muted-foreground hover:bg-muted/80 inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
                                    >
                                        Clear Filters
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Render posts for everyone (viewing allowed for non-members) */}
                    {postsWithLikes && postsWithLikes.length > 0 && (
                        <div className="space-y-4">
                            {postsWithLikes.map((post: any) => (
                                <Link
                                    key={post.id}
                                    href={`/communities/${community.slug}/posts/${post.id}`}
                                    className="block"
                                    style={{
                                        textDecoration: 'none',
                                    }}
                                >
                                    <Card className="relative gap-2 overflow-hidden p-0 transition-shadow hover:shadow-md">
                                        {/* Header: community avatar, author & community, time + actions */}
                                        <div className="border-b px-4 py-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <CommunityPopover
                                                        communityId={
                                                            community.id
                                                        }
                                                    >
                                                        <div className="flex cursor-pointer items-center">
                                                            <Avatar className="mr-2 h-6 w-6">
                                                                <AvatarImage
                                                                    src={
                                                                        community.avatar ||
                                                                        undefined
                                                                    }
                                                                />
                                                                <AvatarFallback className="text-[10px]">
                                                                    {community.name
                                                                        .substring(
                                                                            0,
                                                                            2,
                                                                        )
                                                                        .toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                        </div>
                                                    </CommunityPopover>
                                                    <div className="flex flex-col leading-tight">
                                                        <span className="text-sm font-medium">
                                                            {post.author?.id ? (
                                                                <UserProfilePopover
                                                                    userId={
                                                                        post
                                                                            .author
                                                                            .id
                                                                    }
                                                                >
                                                                    <span className="cursor-pointer hover:underline">
                                                                        {post
                                                                            .author
                                                                            ?.name ||
                                                                            'Unknown'}
                                                                    </span>
                                                                </UserProfilePopover>
                                                            ) : (
                                                                'Unknown'
                                                            )}
                                                        </span>
                                                        <span className="text-muted-foreground text-xs">
                                                            {community.name}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-muted-foreground text-xs">
                                                        {formatRelativeTime(
                                                            post.createdAt,
                                                        )}
                                                    </span>
                                                    {(canEditPost(post) ||
                                                        canDeletePost(
                                                            post,
                                                        )) && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 rounded-full"
                                                                    onClick={(
                                                                        e,
                                                                    ) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                    }}
                                                                >
                                                                    <Ellipsis className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent
                                                                align="end"
                                                                onClick={(e) =>
                                                                    e.stopPropagation()
                                                                }
                                                            >
                                                                {canEditPost(
                                                                    post,
                                                                ) && (
                                                                    <DropdownMenuItem
                                                                        onClick={(
                                                                            e,
                                                                        ) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            router.push(
                                                                                `/communities/${community.slug}/posts/${post.id}/edit`,
                                                                            );
                                                                        }}
                                                                    >
                                                                        <Edit className="mr-2 h-4 w-4" />{' '}
                                                                        Edit
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {canDeletePost(
                                                                    post,
                                                                ) && (
                                                                    <DropdownMenuItem
                                                                        onClick={(
                                                                            e,
                                                                        ) =>
                                                                            onDeletePost(
                                                                                post.id,
                                                                                e as unknown as React.MouseEvent,
                                                                            )
                                                                        }
                                                                    >
                                                                        <Trash2 className="mr-2 h-4 w-4" />{' '}
                                                                        Delete
                                                                    </DropdownMenuItem>
                                                                )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Post content */}
                                        <div className="px-4 py-0">
                                            {/* Post title */}
                                            <h3 className="mt-0 mb-2 text-base font-medium">
                                                {post.isDeleted
                                                    ? '[Deleted]'
                                                    : post.title}
                                            </h3>

                                            {/* Post content */}
                                            {post.isDeleted ? (
                                                <div className="space-y-1">
                                                    <span className="text-muted-foreground text-sm italic">
                                                        [Content deleted]
                                                    </span>
                                                    <span className="text-muted-foreground block text-xs">
                                                        Removed on{' '}
                                                        {new Date(
                                                            post.updatedAt,
                                                        ).toLocaleString()}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {/* Post description - truncated to 2 lines */}
                                                    <div className="text-muted-foreground text-sm">
                                                        {post.attachments &&
                                                        post.attachments
                                                            .length > 0 ? (
                                                            <SafeHtmlWithoutImages
                                                                html={
                                                                    post.content
                                                                }
                                                                className="line-clamp-2 overflow-hidden leading-5 text-ellipsis"
                                                            />
                                                        ) : (
                                                            <SafeHtml
                                                                html={
                                                                    post.content
                                                                }
                                                                className="line-clamp-2 overflow-hidden leading-5 text-ellipsis"
                                                            />
                                                        )}
                                                    </div>

                                                    {/* Post images */}
                                                    {post.attachments &&
                                                        post.attachments
                                                            .length > 0 && (
                                                            <ImageCarousel
                                                                images={
                                                                    post.attachments.filter(
                                                                        (
                                                                            att: any,
                                                                        ) =>
                                                                            att.type ===
                                                                            'image',
                                                                    ) as any
                                                                }
                                                                className="max-w-xs"
                                                            />
                                                        )}
                                                </div>
                                            )}

                                            {/* Tags display */}
                                            {post.tags &&
                                                post.tags.length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-1">
                                                        {post.tags
                                                            .slice(0, 3)
                                                            .map((tag: any) => (
                                                                <span
                                                                    key={tag.id}
                                                                    className="bg-secondary inline-flex items-center rounded-full px-2 py-1 text-xs font-medium"
                                                                    style={{
                                                                        backgroundColor:
                                                                            tag.color
                                                                                ? `${tag.color}20`
                                                                                : undefined,
                                                                        color:
                                                                            tag.color ||
                                                                            undefined,
                                                                    }}
                                                                >
                                                                    {tag.name}
                                                                </span>
                                                            ))}
                                                        {post.tags.length >
                                                            3 && (
                                                            <span className="bg-secondary text-muted-foreground inline-flex items-center rounded-full px-2 py-1 text-xs font-medium">
                                                                +
                                                                {post.tags
                                                                    .length -
                                                                    3}{' '}
                                                                more
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                            {/* Likes/comments summary row */}
                                            <div className="mt-2 flex items-center justify-between">
                                                {canInteract ? (
                                                    (() => {
                                                        const likeCountNum =
                                                            post.likeCount ?? 0;
                                                        const isLiked =
                                                            post.isLiked ??
                                                            false;
                                                        return (
                                                            <span className="text-muted-foreground text-xs">
                                                                {likeCountNum >
                                                                0
                                                                    ? isLiked
                                                                        ? likeCountNum ===
                                                                          1
                                                                            ? 'You liked this'
                                                                            : `You and ${likeCountNum - 1} ${likeCountNum - 1 === 1 ? 'other' : 'others'} liked this`
                                                                        : `${likeCountNum} ${likeCountNum === 1 ? 'person' : 'people'} liked this`
                                                                    : ''}
                                                            </span>
                                                        );
                                                    })()
                                                ) : (post.likeCount ?? 0) >
                                                  0 ? (
                                                    <span className="text-muted-foreground text-xs">
                                                        {post.likeCount ?? 0}{' '}
                                                        {(post.likeCount ??
                                                            0) === 1
                                                            ? 'person'
                                                            : 'people'}{' '}
                                                        liked this
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs" />
                                                )}
                                                <span className="text-muted-foreground text-xs">
                                                    {Array.isArray(
                                                        post.comments,
                                                    )
                                                        ? post.comments.length
                                                        : 0}{' '}
                                                    Comments
                                                </span>
                                            </div>

                                            {/* Bottom action bar */}
                                            {canInteract && (
                                                <>
                                                    <Separator className="my-2" />
                                                    <div className="mb-2 grid grid-cols-4">
                                                        <div
                                                            className="col-span-1 flex items-center justify-center gap-0 md:gap-2"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                            }}
                                                        >
                                                            <LikeButton
                                                                postId={post.id}
                                                                initialLikeCount={
                                                                    post.likeCount ??
                                                                    0
                                                                }
                                                                initialIsLiked={
                                                                    post.isLiked ??
                                                                    false
                                                                }
                                                                size="sm"
                                                                variant="ghost"
                                                                disabled={
                                                                    !canInteract
                                                                }
                                                                showCount={
                                                                    false
                                                                }
                                                            />
                                                            <span className="hidden text-sm md:inline">
                                                                Like
                                                            </span>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="col-span-1 justify-center"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                router.push(
                                                                    `/communities/${community.slug}/posts/${post.id}`,
                                                                );
                                                            }}
                                                        >
                                                            <MessageSquare className="h-4 w-4 md:mr-2" />
                                                            <span className="hidden md:inline">
                                                                Comment
                                                            </span>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="col-span-1 justify-center"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                if (!session)
                                                                    return;
                                                                if (
                                                                    post.isSaved
                                                                ) {
                                                                    unsavePostMutation.mutate(
                                                                        {
                                                                            postId: post.id,
                                                                        },
                                                                    );
                                                                } else {
                                                                    savePostMutation.mutate(
                                                                        {
                                                                            postId: post.id,
                                                                        },
                                                                    );
                                                                }
                                                            }}
                                                        >
                                                            <Bookmark
                                                                className={`h-4 w-4 md:mr-2 ${post.isSaved ? 'fill-current' : ''}`}
                                                            />
                                                            <span className="hidden md:inline">
                                                                {post.isSaved
                                                                    ? 'Saved'
                                                                    : 'Save'}
                                                            </span>
                                                        </Button>
                                                        <div
                                                            className="col-span-1 flex items-center justify-center"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                            }}
                                                        >
                                                            <ShareButton
                                                                title={
                                                                    post.title
                                                                }
                                                                text={`Check out this post: ${post.title}`}
                                                                url={`${typeof window !== 'undefined' ? window.location.origin : ''}/communities/${community.slug}/posts/${post.id}`}
                                                                variant="ghost"
                                                                size="sm"
                                                            />
                                                            <span className="hidden text-sm md:inline">
                                                                Share
                                                            </span>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Empty state for members */}
                    {isMember &&
                        (!postsWithLikes || postsWithLikes.length === 0) && (
                            <div className="py-12 text-center">
                                <Building className="text-muted-foreground mx-auto mb-4 h-12 w-12 opacity-50" />
                                <p className="text-muted-foreground">
                                    {selectedTagFilters.length > 0
                                        ? 'No posts match the selected tags.'
                                        : showMyPosts
                                          ? "You haven't created any posts in this community yet."
                                          : 'No posts yet.'}
                                </p>
                                {selectedTagFilters.length > 0 ? (
                                    <Button
                                        onClick={onClearTagFilters}
                                        className="mt-4"
                                    >
                                        Clear Filters
                                    </Button>
                                ) : showMyPosts ? (
                                    <Button
                                        onClick={onClearPostFilter}
                                        className="mt-4"
                                    >
                                        Show All Posts
                                    </Button>
                                ) : canCreatePost ? (
                                    <Button asChild className="mt-4">
                                        <Link
                                            href={`/posts/new?communityId=${community.id}&communitySlug=${community.slug}`}
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Create First Post
                                        </Link>
                                    </Button>
                                ) : null}
                            </div>
                        )}
                </>
            )}
        </TabsContent>
    );
}
