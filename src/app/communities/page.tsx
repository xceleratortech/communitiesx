'use client';

import { useEffect, useState } from 'react';
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
import { Globe, Lock, Users, Eye, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/server/auth/client';

// Define community type
interface Community {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    type: string; // Changed from 'public' | 'private' to string to match actual data
    rules: string | null;
    banner: string | null;
    avatar: string | null;
    createdBy: string;
    createdAt: string | Date; // Accept string or Date to handle API response
    updatedAt: string | Date;
    members?: Array<{
        userId: string;
        communityId: number;
        role: string;
        membershipType: string;
        status: string;
    }>;
    posts?: any[];
    creator?: {
        id: string;
        name: string;
        email: string;
    };
}

export default function CommunitiesPage() {
    const sessionData = useSession();
    const session = sessionData.data;
    const router = useRouter();
    const { data: communities, isLoading } = trpc.communities.getAll.useQuery(
        undefined,
        {
            enabled: !!session,
        },
    );
    const [activeTab, setActiveTab] = useState('all');

    // Use client-side flag to avoid hydration mismatch
    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

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
    if (isClient && isLoading) {
        return <CommunitiesPageSkeleton />;
    }

    return (
        <div className="py-8">
            <div className="mb-0 flex items-center justify-between">
                <div>
                    {/* <h1 className="text-3xl font-bold tracking-tight">
                        Communities
                    </h1> */}
                    <p className="text-muted-foreground mt-0 mb-2">
                        Discover and join communities based on your interests
                    </p>
                </div>
            </div>

            <Tabs
                defaultValue="all"
                className="w-full"
                onValueChange={setActiveTab}
            >
                <div className="mb-6 flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="all">All Communities</TabsTrigger>
                        <TabsTrigger value="my">My Communities</TabsTrigger>
                        <TabsTrigger value="popular">Popular</TabsTrigger>
                    </TabsList>
                    <Button asChild>
                        <Link href="/communities/new">Create Community</Link>
                    </Button>
                </div>

                <TabsContent value="all" className="space-y-4">
                    {isLoading ? (
                        Array(3)
                            .fill(0)
                            .map((_, i) => <CommunityCardSkeleton key={i} />)
                    ) : communities?.length ? (
                        communities.map((community: any) => (
                            <CommunityCard
                                key={community.id}
                                community={community as Community}
                            />
                        ))
                    ) : (
                        <div className="py-12 text-center">
                            <h3 className="text-lg font-medium">
                                No communities found
                            </h3>
                            <p className="text-muted-foreground mt-2">
                                Be the first to create a community!
                            </p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="my">
                    <div className="space-y-4">
                        {isLoading ? (
                            Array(2)
                                .fill(0)
                                .map((_, i) => (
                                    <CommunityCardSkeleton key={i} />
                                ))
                        ) : communities?.filter((c: any) =>
                              c.members?.some(
                                  (m: any) => m.userId === session.user.id,
                              ),
                          )?.length ? (
                            communities
                                .filter((c: any) =>
                                    c.members?.some(
                                        (m: any) =>
                                            m.userId === session.user.id,
                                    ),
                                )
                                .map((community: any) => (
                                    <CommunityCard
                                        key={community.id}
                                        community={community as Community}
                                    />
                                ))
                        ) : (
                            <div className="py-12 text-center">
                                <h3 className="text-lg font-medium">
                                    You haven't joined any communities yet
                                </h3>
                                <p className="text-muted-foreground mt-2">
                                    Browse the communities and join ones that
                                    interest you
                                </p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="popular">
                    {isLoading ? (
                        Array(3)
                            .fill(0)
                            .map((_, i) => <CommunityCardSkeleton key={i} />)
                    ) : communities?.length ? (
                        // Sort by member count and slice to top 5
                        [...communities]
                            .sort(
                                (a: any, b: any) =>
                                    (b.members?.length || 0) -
                                    (a.members?.length || 0),
                            )
                            .slice(0, 5)
                            .map((community: any) => (
                                <CommunityCard
                                    key={community.id}
                                    community={community as Community}
                                />
                            ))
                    ) : (
                        <div className="py-12 text-center">
                            <h3 className="text-lg font-medium">
                                No communities found
                            </h3>
                            <p className="text-muted-foreground mt-2">
                                Be the first to create a community!
                            </p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

interface CommunityCardProps {
    community: Community;
}

function CommunityCard({ community }: CommunityCardProps) {
    return (
        <Card className="overflow-hidden transition-all hover:shadow-md">
            <div className="relative h-24 w-full bg-gradient-to-r from-blue-400 to-blue-600">
                {community.banner && (
                    <img
                        src={community.banner}
                        alt={`${community.name} banner`}
                        className="h-full w-full object-cover"
                    />
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

            <CardHeader className="pt-12 pb-4">
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            {community.name}
                            {community.type === 'private' ? (
                                <Lock className="text-muted-foreground h-4 w-4" />
                            ) : (
                                <Globe className="text-muted-foreground h-4 w-4" />
                            )}
                        </CardTitle>
                        <CardDescription className="mt-2">
                            {community.description}
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/communities/${community.slug}`}>
                            Visit
                        </Link>
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="pb-2">
                <div className="flex flex-wrap gap-2">
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

            <CardFooter className="text-muted-foreground pt-2 pb-4 text-xs">
                Created {new Date(community.createdAt).toLocaleDateString()}
            </CardFooter>
        </Card>
    );
}

function CommunityCardSkeleton() {
    return (
        <Card className="overflow-hidden">
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

            <CardFooter className="pt-2 pb-4">
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

            <Skeleton className="mb-6 h-10 w-80" />

            <div className="space-y-4">
                {Array(3)
                    .fill(0)
                    .map((_, i) => (
                        <CommunityCardSkeleton key={i} />
                    ))}
            </div>
        </div>
    );
}
