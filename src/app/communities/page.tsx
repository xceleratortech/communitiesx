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
import {
    Globe,
    Lock,
    Users,
    Eye,
    MessageSquare,
    Loader2,
    Bell,
    BellOff,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Loading } from '@/components/ui/loading';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/server/auth/client';
import { formatCount, generateMemberAvatars } from '@/lib/utils';
import type { Community } from '@/types/models';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// Define CommunityCardProps type
interface CommunityCardProps {
    community: Community;
    showNotificationToggle?: boolean; // Optional prop to control notification toggle visibility
}

export default function CommunitiesPage() {
    const sessionData = useSession();
    const session = sessionData.data;
    const router = useRouter();

    // Search state
    const [searchInputValue, setSearchInputValue] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[] | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Query for user's joined communities only
    const { data: communities, isLoading: isLoadingCommunities } =
        trpc.communities.getUserCommunities.useQuery(undefined, {
            enabled: !!session && !isSearching,
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
        isSearching && searchResults !== null
            ? searchResults
            : communities || [];

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
    if (isClient && isLoadingCommunities && !isSearching) {
        return <Loading message="Loading communities..." />;
    }

    return (
        <div className="py-8">
            <div className="mb-0 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">My Communities</h1>
                    <p className="text-muted-foreground mt-0 mb-2">
                        Communities you've joined and are a member of
                    </p>
                </div>
            </div>

            {/* Search input */}
            <div className="mb-6">
                <Input
                    type="text"
                    placeholder="Search your communities..."
                    className="w-full max-w-md"
                    value={searchInputValue}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                />
            </div>

            {/* Main content area */}
            <div className="w-full">
                {isLoadingCommunities && !isSearching ? (
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
                            {communitiesToRender.map((community: any) => (
                                <CommunityCard
                                    key={community.id}
                                    community={community as Community}
                                    showNotificationToggle={true}
                                />
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="py-12 text-center">
                        <h3 className="text-lg font-medium">
                            {isSearching
                                ? `No communities found for "${searchInputValue}"`
                                : "You haven't joined any communities yet"}
                        </h3>
                        <p className="text-muted-foreground mt-2">
                            {isSearching
                                ? 'Try a different search term'
                                : 'Browse communities and join ones that interest you'}
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
                        {!isSearching && (
                            <Button asChild className="mt-4">
                                <Link href="/communities/explore">
                                    Explore Communities
                                </Link>
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function CommunityCard({
    community,
    showNotificationToggle = false,
}: CommunityCardProps) {
    const [notificationsDisabled, setNotificationsDisabled] = useState(false);
    const [isUpdatingNotification, setIsUpdatingNotification] = useState(false);

    // Get current user's notification status for this community (only if toggle should be shown)
    const { data: notificationStatus } =
        trpc.communities.getCommunityNotificationStatus.useQuery(
            { communityId: community.id },
            { enabled: !!community.id && showNotificationToggle },
        );

    // Initialize notification state from API response
    useEffect(() => {
        if (notificationStatus) {
            setNotificationsDisabled(notificationStatus.notificationsDisabled);
        }
    }, [notificationStatus]);

    const disableNotificationsMutation =
        trpc.communities.disableCommunityNotifications.useMutation({
            onSuccess: () => {
                toast.success(`Notifications disabled for ${community.name}`);
            },
            onError: (error) => {
                toast.error('Failed to disable notifications');
                // Revert the local state
                setNotificationsDisabled(false);
            },
        });

    const enableNotificationsMutation =
        trpc.communities.enableCommunityNotifications.useMutation({
            onSuccess: () => {
                toast.success(`Notifications enabled for ${community.name}`);
            },
            onError: (error) => {
                toast.error('Failed to enable notifications');
                // Revert the local state
                setNotificationsDisabled(true);
            },
        });

    const handleNotificationToggle = async (disabled: boolean) => {
        setNotificationsDisabled(disabled);
        setIsUpdatingNotification(true);

        try {
            if (disabled) {
                await disableNotificationsMutation.mutateAsync({
                    communityId: community.id,
                });
            } else {
                await enableNotificationsMutation.mutateAsync({
                    communityId: community.id,
                });
            }
        } finally {
            setIsUpdatingNotification(false);
        }
    };

    const members = (community.members as any[]) || [];
    const memberAvatars = generateMemberAvatars(members, 3);

    return (
        <Card className="group relative flex h-[420px] flex-col gap-2 overflow-hidden pt-0 transition-all hover:shadow-md">
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

                {/* Notification toggle overlay - only show for My Communities */}
                {showNotificationToggle && (
                    <div className="absolute top-2 right-2">
                        <div className="bg-background/90 rounded-lg border p-2 shadow-sm backdrop-blur-sm">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        handleNotificationToggle(
                                            !notificationsDisabled,
                                        )
                                    }
                                    disabled={isUpdatingNotification}
                                    className="h-6 w-6 p-0"
                                >
                                    {notificationsDisabled ? (
                                        <BellOff className="text-muted-foreground h-4 w-4" />
                                    ) : (
                                        <Bell className="text-primary h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <CardHeader className="pt-2 pb-2">
                <div className="flex items-start gap-4">
                    <Avatar className="border-background h-20 w-20 border-4">
                        <AvatarImage
                            src={community.avatar || undefined}
                            alt={community.name}
                        />
                        <AvatarFallback className="bg-primary text-xl">
                            {community.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-center pt-6">
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
                </div>
            </CardHeader>

            <CardContent className="pb-2">
                <div className="bg-muted my-2 h-px w-full" />
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center">
                            {(
                                ((community as any).memberCount > 0
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
                            {(community as any).memberCount > 0
                                ? `${formatCount((community as any).memberCount)} Members`
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
                <Button
                    asChild
                    className="h-11 w-full rounded-2xl bg-black text-white hover:bg-black/90"
                >
                    <Link href={`/communities/${community.slug}`}>
                        View Community
                    </Link>
                </Button>
            </div>
        </Card>
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
