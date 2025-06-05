'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
    Calendar,
    ArrowLeft,
    CheckCircle,
    XCircle,
    Shield,
    UserMinus,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/server/auth/client';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { InviteEmailDialog } from '@/components/invite-email-dialog';
import { UserProfilePopover } from '@/components/ui/user-profile-popover';

// Function to calculate relative time
function getRelativeTime(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
        return 'just now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
        return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
    }

    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
}

export default function CommunityDetailPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;
    const sessionData = useSession();
    const session = sessionData.data;
    const {
        data: community,
        isLoading,
        refetch,
    } = trpc.communities.getBySlug.useQuery({ slug }, { enabled: !!session });
    const [activeTab, setActiveTab] = useState('posts');
    const [isActionInProgress, setIsActionInProgress] = useState(false);
    const [isManageModeratorDialogOpen, setIsManageModeratorDialogOpen] =
        useState(false);
    const [isInviteEmailDialogOpen, setIsInviteEmailDialogOpen] =
        useState(false);

    // Alert dialog states
    const [isLeaveCommunityDialogOpen, setIsLeaveCommunityDialogOpen] =
        useState(false);
    const [isRemoveModeratorDialogOpen, setIsRemoveModeratorDialogOpen] =
        useState(false);
    const [isRemoveUserDialogOpen, setIsRemoveUserDialogOpen] = useState(false);
    const [userToRemove, setUserToRemove] = useState<string | null>(null);
    const [moderatorToRemove, setModeratorToRemove] = useState<string | null>(
        null,
    );

    // Use client-side flag to avoid hydration mismatch
    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Fetch pending requests if user is admin or moderator
    const { data: pendingRequests, refetch: refetchPendingRequests } =
        trpc.communities.getPendingRequests.useQuery(
            { communityId: community?.id || 0 },
            {
                enabled:
                    !!session &&
                    !!community?.id &&
                    !!community?.members?.some(
                        (m) =>
                            m.userId === session?.user.id &&
                            (m.role === 'admin' || m.role === 'moderator'),
                    ),
            },
        );

    // Check if user has pending requests
    const { data: userPendingRequests } =
        trpc.communities.getUserPendingRequests.useQuery(
            { communityId: community?.id || 0 },
            { enabled: !!session && !!community?.id && !!session?.user },
        );

    const hasPendingJoinRequest = userPendingRequests?.some(
        (req: { requestType: string; status: string }) =>
            req.requestType === 'join' && req.status === 'pending',
    );

    const hasPendingFollowRequest = userPendingRequests?.some(
        (req: { requestType: string; status: string }) =>
            req.requestType === 'follow' && req.status === 'pending',
    );

    // Join, follow, leave, unfollow mutations
    const joinCommunityMutation = trpc.communities.joinCommunity.useMutation({
        onSuccess: (result) => {
            refetch();
            if (result.status === 'approved') {
                toast.success("You've joined the community!");
            } else {
                toast.success('Join request sent! Waiting for admin approval.');
            }
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to join community');
        },
        onSettled: () => {
            setIsActionInProgress(false);
        },
    });

    const followCommunityMutation =
        trpc.communities.followCommunity.useMutation({
            onSuccess: (result) => {
                refetch();
                if (result.status === 'approved') {
                    toast.success("You're now following this community");
                } else {
                    toast.success(
                        'Follow request sent! Waiting for admin approval.',
                    );
                }
            },
            onError: (error) => {
                toast.error(error.message || 'Failed to follow community');
            },
            onSettled: () => {
                setIsActionInProgress(false);
            },
        });

    const leaveCommunityMutation = trpc.communities.leaveCommunity.useMutation({
        onSuccess: () => {
            refetch();
            toast.success("You've left the community");
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to leave community');
        },
        onSettled: () => {
            setIsActionInProgress(false);
        },
    });

    const unfollowCommunityMutation =
        trpc.communities.unfollowCommunity.useMutation({
            onSuccess: () => {
                refetch();
                toast.success("You've unfollowed the community");
            },
            onError: (error) => {
                toast.error(error.message || 'Failed to unfollow community');
            },
            onSettled: () => {
                setIsActionInProgress(false);
            },
        });

    // Approve/reject request mutations
    const approveRequestMutation = trpc.communities.approveRequest.useMutation({
        onSuccess: () => {
            refetchPendingRequests();
            refetch();
            toast.success('Request approved successfully');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to approve request');
        },
    });

    const rejectRequestMutation = trpc.communities.rejectRequest.useMutation({
        onSuccess: () => {
            refetchPendingRequests();
            toast.success('Request rejected');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to reject request');
        },
    });

    // Moderator management mutations
    const assignModeratorMutation =
        trpc.communities.assignModerator.useMutation({
            onSuccess: () => {
                refetch();
                toast.success('Moderator role assigned successfully');
            },
            onError: (error) => {
                toast.error(error.message || 'Failed to assign moderator role');
            },
        });

    const removeModeratorMutation =
        trpc.communities.removeModerator.useMutation({
            onSuccess: () => {
                refetch();
                toast.success('Moderator role removed');
            },
            onError: (error) => {
                toast.error(error.message || 'Failed to remove moderator role');
            },
        });

    // Remove user from community mutation
    const removeUserFromCommunityMutation =
        trpc.communities.removeUserFromCommunity.useMutation({
            onSuccess: () => {
                refetch();
                toast.success('User removed from community');
            },
            onError: (error) => {
                toast.error(
                    error.message || 'Failed to remove user from community',
                );
            },
        });

    // Handle membership actions
    const handleJoinCommunity = () => {
        if (!community || isActionInProgress) return;

        setIsActionInProgress(true);
        joinCommunityMutation.mutate({ communityId: community.id });
    };

    const handleFollowCommunity = () => {
        if (!community || isActionInProgress) return;

        setIsActionInProgress(true);
        followCommunityMutation.mutate({ communityId: community.id });
    };

    const handleLeaveCommunity = () => {
        if (!community || isActionInProgress) return;

        setIsLeaveCommunityDialogOpen(true);
    };

    const confirmLeaveCommunity = () => {
        if (!community || isActionInProgress) return;

        setIsActionInProgress(true);
        leaveCommunityMutation.mutate({ communityId: community.id });
        setIsLeaveCommunityDialogOpen(false);
    };

    const handleUnfollowCommunity = () => {
        if (!community || isActionInProgress) return;

        setIsActionInProgress(true);
        unfollowCommunityMutation.mutate({ communityId: community.id });
    };

    // Handle request approval/rejection
    const handleApproveRequest = (requestId: number) => {
        approveRequestMutation.mutate({ requestId });
    };

    const handleRejectRequest = (requestId: number) => {
        rejectRequestMutation.mutate({ requestId });
    };

    // Handle moderator management
    const handleAssignModerator = (userId: string) => {
        if (!community) return;
        assignModeratorMutation.mutate({
            communityId: community.id,
            userId,
        });
    };

    const handleRemoveModerator = (userId: string) => {
        if (!community) return;
        setModeratorToRemove(userId);
        setIsRemoveModeratorDialogOpen(true);
    };

    const confirmRemoveModerator = () => {
        if (!community || !moderatorToRemove) return;

        removeModeratorMutation.mutate({
            communityId: community.id,
            userId: moderatorToRemove,
        });
        setIsRemoveModeratorDialogOpen(false);
        setModeratorToRemove(null);
    };

    // Handle removing a user from the community
    const handleRemoveUserFromCommunity = (userId: string) => {
        if (!community) return;
        setUserToRemove(userId);
        setIsRemoveUserDialogOpen(true);
    };

    const confirmRemoveUserFromCommunity = () => {
        if (!community || !userToRemove) return;

        removeUserFromCommunityMutation.mutate({
            communityId: community.id,
            userId: userToRemove,
        });
        setIsRemoveUserDialogOpen(false);
        setUserToRemove(null);
    };

    // Don't render anything meaningful during SSR to avoid hydration mismatches
    if (!isClient) {
        return <CommunityDetailSkeleton />;
    }

    if (session === undefined) {
        return <CommunityDetailSkeleton />;
    }

    if (!session) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h1 className="mb-4 text-3xl font-bold">
                    Authentication Required
                </h1>
                <p className="text-muted-foreground mb-8">
                    Please sign in to view this community.
                </p>
                <Button asChild>
                    <Link href="/auth/login">Sign In</Link>
                </Button>
            </div>
        );
    }

    // Only show loading state on client after hydration
    if (isClient && isLoading) {
        return <CommunityDetailSkeleton />;
    }

    if (!community) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h1 className="mb-4 text-3xl font-bold">Community Not Found</h1>
                <p className="text-muted-foreground mb-8">
                    The community you're looking for doesn't exist or has been
                    removed.
                </p>
                <Button asChild>
                    <Link href="/communities">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Communities
                    </Link>
                </Button>
            </div>
        );
    }

    // Check if user is a member or follower
    const userMembership = community.members?.find(
        (m) => m.userId === session.user.id,
    );

    const isMember =
        !!userMembership && userMembership.membershipType === 'member';
    const isFollower =
        !!userMembership && userMembership.membershipType === 'follower';
    const isModerator = !!userMembership && userMembership.role === 'moderator';
    const isAdmin = !!userMembership && userMembership.role === 'admin';

    return (
        <div className="py-8">
            {/* Banner and Community Info */}
            <div className="relative mb-16">
                <div className="h-48 w-full overflow-hidden rounded-t-lg bg-gradient-to-r from-blue-400 to-blue-600">
                    {community.banner && (
                        <img
                            src={community.banner}
                            alt={`${community.name} banner`}
                            className="h-full w-full object-cover"
                        />
                    )}
                </div>

                <div className="absolute -bottom-12 left-8 flex items-end">
                    <Avatar className="border-background h-24 w-24 border-4">
                        <AvatarImage
                            src={community.avatar || undefined}
                            alt={community.name}
                        />
                        <AvatarFallback className="bg-primary text-2xl">
                            {community.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="mb-2 ml-4">
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-bold">
                                {community.name}
                            </h1>
                            {community.type === 'private' ? (
                                <Lock className="text-muted-foreground h-5 w-5" />
                            ) : (
                                <Globe className="text-muted-foreground h-5 w-5" />
                            )}
                        </div>
                        <div className="text-muted-foreground mt-1 flex items-center gap-3 text-sm">
                            <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {community.members?.length || 0} members
                            </div>
                            <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Created{' '}
                                {new Date(
                                    community.createdAt,
                                ).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="absolute right-8 bottom-0 flex gap-3">
                    {isMember ? (
                        <Button
                            variant="outline"
                            onClick={handleLeaveCommunity}
                            disabled={isActionInProgress || isAdmin}
                        >
                            {/* {isAdmin ? "Admin can't leave" : "Leave Community"} */}
                            {isAdmin ? 'Admin' : 'Leave Community'}
                        </Button>
                    ) : isFollower ? (
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={handleUnfollowCommunity}
                                disabled={isActionInProgress}
                            >
                                {isActionInProgress
                                    ? 'Processing...'
                                    : 'Unfollow'}
                            </Button>
                            {hasPendingJoinRequest ? (
                                <Button disabled variant="secondary">
                                    Join Request Pending
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleJoinCommunity}
                                    disabled={isActionInProgress}
                                >
                                    {isActionInProgress
                                        ? 'Processing...'
                                        : 'Join Community'}
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            {hasPendingFollowRequest ? (
                                <Button disabled variant="secondary">
                                    Follow Request Pending
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    onClick={handleFollowCommunity}
                                    disabled={isActionInProgress}
                                >
                                    {isActionInProgress
                                        ? 'Processing...'
                                        : 'Follow'}
                                </Button>
                            )}

                            {hasPendingJoinRequest ? (
                                <Button disabled variant="secondary">
                                    Join Request Pending
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleJoinCommunity}
                                    disabled={isActionInProgress}
                                >
                                    {isActionInProgress
                                        ? 'Processing...'
                                        : 'Join Community'}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Community Description */}
            <div className="mb-8">
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-muted-foreground">
                            {community.description ||
                                'No description provided.'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs for Posts, About, Members */}
            <Tabs
                defaultValue="posts"
                className="w-full"
                onValueChange={setActiveTab}
            >
                <TabsList className="mb-6">
                    <TabsTrigger value="posts">Posts</TabsTrigger>
                    <TabsTrigger value="about">About</TabsTrigger>
                    <TabsTrigger value="members">Members</TabsTrigger>
                    {(isModerator || isAdmin) && (
                        <TabsTrigger value="manage" className="relative">
                            Manage
                            {pendingRequests && pendingRequests.length > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                                    {pendingRequests.length}
                                </span>
                            )}
                        </TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="posts" className="space-y-4">
                    {isMember && (
                        <div className="mb-6">
                            <Button asChild className="w-full">
                                <Link
                                    href={`/posts/new?communityId=${community.id}&communitySlug=${community.slug}`}
                                >
                                    Create Post
                                </Link>
                            </Button>
                        </div>
                    )}

                    {!isMember && isFollower && (
                        <div className="bg-muted/50 mb-6 rounded-md p-4 text-center">
                            <p className="text-muted-foreground mb-2">
                                You need to be a member to create posts
                            </p>
                            <Button
                                onClick={handleJoinCommunity}
                                disabled={isActionInProgress}
                            >
                                {isActionInProgress
                                    ? 'Processing...'
                                    : 'Join Community'}
                            </Button>
                        </div>
                    )}

                    {!isMember &&
                        !isFollower &&
                        community.type === 'private' && (
                            <div className="bg-muted/50 mb-6 rounded-md p-4 text-center">
                                <p className="text-muted-foreground mb-2">
                                    You need to follow or join this community to
                                    view posts
                                </p>
                                <div className="mt-4 flex justify-center gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={handleFollowCommunity}
                                        disabled={isActionInProgress}
                                    >
                                        {isActionInProgress
                                            ? 'Processing...'
                                            : 'Follow Community'}
                                    </Button>
                                    <Button
                                        onClick={handleJoinCommunity}
                                        disabled={isActionInProgress}
                                    >
                                        {isActionInProgress
                                            ? 'Processing...'
                                            : 'Join Community'}
                                    </Button>
                                </div>
                            </div>
                        )}

                    {community.posts && community.posts.length > 0 ? (
                        <div className="space-y-4">
                            {community.posts.map((post: any) => (
                                <Card key={post.id}>
                                    <CardHeader>
                                        <CardTitle>
                                            <Link
                                                href={`/posts/${post.id}`}
                                                className="hover:underline"
                                            >
                                                {post.title}
                                            </Link>
                                        </CardTitle>
                                        <CardDescription>
                                            Posted by{' '}
                                            {post.author?.name || 'Unknown'} •{' '}
                                            {new Date(
                                                post.createdAt,
                                            ).toLocaleDateString()}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div
                                            className="prose prose-sm line-clamp-3 max-w-none"
                                            dangerouslySetInnerHTML={{
                                                __html: post.content,
                                            }}
                                        />
                                    </CardContent>
                                    <CardFooter className="flex justify-between">
                                        <div className="flex items-center gap-4">
                                            <span className="text-muted-foreground flex items-center gap-1 text-sm">
                                                <MessageSquare className="h-4 w-4" />
                                                {post.comments?.length || 0}{' '}
                                                comments
                                            </span>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            asChild
                                        >
                                            <Link href={`/posts/${post.id}`}>
                                                Read More
                                            </Link>
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : community.type === 'private' &&
                      !isMember &&
                      !isFollower ? (
                        <div className="py-12 text-center">
                            <h3 className="text-lg font-medium">
                                Private Community
                            </h3>
                            <p className="text-muted-foreground mt-2">
                                Follow or join this community to view posts.
                            </p>
                        </div>
                    ) : (
                        <div className="py-12 text-center">
                            <h3 className="text-lg font-medium">
                                No posts yet
                            </h3>
                            <p className="text-muted-foreground mt-2">
                                {isMember
                                    ? 'Be the first to create a post in this community!'
                                    : 'No posts have been created yet.'}
                            </p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="about">
                    <Card>
                        <CardHeader>
                            <CardTitle>Community Rules</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {community.rules ? (
                                <div className="whitespace-pre-line">
                                    {community.rules}
                                </div>
                            ) : (
                                <p className="text-muted-foreground">
                                    No rules have been set for this community.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="members">
                    <Card>
                        <CardHeader>
                            <CardTitle>Members</CardTitle>
                            <CardDescription>
                                People who are part of this community
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {community.members &&
                            community.members.length > 0 ? (
                                <div className="space-y-2">
                                    {community.members
                                        .sort((a, b) => {
                                            // Sort by role: admins first, then moderators, then members
                                            const roleOrder = {
                                                admin: 0,
                                                moderator: 1,
                                                member: 2,
                                                follower: 3,
                                            };
                                            return (
                                                roleOrder[
                                                    a.role as keyof typeof roleOrder
                                                ] -
                                                roleOrder[
                                                    b.role as keyof typeof roleOrder
                                                ]
                                            );
                                        })
                                        .map((member: any) => (
                                            <div
                                                key={member.userId}
                                                className="flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {member.user?.id ? (
                                                        <UserProfilePopover
                                                            userId={
                                                                member.user.id
                                                            }
                                                        >
                                                            <Avatar className="cursor-pointer">
                                                                <AvatarImage
                                                                    src={
                                                                        member
                                                                            .user
                                                                            ?.image
                                                                    }
                                                                />
                                                                <AvatarFallback>
                                                                    {member.user?.name
                                                                        ?.substring(
                                                                            0,
                                                                            2,
                                                                        )
                                                                        .toUpperCase() ||
                                                                        'U'}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                        </UserProfilePopover>
                                                    ) : (
                                                        <Avatar>
                                                            <AvatarImage
                                                                src={
                                                                    member.user
                                                                        ?.image
                                                                }
                                                            />
                                                            <AvatarFallback>
                                                                {member.user?.name
                                                                    ?.substring(
                                                                        0,
                                                                        2,
                                                                    )
                                                                    .toUpperCase() ||
                                                                    'U'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    )}
                                                    <div>
                                                        {member.user?.id ? (
                                                            <UserProfilePopover
                                                                userId={
                                                                    member.user
                                                                        .id
                                                                }
                                                            >
                                                                <p className="cursor-pointer text-sm font-medium hover:underline">
                                                                    {member.user
                                                                        ?.name ||
                                                                        'Unknown User'}
                                                                </p>
                                                            </UserProfilePopover>
                                                        ) : (
                                                            <p className="text-sm font-medium">
                                                                {member.user
                                                                    ?.name ||
                                                                    'Unknown User'}
                                                            </p>
                                                        )}
                                                        <p className="text-muted-foreground text-xs">
                                                            {member.role
                                                                .charAt(0)
                                                                .toUpperCase() +
                                                                member.role.slice(
                                                                    1,
                                                                )}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant={
                                                            member.role ===
                                                            'admin'
                                                                ? 'default'
                                                                : member.role ===
                                                                    'moderator'
                                                                  ? 'secondary'
                                                                  : 'outline'
                                                        }
                                                    >
                                                        {member.role === 'admin'
                                                            ? 'Admin'
                                                            : member.role ===
                                                                'moderator'
                                                              ? 'Moderator'
                                                              : 'Member'}
                                                    </Badge>

                                                    {isAdmin &&
                                                        member.role ===
                                                            'member' && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    handleAssignModerator(
                                                                        member.userId,
                                                                    )
                                                                }
                                                            >
                                                                <Shield className="mr-1 h-4 w-4" />
                                                                Make Moderator
                                                            </Button>
                                                        )}

                                                    {isAdmin &&
                                                        member.role ===
                                                            'moderator' && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    handleRemoveModerator(
                                                                        member.userId,
                                                                    )
                                                                }
                                                            >
                                                                <UserMinus className="mr-1 h-4 w-4" />
                                                                Remove Mod
                                                            </Button>
                                                        )}

                                                    {isAdmin &&
                                                        member.role !==
                                                            'admin' &&
                                                        community.createdBy !==
                                                            member.userId && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    handleRemoveUserFromCommunity(
                                                                        member.userId,
                                                                    )
                                                                }
                                                            >
                                                                <UserMinus className="mr-1 h-4 w-4" />
                                                                Kick User
                                                            </Button>
                                                        )}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground">
                                    No members found.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {(isModerator || isAdmin) && (
                    <TabsContent value="manage">
                        <Card className="mb-6">
                            <CardHeader>
                                <CardTitle>Pending Requests</CardTitle>
                                <CardDescription>
                                    Manage join and follow requests for this
                                    community
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {pendingRequests &&
                                pendingRequests.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>User</TableHead>
                                                <TableHead>
                                                    Request Type
                                                </TableHead>
                                                <TableHead>
                                                    Requested At
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Actions
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {pendingRequests.map((request) => (
                                                <TableRow key={request.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage
                                                                    src={
                                                                        request
                                                                            .user
                                                                            ?.image ||
                                                                        undefined
                                                                    }
                                                                />
                                                                <AvatarFallback>
                                                                    {request.user?.name
                                                                        ?.substring(
                                                                            0,
                                                                            2,
                                                                        )
                                                                        .toUpperCase() ||
                                                                        'U'}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span>
                                                                {
                                                                    request.user
                                                                        ?.name
                                                                }
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={
                                                                request.requestType ===
                                                                'join'
                                                                    ? 'default'
                                                                    : 'secondary'
                                                            }
                                                        >
                                                            {request.requestType ===
                                                            'join'
                                                                ? 'Join'
                                                                : 'Follow'}
                                                        </Badge>
                                                        <div className="text-muted-foreground mt-1 text-xs">
                                                            {request.requestType ===
                                                            'join'
                                                                ? 'User wants to become a member'
                                                                : 'User wants to follow posts'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {new Date(
                                                            request.requestedAt,
                                                        ).toLocaleDateString()}
                                                        <div className="text-muted-foreground mt-1 text-xs">
                                                            {getRelativeTime(
                                                                new Date(
                                                                    request.requestedAt,
                                                                ),
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    handleApproveRequest(
                                                                        request.id,
                                                                    )
                                                                }
                                                            >
                                                                <CheckCircle className="mr-1 h-4 w-4" />
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    handleRejectRequest(
                                                                        request.id,
                                                                    )
                                                                }
                                                            >
                                                                <XCircle className="mr-1 h-4 w-4" />
                                                                Reject
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <p className="text-muted-foreground py-4 text-center">
                                        No pending requests at this time.
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {isAdmin && (
                            <Card className="mb-6">
                                <CardHeader>
                                    <CardTitle>Community Settings</CardTitle>
                                    <CardDescription>
                                        Manage community details and settings
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Button asChild className="mr-2">
                                        <Link
                                            href={`/communities/${community.slug}/edit`}
                                        >
                                            Edit Community
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardHeader>
                                <CardTitle>Invite Members</CardTitle>
                                <CardDescription>
                                    Send email invitations to join this
                                    community
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    onClick={() =>
                                        setIsInviteEmailDialogOpen(true)
                                    }
                                >
                                    Invite
                                </Button>

                                <InviteEmailDialog
                                    open={isInviteEmailDialogOpen}
                                    onOpenChange={setIsInviteEmailDialogOpen}
                                    communityId={community.id}
                                    communityName={community.name}
                                    isAdmin={isAdmin}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>

            {/* Leave Community Alert Dialog */}
            <AlertDialog
                open={isLeaveCommunityDialogOpen}
                onOpenChange={setIsLeaveCommunityDialogOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Leave Community</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to leave this community? You
                            will no longer have access to member-only content.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmLeaveCommunity}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Leave Community
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Remove Moderator Alert Dialog */}
            <AlertDialog
                open={isRemoveModeratorDialogOpen}
                onOpenChange={setIsRemoveModeratorDialogOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Moderator</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove this user's
                            moderator role? They will remain a member of the
                            community but will no longer have moderation
                            privileges.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmRemoveModerator}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Remove Moderator
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Remove User Alert Dialog */}
            <AlertDialog
                open={isRemoveUserDialogOpen}
                onOpenChange={setIsRemoveUserDialogOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove User</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove this user from the
                            community? They will lose access to all community
                            content and will need to rejoin to access it again.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmRemoveUserFromCommunity}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Remove User
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function CommunityDetailSkeleton() {
    return (
        <div className="container mx-auto px-4 py-8 md:px-6">
            {/* Banner and Community Info Skeleton */}
            <div className="relative mb-16">
                <Skeleton className="h-48 w-full rounded-t-lg" />

                <div className="absolute -bottom-12 left-8 flex items-end">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div className="mb-2 ml-4">
                        <Skeleton className="mb-2 h-8 w-64" />
                        <Skeleton className="h-4 w-40" />
                    </div>
                </div>

                <div className="absolute right-8 bottom-0">
                    <Skeleton className="h-10 w-32" />
                </div>
            </div>

            {/* Description Skeleton */}
            <div className="mb-8">
                <Card>
                    <CardContent className="pt-6">
                        <Skeleton className="h-20 w-full" />
                    </CardContent>
                </Card>
            </div>

            {/* Tabs Skeleton */}
            <div className="mb-6">
                <Skeleton className="h-10 w-80" />
            </div>

            {/* Content Skeleton */}
            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-20 w-full" />
                    </CardContent>
                    <CardFooter>
                        <Skeleton className="h-8 w-24" />
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-2/3" />
                        <Skeleton className="h-4 w-1/3" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-20 w-full" />
                    </CardContent>
                    <CardFooter>
                        <Skeleton className="h-8 w-24" />
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
