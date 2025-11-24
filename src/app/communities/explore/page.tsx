'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { trpc } from '@/providers/trpc-provider';
import { useSession } from '@/server/auth/client';
import { Globe, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { usePermission } from '@/hooks/use-permission';
import { formatCount, generateMemberAvatars } from '@/lib/utils';
import type { Community, CommunityMember } from '@/types/models';

export default function ExploreCommunitiesPage() {
    const [searchInputValue, setSearchInputValue] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Community[] | null>(
        null,
    );
    const [isSearching, setIsSearching] = useState(false);
    const [joiningCommunityId, setJoiningCommunityId] = useState<number | null>(
        null,
    );
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const session = useSession();
    const { appRole, orgRole } = usePermission();
    const isAppAdmin = appRole === 'admin';
    const isOrgAdmin = orgRole === 'admin';
    const utils = trpc.useUtils();

    // Query for all communities
    const { data: allCommunities, isLoading: isLoadingCommunities } =
        trpc.communities.getAll.useQuery({
            limit: 50,
        });

    // Get user's joined communities to filter out already joined ones
    const { data: userCommunities } =
        trpc.communities.getUserCommunities.useQuery(undefined, {
            enabled: !!session,
        });

    // Search query
    const searchQuery = trpc.communities.search.useQuery(
        { search: searchTerm, limit: 20, offset: 0 },
        {
            enabled: !!searchTerm && searchTerm.length >= 2,
            staleTime: 5 * 60 * 1000, // Cache results for 5 minutes
            refetchOnWindowFocus: false,
        },
    );

    const joinCommunityMutation = trpc.communities.joinCommunity.useMutation({
        onSuccess: (result) => {
            if (result?.status === 'approved') {
                toast.success("You've joined the community!");
                utils.communities.getAll.invalidate();
                utils.communities.getUserCommunities.invalidate();
            } else {
                toast.success('Join request sent! Waiting for admin approval.');
            }
            setJoiningCommunityId(null);
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to join community');
            setJoiningCommunityId(null);
        },
    });

    // Use client-side flag to avoid hydration mismatch
    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Debounced search handler
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

    // Listen for search results
    useEffect(() => {
        if (searchTerm.length >= 2) {
            setIsSearching(true);
            if (searchQuery.data) {
                setSearchResults(searchQuery.data.items as Community[]);
            }
        } else {
            setIsSearching(false);
            setSearchResults(null);
        }
    }, [searchTerm, searchQuery.data]);

    // Clear search when input is cleared
    useEffect(() => {
        if (searchInputValue.length === 0) {
            setSearchTerm('');
            setSearchResults(null);
            setIsSearching(false);
        }
    }, [searchInputValue]);

    // Helper function to check if user is already a member of a community
    const isUserMember = (communityId: number) => {
        return (
            userCommunities?.some(
                (community) => community.id === communityId,
            ) || false
        );
    };

    // Filter out communities user has already joined
    const filterUnjoinedCommunities = (communities: Community[]) => {
        return communities.filter((community) => !isUserMember(community.id));
    };

    // Use searchResults if searching, else use allCommunities filtered
    const communitiesToRender =
        isSearching && searchResults !== null
            ? filterUnjoinedCommunities(searchResults)
            : filterUnjoinedCommunities(allCommunities?.items || []);

    // Don't render anything meaningful during SSR to avoid hydration mismatches
    if (!isClient) {
        return <ExploreCommunitiesPageSkeleton />;
    }

    if (session === undefined) {
        return <ExploreCommunitiesPageSkeleton />;
    }

    if (!session) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h1 className="mb-4 text-3xl font-bold">
                    Authentication Required
                </h1>
                <p className="text-muted-foreground mb-8">
                    Please sign in to explore communities.
                </p>
                <Button asChild>
                    <Link href="/auth/login">Sign In</Link>
                </Button>
            </div>
        );
    }

    // Only show loading state on client after hydration
    if (isClient && isLoadingCommunities && !isSearching) {
        return <ExploreCommunitiesPageSkeleton />;
    }

    return (
        <div className="py-8">
            <div className="mb-0 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Explore Communities</h1>
                    <p className="text-muted-foreground mt-0 mb-2">
                        Discover and join communities that interest you
                    </p>
                </div>
            </div>

            {/* Search input */}
            <div className="mb-6">
                <Input
                    type="text"
                    placeholder="Search communities..."
                    className="w-full max-w-md"
                    value={searchInputValue}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                />
            </div>

            {/* Main content area */}
            <div className="w-full">
                {isLoadingCommunities && !isSearching ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Array(6)
                            .fill(0)
                            .map((_, i) => (
                                <CommunityCardSkeleton key={i} />
                            ))}
                    </div>
                ) : communitiesToRender.length ? (
                    <>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {communitiesToRender.map((community: Community) => (
                                <CommunityCard
                                    key={community.id}
                                    community={community}
                                    joiningCommunityId={joiningCommunityId}
                                    setJoiningCommunityId={
                                        setJoiningCommunityId
                                    }
                                    joinCommunityMutation={
                                        joinCommunityMutation
                                    }
                                    isAppAdmin={isAppAdmin}
                                    isOrgAdmin={isOrgAdmin}
                                />
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="py-12 text-center">
                        <h3 className="text-lg font-medium">
                            {isSearching
                                ? `No communities found for "${searchInputValue}"`
                                : 'No communities available to join'}
                        </h3>
                        <p className="text-muted-foreground mt-2">
                            {isSearching
                                ? 'Try a different search term'
                                : 'You may have already joined all available communities'}
                        </p>
                        {isSearching && (
                            <Button
                                onClick={() => {
                                    setSearchInputValue('');
                                    setSearchTerm('');
                                }}
                                className="mt-4"
                            >
                                Clear Search
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

interface CommunityCardProps {
    community: Community;
    joiningCommunityId: number | null;
    setJoiningCommunityId: (id: number | null) => void;
    joinCommunityMutation: any;
    isAppAdmin: boolean;
    isOrgAdmin: boolean;
}

function CommunityCard({
    community,
    joiningCommunityId,
    setJoiningCommunityId,
    joinCommunityMutation,
    isAppAdmin,
    isOrgAdmin,
}: CommunityCardProps) {
    const utils = trpc.useUtils();
    const { data: pendingRequests } =
        trpc.communities.getUserPendingRequests.useQuery(
            { communityId: community.id },
            { enabled: !!community.id },
        );

    const pendingJoinRequest = pendingRequests?.find(
        (req: NonNullable<typeof pendingRequests>[number]) =>
            req.requestType === 'join' && req.status === 'pending',
    );

    const cancelRequestMutation =
        trpc.communities.cancelPendingRequest.useMutation({
            onSuccess: async () => {
                toast.success('Request cancelled');
                await utils.communities.getUserPendingRequests.invalidate({
                    communityId: community.id,
                });
            },
            onError: (error) => {
                toast.error(error.message || 'Failed to cancel request');
            },
        });

    const members = (community.members as CommunityMember[]) || [];
    const memberAvatars = generateMemberAvatars(members, 3);

    return (
        <Card className="group relative flex h-auto flex-col gap-2 overflow-hidden pt-0 transition-all hover:shadow-md">
            <div className="relative h-28 w-full">
                {community.banner ? (
                    <img
                        src={community.banner || '/placeholder.svg'}
                        alt={`${community.name} banner`}
                        className="h-28 w-full object-cover"
                    />
                ) : (
                    <div className="h-28 w-full bg-gray-200" />
                )}
            </div>

            <CardHeader className="pt-2 pb-2">
                <div>
                    <Avatar className="border-background h-20 w-20 border-4">
                        <AvatarImage
                            src={community.avatar || undefined}
                            alt={community.name}
                        />
                        <AvatarFallback className="bg-primary text-xl">
                            {community.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                </div>
                <div className="flex flex-col items-start">
                    <CardTitle className="group-hover:text-primary flex items-center gap-2 text-lg transition-colors">
                        {community.name}
                        {community.type === 'private' ? (
                            <Lock className="text-muted-foreground h-4 w-4" />
                        ) : (
                            <Globe className="text-muted-foreground h-4 w-4" />
                        )}
                    </CardTitle>
                    {community.description ? (
                        <CardDescription className="mt-2 line-clamp-2">
                            {community.description}
                        </CardDescription>
                    ) : null}
                </div>
            </CardHeader>

            <CardContent className="pb-2">
                <div className="bg-muted my-2 h-px w-full" />
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center">
                            {(
                                ((community.memberCount ?? 0) > 0
                                    ? memberAvatars
                                    : [{}, {}, {}]) as Array<{
                                    src?: string;
                                    initials?: string;
                                }>
                            ).map((m, idx) => (
                                <Avatar
                                    key={idx}
                                    className={`h-8 w-8 border-2 ${
                                        idx === 0 ? '' : '-ml-2'
                                    }`}
                                >
                                    {m.src ? (
                                        <AvatarImage
                                            src={m.src}
                                            alt={m.initials || 'Member'}
                                        />
                                    ) : null}
                                    <AvatarFallback className="bg-muted text-[10px] font-medium">
                                        {m.initials || ''}
                                    </AvatarFallback>
                                </Avatar>
                            ))}
                        </div>
                        <div className="text-muted-foreground text-sm">
                            {(community.memberCount ?? 0) > 0
                                ? `${formatCount(community.memberCount!)} Members`
                                : 'No members yet'}
                        </div>
                    </div>
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                        {community.type === 'private' ? (
                            <>
                                <Lock className="h-4 w-4" /> Private
                            </>
                        ) : (
                            <>
                                <Globe className="h-4 w-4" /> Public
                            </>
                        )}
                    </div>
                </div>
            </CardContent>

            <div className="mt-auto px-6 pt-2 pb-6">
                {/* Show appropriate button based on state */}
                {pendingJoinRequest ? (
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={() => {
                                cancelRequestMutation.mutate({
                                    requestId: pendingJoinRequest.id,
                                });
                            }}
                            disabled={cancelRequestMutation.isPending}
                        >
                            {cancelRequestMutation.isPending
                                ? 'Cancelling...'
                                : 'Cancel Request'}
                        </Button>
                        <Button asChild variant="outline" className="flex-1">
                            <Link href={`/communities/${community.slug}`}>
                                View Community
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        {(isAppAdmin || isOrgAdmin) && (
                            <Button
                                asChild
                                variant="outline"
                                className="flex-1"
                            >
                                <Link href={`/communities/${community.slug}`}>
                                    View Community
                                </Link>
                            </Button>
                        )}
                        <Button
                            className="flex-1 bg-black text-white hover:bg-black/90"
                            onClick={() => {
                                setJoiningCommunityId(community.id);
                                joinCommunityMutation.mutate({
                                    communityId: community.id,
                                });
                            }}
                            disabled={joiningCommunityId === community.id}
                        >
                            {joiningCommunityId === community.id
                                ? 'Joining...'
                                : 'Join Community'}
                        </Button>
                    </div>
                )}
            </div>
        </Card>
    );
}

function CommunityCardSkeleton() {
    return (
        <Card className="flex h-[420px] flex-col overflow-hidden">
            <div className="bg-muted h-28 w-full" />
            <CardHeader className="pt-2 pb-2">
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-4 w-60" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pb-2">
                <div className="bg-muted my-2 h-px w-full" />
                <div className="flex gap-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-20" />
                </div>
            </CardContent>
            <div className="mt-auto px-6 pt-2 pb-6">
                <Skeleton className="h-11 w-full rounded-2xl" />
            </div>
        </Card>
    );
}

// Full page skeleton for initial loading
function ExploreCommunitiesPageSkeleton() {
    return (
        <div className="container mx-auto px-4 py-8 md:px-6">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <Skeleton className="mb-2 h-8 w-48" />
                    <Skeleton className="h-4 w-72" />
                </div>
            </div>
            <Skeleton className="mb-6 h-10 w-full sm:w-80" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array(6)
                    .fill(0)
                    .map((_, i) => (
                        <CommunityCardSkeleton key={i} />
                    ))}
            </div>
        </div>
    );
}
