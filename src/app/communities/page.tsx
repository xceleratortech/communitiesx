'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { trpc } from '@/providers/trpc-provider';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Globe,
    Lock,
    Users,
    Eye,
    MessageSquare,
    Building,
    Mail,
    CalendarDays,
    ShieldCheck,
    Loader2,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Loading } from '@/components/ui/loading';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/server/auth/client';
import type { Community } from '@/types/models';
import { Input } from '@/components/ui/input';

// Define CommunityCardProps type
interface CommunityCardProps {
    community: Community;
}

export default function CommunitiesPage() {
    const sessionData = useSession();
    const session = sessionData.data;
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('all');

    // Search state
    const [searchInputValue, setSearchInputValue] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[] | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Infinite query for communities
    const {
        data: communitiesData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: isLoadingCommunities,
    } = trpc.communities.getAll.useInfiniteQuery(
        {
            limit: 6,
        },
        {
            enabled: !!session && !isSearching,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
        },
    );

    // Search query
    const searchQuery = trpc.communities.search.useQuery(
        { search: searchTerm, limit: 20, offset: 0 },
        {
            enabled: !!searchTerm && searchTerm.length >= 2,
            staleTime: 5 * 60 * 1000, // Cache results for 5 minutes
            refetchOnWindowFocus: false,
        },
    );

    // Flatten the pages into a single array of communities
    const communities =
        communitiesData?.pages.flatMap((page) => page.items) || [];

    // Get organization details
    const { data: userProfile, isLoading: isLoadingProfile } =
        trpc.users.getUserProfile.useQuery(
            { userId: session?.user?.id || '' },
            {
                enabled: !!session?.user?.id,
            },
        );

    // Get organization stats
    const { data: orgStats, isLoading: isLoadingStats } =
        trpc.community.getStats.useQuery(undefined, {
            enabled: !!session,
        });

    // Get organization admins
    const { data: orgAdmins, isLoading: isLoadingAdmins } =
        trpc.community.getAdmins.useQuery(undefined, {
            enabled: !!session,
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
                setSearchResults(searchQuery.data.items as any[]);
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

    // Use searchResults if searching, else use communities
    const communitiesToRender =
        isSearching && searchResults !== null ? searchResults : communities;

    // Intersection observer for infinite scrolling
    const observerTarget = useRef<HTMLDivElement>(null);
    const handleObserver = useCallback(
        (entries: IntersectionObserverEntry[]) => {
            const [entry] = entries;
            if (
                entry.isIntersecting &&
                hasNextPage &&
                !isFetchingNextPage &&
                !isSearching
            ) {
                fetchNextPage();
            }
        },
        [fetchNextPage, hasNextPage, isFetchingNextPage, isSearching],
    );

    useEffect(() => {
        const element = observerTarget.current;
        if (!element) return;

        const observer = new IntersectionObserver(handleObserver, {
            rootMargin: '0px 0px 300px 0px',
        });

        observer.observe(element);
        return () => {
            observer.unobserve(element);
        };
    }, [handleObserver]);

    // Don't render anything meaningful during SSR to avoid hydration mismatches
    if (!isClient) {
        return <CommunitiesPageSkeleton />;
    }

    if (session === undefined) {
        return <CommunitiesPageSkeleton />;
    }

    if (!session) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h1 className="mb-4 text-3xl font-bold">
                    Authentication Required
                </h1>
                <p className="text-muted-foreground mb-8">
                    Please sign in to view communities.
                </p>
                <Button asChild>
                    <Link href="/auth/login">Sign In</Link>
                </Button>
            </div>
        );
    }

    // Only show loading state on client after hydration
    if (
        isClient &&
        isLoadingCommunities &&
        communities.length === 0 &&
        !isSearching
    ) {
        return <Loading message="Loading communities..." />;
    }

    // Filter communities for "My Communities" tab
    const myCommunities = communitiesToRender.filter((c: any) =>
        c.members?.some((m: any) => m.userId === session.user.id),
    );

    // Sort communities by member count for "Popular" tab
    const popularCommunities = [...communitiesToRender]
        .sort(
            (a: any, b: any) =>
                (b.members?.length || 0) - (a.members?.length || 0),
        )
        .slice(0, 6);

    return (
        <div className="py-8">
            <div className="mb-0 flex items-center justify-between">
                <div>
                    <p className="text-muted-foreground mt-0 mb-2">
                        Discover and join communities based on your interests
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

            <Tabs
                defaultValue="all"
                className="w-full"
                onValueChange={setActiveTab}
            >
                <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center sm:gap-0">
                    <TabsList className="grid w-full grid-cols-2 sm:flex sm:w-auto">
                        <TabsTrigger
                            value="all"
                            className="flex-1 sm:flex-none"
                        >
                            All Communities
                        </TabsTrigger>
                        <TabsTrigger value="my" className="flex-1 sm:flex-none">
                            My Communities
                        </TabsTrigger>
                        {/* <TabsTrigger value="popular">Popular</TabsTrigger> */}
                    </TabsList>
                </div>

                <div className="flex flex-col gap-6 lg:flex-row">
                    {/* Main content area - 70% on desktop, full width on mobile */}
                    <div className="w-full lg:w-[70%]">
                        {/* All TabsContent sections remain the same */}
                        <TabsContent value="all" className="space-y-4">
                            {isLoadingCommunities &&
                            communities.length === 0 &&
                            !isSearching ? (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {Array(3)
                                        .fill(0)
                                        .map((_, i) => (
                                            <CommunityCardSkeleton key={i} />
                                        ))}
                                </div>
                            ) : communitiesToRender.length ? (
                                <>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {communitiesToRender.map(
                                            (community: any) => (
                                                <CommunityCard
                                                    key={community.id}
                                                    community={
                                                        community as Community
                                                    }
                                                />
                                            ),
                                        )}
                                    </div>
                                    {!isSearching && (
                                        <div
                                            ref={observerTarget}
                                            className="mt-8 flex justify-center"
                                        >
                                            {isFetchingNextPage && (
                                                <div className="flex items-center space-x-2">
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                    <span>Loading more...</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="py-12 text-center">
                                    <h3 className="text-lg font-medium">
                                        {isSearching
                                            ? `No communities found for "${searchInputValue}"`
                                            : 'No communities found'}
                                    </h3>
                                    <p className="text-muted-foreground mt-2">
                                        {isSearching
                                            ? 'Try a different search term'
                                            : 'Be the first to create a community!'}
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
                        </TabsContent>

                        <TabsContent value="my">
                            {isLoadingCommunities &&
                            communities.length === 0 &&
                            !isSearching ? (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {Array(2)
                                        .fill(0)
                                        .map((_, i) => (
                                            <CommunityCardSkeleton key={i} />
                                        ))}
                                </div>
                            ) : myCommunities.length ? (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {myCommunities.map((community: any) => (
                                        <CommunityCard
                                            key={community.id}
                                            community={community as Community}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="py-12 text-center">
                                    <h3 className="text-lg font-medium">
                                        {isSearching
                                            ? 'No matching communities in your communities'
                                            : "You haven't joined any communities yet"}
                                    </h3>
                                    <p className="text-muted-foreground mt-2">
                                        {isSearching
                                            ? 'Try searching in all communities instead'
                                            : 'Browse the communities and join ones that interest you'}
                                    </p>
                                </div>
                            )}
                        </TabsContent>
                    </div>

                    {/* Organization sidebar - now at the same level as TabsContent */}
                    <div className="mt-2 w-full lg:w-[30%]">
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
                                {isLoadingProfile ? (
                                    <div className="space-y-3">
                                        <Skeleton className="h-6 w-40" />
                                        <Skeleton className="h-5 w-32" />
                                        <Skeleton className="h-5 w-36" />
                                    </div>
                                ) : userProfile ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-12 w-12">
                                                <AvatarFallback className="bg-primary/10">
                                                    {userProfile.orgName
                                                        ?.substring(0, 2)
                                                        .toUpperCase() || 'OR'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h3 className="font-medium">
                                                    {userProfile.orgName}
                                                </h3>
                                                <p className="text-muted-foreground text-sm">
                                                    Organization
                                                </p>
                                            </div>
                                        </div>
                                        <div className="pt-2">
                                            <p className="text-muted-foreground flex items-center gap-2 text-sm">
                                                <Mail className="h-4 w-4" />
                                                {userProfile.email}
                                            </p>
                                            <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                                                <CalendarDays className="h-4 w-4" />
                                                Joined as member
                                            </p>
                                        </div>
                                        {orgAdmins && orgAdmins.length > 0 && (
                                            <div className="mt-3 border-t pt-2">
                                                <h4 className="mb-2 flex items-center text-sm font-medium">
                                                    <ShieldCheck className="mr-1.5 h-4 w-4" />
                                                    Admin Contacts
                                                </h4>
                                                <div className="space-y-1">
                                                    {orgAdmins.map(
                                                        (admin: any) => (
                                                            <p
                                                                key={admin.id}
                                                                className="text-muted-foreground flex items-center gap-2 text-xs"
                                                            >
                                                                <Mail className="h-3 w-3" />
                                                                {admin.email}
                                                            </p>
                                                        ),
                                                    )}
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
                                {isLoadingStats ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-5 w-28" />
                                        <Skeleton className="h-5 w-24" />
                                        <Skeleton className="h-5 w-32" />
                                    </div>
                                ) : orgStats ? (
                                    <div className="space-y-2">
                                        <p className="flex items-center justify-between">
                                            <span className="text-muted-foreground">
                                                Members:
                                            </span>
                                            <span className="font-medium">
                                                {orgStats.totalUsers}
                                            </span>
                                        </p>
                                        <p className="flex items-center justify-between">
                                            <span className="text-muted-foreground">
                                                Posts:
                                            </span>
                                            <span className="font-medium">
                                                {orgStats.totalPosts}
                                            </span>
                                        </p>
                                        <p className="flex items-center justify-between">
                                            <span className="text-muted-foreground">
                                                Communities:
                                            </span>
                                            <span className="font-medium">
                                                {orgStats.orgCommunityCount}
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
                    </div>
                </div>
            </Tabs>
        </div>
    );
}

function CommunityCard({ community }: CommunityCardProps) {
    return (
        <Link href={`/communities/${community.slug}`} className="block">
            <Card className="group flex h-[380px] cursor-pointer flex-col overflow-hidden pt-0 transition-all hover:shadow-md">
                <div className="relative h-24 w-full">
                    {community.banner ? (
                        <img
                            src={community.banner || '/placeholder.svg'}
                            alt={`${community.name} banner`}
                            className="h-20 w-full object-cover"
                        />
                    ) : (
                        <div className="h-20 w-full bg-gray-200" />
                    )}
                    <div className="absolute -bottom-10 left-4">
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
                </div>
                <CardHeader className="pt-8 pb-2">
                    <div className="flex flex-col items-start justify-between">
                        <div>
                            <CardTitle className="group-hover:text-primary flex items-center gap-2 transition-colors">
                                {community.name}
                                {community.type === 'private' ? (
                                    <Lock className="text-muted-foreground h-4 w-4" />
                                ) : (
                                    <Globe className="text-muted-foreground h-4 w-4" />
                                )}
                            </CardTitle>
                            <CardDescription className="mt-2 line-clamp-1">
                                {community.description}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pb-1">
                    <div className="flex flex-wrap gap-1">
                        <Badge
                            variant="secondary"
                            className="flex items-center gap-1"
                        >
                            <Users className="h-3 w-3" />
                            {community.members?.length || 0} members
                        </Badge>
                        <Badge
                            variant="secondary"
                            className="flex items-center gap-1"
                        >
                            <Eye className="h-3 w-3" />
                            {community.type}
                        </Badge>
                        <Badge
                            variant="secondary"
                            className="flex items-center gap-1"
                        >
                            <MessageSquare className="h-3 w-3" />
                            {community.posts?.length || 0} posts
                        </Badge>
                    </div>
                </CardContent>
                <CardFooter className="text-muted-foreground mt-auto pt-2 pb-6 text-xs">
                    Created {new Date(community.createdAt).toLocaleDateString()}
                </CardFooter>
            </Card>
        </Link>
    );
}

function CommunityCardSkeleton() {
    return (
        <Card className="flex h-[380px] flex-col overflow-hidden">
            <div className="bg-muted h-24 w-full" />
            <div className="absolute -mt-10 ml-4">
                <Skeleton className="h-20 w-20 rounded-full" />
            </div>
            <CardHeader className="pt-12 pb-4">
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-4 w-60" />
                    </div>
                    <Skeleton className="h-9 w-16" />
                </div>
            </CardHeader>
            <CardContent className="pb-2">
                <div className="flex gap-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-24" />
                </div>
            </CardContent>
            <CardFooter className="mt-auto pt-2 pb-4">
                <Skeleton className="h-4 w-32" />
            </CardFooter>
        </Card>
    );
}

// Full page skeleton for initial loading
function CommunitiesPageSkeleton() {
    return (
        <div className="container mx-auto px-4 py-8 md:px-6">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <Skeleton className="mb-2 h-8 w-48" />
                    <Skeleton className="h-4 w-72" />
                </div>
                <Skeleton className="h-10 w-36" />
            </div>
            <Skeleton className="mb-6 h-10 w-full sm:w-80" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array(8)
                    .fill(0)
                    .map((_, i) => (
                        <CommunityCardSkeleton key={i} />
                    ))}
            </div>
        </div>
    );
}
