'use client';

import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { trpc } from '@/providers/trpc-provider';
import { useSession } from '@/server/auth/client';
import { Globe, Lock, Users, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { usePermission } from '@/hooks/use-permission';

// Component for community action button
function CommunityActionButton({
    community,
    isUserMember,
    isAppAdmin,
    isOrgAdmin,
    joiningCommunityId,
    setJoiningCommunityId,
    joinCommunityMutation,
}: {
    community: any;
    isUserMember: (id: number) => boolean;
    isAppAdmin: boolean;
    isOrgAdmin: boolean;
    joiningCommunityId: number | null;
    setJoiningCommunityId: (id: number | null) => void;
    joinCommunityMutation: any;
}) {
    const utils = trpc.useUtils();
    const { data: pendingRequests } =
        trpc.communities.getUserPendingRequests.useQuery(
            { communityId: community.id },
            { enabled: !!community.id },
        );

    const pendingJoinRequest = pendingRequests?.find(
        (req: any) => req.requestType === 'join' && req.status === 'pending',
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

    // Don't show join button for admins or existing members
    if (isAppAdmin || isOrgAdmin || isUserMember(community.id)) {
        return (
            <Button asChild variant="outline" className="w-full">
                <Link href={`/communities/${community.slug}`}>
                    View Community
                </Link>
            </Button>
        );
    }

    // Show appropriate button based on state
    if (pendingJoinRequest) {
        return (
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
        );
    }

    return (
        <div className="flex gap-2">
            <Button
                className="flex-1"
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
            <Button asChild variant="outline" className="flex-1">
                <Link href={`/communities/${community.slug}`}>
                    View Community
                </Link>
            </Button>
        </div>
    );
}

export default function ExploreCommunitiesPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [joiningCommunityId, setJoiningCommunityId] = useState<number | null>(
        null,
    );
    const session = useSession();
    const { appRole, orgRole } = usePermission();
    const isAppAdmin = appRole === 'admin';
    const isOrgAdmin = orgRole === 'admin';

    const communitiesQuery = trpc.communities.getAll.useQuery({
        limit: 20,
    });

    // Get user's joined communities to check membership status
    const { data: userCommunities } =
        trpc.communities.getUserCommunities.useQuery(undefined, {
            enabled: !!session,
        });

    const joinCommunityMutation = trpc.communities.joinCommunity.useMutation({
        onSuccess: (result) => {
            if (result?.status === 'approved') {
                toast.success("You've joined the community!");
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

    const communities = communitiesQuery.data?.items || [];
    const isLoading = communitiesQuery.isLoading;

    // Helper function to check if user is already a member of a community
    const isUserMember = (communityId: number) => {
        return (
            userCommunities?.some(
                (community) => community.id === communityId,
            ) || false
        );
    };

    const filteredCommunities = communities.filter(
        (community) =>
            community.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            community.description
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase()),
    );

    return (
        <div className="py-4">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Explore Communities</h1>
                <p className="text-muted-foreground">
                    Discover and join communities that interest you
                </p>
            </div>

            <div className="mb-6">
                <Input
                    type="text"
                    placeholder="Search communities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-md"
                />
            </div>

            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(6)].map((_, index) => (
                        <Card key={index}>
                            <CardHeader>
                                <div className="flex items-center space-x-3">
                                    <Skeleton className="h-12 w-12 rounded-full" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="mb-2 h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredCommunities.map((community) => (
                        <Card
                            key={community.id}
                            className="transition-shadow hover:shadow-md"
                        >
                            <CardHeader>
                                <div className="flex items-center space-x-3">
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage
                                            src={community.avatar || undefined}
                                            alt={community.name}
                                        />
                                        <AvatarFallback>
                                            {community.name
                                                .substring(0, 2)
                                                .toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <CardTitle className="truncate text-lg">
                                            {community.name}
                                        </CardTitle>
                                        <div className="mt-1 flex items-center space-x-2">
                                            {community.type === 'public' ? (
                                                <Globe className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <Lock className="h-4 w-4 text-orange-500" />
                                            )}
                                            <Badge
                                                variant="secondary"
                                                className="text-xs"
                                            >
                                                {community.type}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <CardDescription className="mb-4 line-clamp-3">
                                    {community.description ||
                                        'No description available'}
                                </CardDescription>

                                <div className="text-muted-foreground mb-4 flex items-center justify-between text-sm">
                                    <div className="flex items-center space-x-1">
                                        <Users className="h-4 w-4" />
                                        <span>
                                            {community.members?.length || 0}{' '}
                                            members
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <Calendar className="h-4 w-4" />
                                        <span>
                                            {new Date(
                                                community.createdAt,
                                            ).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                <CommunityActionButton
                                    community={community}
                                    isUserMember={isUserMember}
                                    isAppAdmin={isAppAdmin}
                                    isOrgAdmin={isOrgAdmin}
                                    joiningCommunityId={joiningCommunityId}
                                    setJoiningCommunityId={
                                        setJoiningCommunityId
                                    }
                                    joinCommunityMutation={
                                        joinCommunityMutation
                                    }
                                />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {!isLoading && filteredCommunities.length === 0 && (
                <div className="py-8 text-center">
                    <p className="text-muted-foreground mb-4">
                        {searchTerm
                            ? 'No communities found matching your search.'
                            : 'No communities available.'}
                    </p>
                    {searchTerm && (
                        <Button
                            variant="outline"
                            onClick={() => setSearchTerm('')}
                        >
                            Clear Search
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
