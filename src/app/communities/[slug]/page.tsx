'use client';

import { useEffect, useState, useMemo } from 'react';
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
    MessageSquare,
    Calendar,
    ArrowLeft,
    CheckCircle,
    XCircle,
    Shield,
    UserMinus,
    Plus,
    MoreHorizontal,
    Trash2,
    Edit,
    Tag,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSession } from '@/server/auth/client';
import { toast } from 'sonner';
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
import { CreateTagDialog } from '@/components/create-tag-dialog';
import { EditTagDialog } from '@/components/edit-tag-dialog';
import { DeleteTagDialog } from '@/components/delete-tag-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { usePermission } from '@/hooks/use-permission';
import { PERMISSIONS } from '@/lib/permissions/permission-const';
import { SafeHtml } from '@/lib/sanitize';

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

    const [createTagDialogOpen, setCreateTagDialogOpen] = useState(false);
    const [editTagDialogOpen, setEditTagDialogOpen] = useState(false);
    const [deleteTagDialogOpen, setDeleteTagDialogOpen] = useState(false);
    const [selectedTag, setSelectedTag] = useState<any>(null);

    // Tag filtering state
    const [selectedTagFilters, setSelectedTagFilters] = useState<number[]>([]);

    const { checkCommunityPermission } = usePermission();
    const canCreatePost = checkCommunityPermission(
        community?.id?.toString() ?? '',
        PERMISSIONS.CREATE_POST,
    );
    const canEditPost = checkCommunityPermission(
        community?.id?.toString() ?? '',
        PERMISSIONS.EDIT_POST,
    );
    const canDeletePost = checkCommunityPermission(
        community?.id?.toString() ?? '',
        PERMISSIONS.DELETE_POST,
    );

    const canCreateTag = checkCommunityPermission(
        community?.id?.toString() ?? '',
        PERMISSIONS.CREATE_TAG,
    );
    const canEditTag = checkCommunityPermission(
        community?.id?.toString() ?? '',
        PERMISSIONS.EDIT_TAG,
    );
    const canDeleteTag = checkCommunityPermission(
        community?.id?.toString() ?? '',
        PERMISSIONS.DELETE_TAG,
    );

    const canManageCommunityMembers = checkCommunityPermission(
        community?.id?.toString() ?? '',
        PERMISSIONS.MANAGE_COMMUNITY_MEMBERS,
    );
    const canInviteCommunityMembers = checkCommunityPermission(
        community?.id?.toString() ?? '',
        PERMISSIONS.INVITE_COMMUNITY_MEMBERS,
    );

    const handleEditTag = (tag: any) => {
        setSelectedTag(tag);
        setEditTagDialogOpen(true);
    };

    const handleDeleteTag = (tag: any) => {
        setSelectedTag(tag);
        setDeleteTagDialogOpen(true);
    };

    // Pagination for members
    const [currentMembersPage, setCurrentMembersPage] = useState(1);
    const membersPerPage = 10;

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
        onSettled: () => {
            setIsActionInProgress(false);
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
            onSettled: () => {
                setIsActionInProgress(false);
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

    // Handle tab change and reset pagination
    const handleTabChange = (value: string) => {
        setActiveTab(value);
        // Reset pagination when switching tabs
        setCurrentMembersPage(1);
    };

    // Filter posts by selected tags
    const filteredPosts = useMemo(() => {
        if (!community?.posts) return [];

        if (selectedTagFilters.length === 0) {
            return community.posts;
        }

        return community.posts.filter(
            (post: any) =>
                post.tags &&
                post.tags.some((tag: any) =>
                    selectedTagFilters.includes(tag.id),
                ),
        );
    }, [community?.posts, selectedTagFilters]);

    // Handle tag filter toggle
    const handleTagFilterToggle = (tagId: number) => {
        setSelectedTagFilters((prev) =>
            prev.includes(tagId)
                ? prev.filter((id) => id !== tagId)
                : [...prev, tagId],
        );
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
        <div className="container mx-auto py-6">
            {/* Responsive Banner and Community Info */}
            {/* Professional Banner with Overlapping Avatar */}
            <div className="mb-8">
                {/* Banner Image */}
                <div className="relative h-32 w-full overflow-hidden rounded-lg bg-gradient-to-r from-blue-400 to-blue-600 sm:h-40 md:h-48 lg:h-56">
                    {community.banner && (
                        <img
                            src={community.banner || '/placeholder.svg'}
                            alt={`${community.name} banner`}
                            className="h-full w-full object-cover"
                        />
                    )}
                    {/* Overlay for better text readability */}
                    <div className="absolute inset-0 bg-black/20" />
                </div>

                {/* Overlapping Content Container */}
                <div className="relative -mt-8 px-4 sm:-mt-10 sm:px-6 md:-mt-12 md:px-8 lg:-mt-16">
                    {/* Mobile Layout */}
                    <div className="block lg:hidden">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                                <Avatar className="border-background h-16 w-16 border-4 shadow-lg sm:h-20 sm:w-20">
                                    <AvatarImage
                                        src={community.avatar || undefined}
                                        alt={community.name}
                                    />
                                    <AvatarFallback className="bg-primary text-lg font-semibold sm:text-xl">
                                        {community.name
                                            .substring(0, 2)
                                            .toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            </div>

                            {/* Community Info */}
                            <div className="min-w-0 flex-1 sm:pb-2">
                                <div className="mb-2 flex items-center gap-2">
                                    <h1 className="text-foreground truncate text-xl font-bold sm:text-2xl">
                                        {community.name}
                                    </h1>
                                    {community.type === 'private' ? (
                                        <Lock className="text-muted-foreground h-4 w-4 flex-shrink-0 sm:h-5 sm:w-5" />
                                    ) : (
                                        <Globe className="text-muted-foreground h-4 w-4 flex-shrink-0 sm:h-5 sm:w-5" />
                                    )}
                                </div>
                                <div className="text-muted-foreground space-y-1 text-sm">
                                    <div className="flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        <span>
                                            {community.members?.length || 0}{' '}
                                            members
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>
                                            Created{' '}
                                            {new Date(
                                                community.createdAt,
                                            ).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons - Mobile */}
                        <div className="mt-4 flex flex-col gap-2">
                            {isMember ? (
                                <Button
                                    variant="outline"
                                    onClick={handleLeaveCommunity}
                                    disabled={isActionInProgress || isAdmin}
                                    className="w-full bg-transparent"
                                >
                                    {isAdmin ? 'Admin' : 'Leave Community'}
                                </Button>
                            ) : isFollower ? (
                                <div className="flex flex-col gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={handleUnfollowCommunity}
                                        disabled={isActionInProgress}
                                        className="w-full bg-transparent"
                                    >
                                        {isActionInProgress
                                            ? 'Processing...'
                                            : 'Unfollow'}
                                    </Button>
                                    {hasPendingJoinRequest ? (
                                        <Button
                                            disabled
                                            variant="secondary"
                                            className="w-full"
                                        >
                                            Join Request Pending
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={handleJoinCommunity}
                                            disabled={isActionInProgress}
                                            className="w-full"
                                        >
                                            {isActionInProgress
                                                ? 'Processing...'
                                                : 'Join Community'}
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {hasPendingFollowRequest ? (
                                        <Button
                                            disabled
                                            variant="secondary"
                                            className="w-full"
                                        >
                                            Follow Request Pending
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            onClick={handleFollowCommunity}
                                            disabled={isActionInProgress}
                                            className="w-full bg-transparent"
                                        >
                                            {isActionInProgress
                                                ? 'Processing...'
                                                : 'Follow'}
                                        </Button>
                                    )}
                                    {hasPendingJoinRequest ? (
                                        <Button
                                            disabled
                                            variant="secondary"
                                            className="w-full"
                                        >
                                            Join Request Pending
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={handleJoinCommunity}
                                            disabled={isActionInProgress}
                                            className="w-full"
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

                    {/* Desktop Layout */}
                    <div className="hidden lg:flex lg:items-end lg:justify-between">
                        {/* Left side - Avatar and Info */}
                        <div className="flex items-end gap-6">
                            <Avatar className="border-background h-24 w-24 border-4 shadow-lg xl:h-28 xl:w-28">
                                <AvatarImage
                                    src={community.avatar || undefined}
                                    alt={community.name}
                                />
                                <AvatarFallback className="bg-primary text-2xl font-semibold xl:text-3xl">
                                    {community.name
                                        .substring(0, 2)
                                        .toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="pb-3">
                                <div className="mb-2 flex items-center gap-3">
                                    <h1 className="text-foreground text-3xl font-bold xl:text-4xl">
                                        {community.name}
                                    </h1>
                                    {community.type === 'private' ? (
                                        <Lock className="text-muted-foreground h-6 w-6" />
                                    ) : (
                                        <Globe className="text-muted-foreground h-6 w-6" />
                                    )}
                                </div>
                                <div className="text-muted-foreground flex items-center gap-6 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        <span>
                                            {community.members?.length || 0}{' '}
                                            members
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        <span>
                                            Created{' '}
                                            {new Date(
                                                community.createdAt,
                                            ).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right side - Action Buttons */}
                        <div className="pb-3">
                            {isMember ? (
                                <Button
                                    variant="outline"
                                    onClick={handleLeaveCommunity}
                                    disabled={isActionInProgress || isAdmin}
                                >
                                    {isAdmin ? 'Admin' : 'Leave Community'}
                                </Button>
                            ) : isFollower ? (
                                <div className="flex gap-3">
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
                                <div className="flex gap-3">
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
                </div>
            </div>

            {/* Enhanced Tabs with Icons and Proper Borders */}
            <Tabs
                defaultValue="posts"
                className="w-full"
                onValueChange={handleTabChange}
            >
                <div className="border-border border-b">
                    <TabsList className="h-auto w-auto justify-start border-0 bg-transparent p-0">
                        <TabsTrigger
                            value="about"
                            className="data-[state=active]:border-primary flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                        >
                            <Globe className="h-4 w-4 sm:hidden" />
                            <span className="hidden sm:inline">Overview</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="posts"
                            className="data-[state=active]:border-primary flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                        >
                            <MessageSquare className="h-4 w-4 sm:hidden" />
                            <span className="hidden sm:inline">Posts</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="tags"
                            className="data-[state=active]:border-primary flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                        >
                            <Tag className="h-4 w-4 sm:hidden" />
                            <span className="hidden sm:inline">Tags</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="members"
                            className="data-[state=active]:border-primary flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                        >
                            <Users className="h-4 w-4 sm:hidden" />
                            <span className="hidden sm:inline">Members</span>
                        </TabsTrigger>
                        {canManageCommunityMembers && (
                            <TabsTrigger
                                value="manage"
                                className="data-[state=active]:border-primary relative flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                            >
                                <Shield className="h-4 w-4 sm:hidden" />
                                <span className="hidden sm:inline">Manage</span>
                                {pendingRequests &&
                                    pendingRequests.length > 0 && (
                                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                                            {pendingRequests.length}
                                        </span>
                                    )}
                            </TabsTrigger>
                        )}
                    </TabsList>
                </div>

                <div className="mt-6">
                    <TabsContent value="tags" className="mt-0 space-y-6">
                        {community.tags && community.tags.length > 0 ? (
                            <div>
                                <div className="mb-4 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <h2 className="text-xl font-semibold">
                                            Tags
                                        </h2>
                                        <p className="text-muted-foreground text-sm">
                                            Manage tags for this community
                                        </p>
                                    </div>
                                    {canCreateTag && (
                                        <Button
                                            variant="outline"
                                            onClick={() =>
                                                setCreateTagDialogOpen(true)
                                            }
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Create Tag
                                        </Button>
                                    )}
                                </div>

                                <div className="overflow-hidden rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Title</TableHead>
                                                <TableHead>
                                                    Description
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Actions
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {community.tags.map((tag: any) => (
                                                <TableRow key={tag.id}>
                                                    <TableCell>
                                                        {tag.name}
                                                    </TableCell>
                                                    <TableCell>
                                                        {tag.description}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {(canEditTag ||
                                                            canDeleteTag) && (
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger
                                                                    asChild
                                                                >
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                    >
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    {canEditTag && (
                                                                        <DropdownMenuItem
                                                                            onClick={() =>
                                                                                handleEditTag(
                                                                                    tag,
                                                                                )
                                                                            }
                                                                        >
                                                                            <Edit className="mr-2 h-4 w-4" />
                                                                            Edit
                                                                            Tag
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    <DropdownMenuSeparator />
                                                                    {canDeleteTag && (
                                                                        <DropdownMenuItem
                                                                            onClick={() =>
                                                                                handleDeleteTag(
                                                                                    tag,
                                                                                )
                                                                            }
                                                                            className="text-destructive"
                                                                        >
                                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                                            Delete
                                                                            Tag
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        ) : (
                            <div className="py-12 text-center">
                                <Calendar className="text-muted-foreground mx-auto mb-4 h-12 w-12 opacity-50" />
                                <p className="text-muted-foreground">
                                    No tags yet.
                                </p>
                                {canCreateTag && (
                                    <Button
                                        onClick={() =>
                                            setCreateTagDialogOpen(true)
                                        }
                                        className="mt-4"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create Tag
                                    </Button>
                                )}
                            </div>
                        )}

                        <CreateTagDialog
                            open={createTagDialogOpen}
                            onOpenChange={setCreateTagDialogOpen}
                            communityId={community.id}
                        />

                        <EditTagDialog
                            open={editTagDialogOpen}
                            onOpenChange={setEditTagDialogOpen}
                            tag={selectedTag}
                        />

                        <DeleteTagDialog
                            open={deleteTagDialogOpen}
                            onOpenChange={setDeleteTagDialogOpen}
                            tag={selectedTag}
                        />
                    </TabsContent>

                    <TabsContent value="posts" className="mt-0 space-y-6">
                        {/* Show loading skeleton while data is being fetched */}
                        {isLoading ? (
                            <div className="space-y-4">
                                {[...Array(3)].map((_, index) => (
                                    <Card
                                        key={index}
                                        className="relative gap-2 py-2"
                                    >
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
                                {/* Posts header and tag filters */}
                                <div className="mb-6 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <h2 className="text-xl font-semibold">
                                            Posts
                                        </h2>
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

                                {/* Tag Filter */}
                                {community.tags &&
                                    community.tags.length > 0 && (
                                        <div className="mt-4 mb-6">
                                            <div className="flex flex-wrap gap-2">
                                                {community.tags.map(
                                                    (tag: any) => (
                                                        <button
                                                            key={tag.id}
                                                            onClick={() =>
                                                                handleTagFilterToggle(
                                                                    tag.id,
                                                                )
                                                            }
                                                            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                                                                selectedTagFilters.includes(
                                                                    tag.id,
                                                                )
                                                                    ? 'bg-primary text-primary-foreground'
                                                                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                                            }`}
                                                        >
                                                            {tag.name}
                                                        </button>
                                                    ),
                                                )}
                                                {selectedTagFilters.length >
                                                    0 && (
                                                    <button
                                                        onClick={() =>
                                                            setSelectedTagFilters(
                                                                [],
                                                            )
                                                        }
                                                        className="bg-muted text-muted-foreground hover:bg-muted/80 inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
                                                    >
                                                        Clear Filters
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                {/* Render posts for members */}
                                {isMember &&
                                    filteredPosts &&
                                    filteredPosts.length > 0 && (
                                        <div className="space-y-4">
                                            {filteredPosts.map((post: any) => (
                                                <Link
                                                    key={post.id}
                                                    href={`/communities/${community.slug}/posts/${post.id}`}
                                                    className="block"
                                                    style={{
                                                        textDecoration: 'none',
                                                    }}
                                                >
                                                    <Card className="relative gap-2 py-2 transition-shadow hover:shadow-md">
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
                                                                        [Content
                                                                        deleted]
                                                                    </span>
                                                                    <span className="text-muted-foreground block text-xs">
                                                                        Removed
                                                                        on{' '}
                                                                        {new Date(
                                                                            post.updatedAt,
                                                                        ).toLocaleString()}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <div className="text-muted-foreground text-sm">
                                                                    <SafeHtml
                                                                        html={
                                                                            post.content
                                                                        }
                                                                        className="line-clamp-2 overflow-hidden leading-5 text-ellipsis"
                                                                    />
                                                                </div>
                                                            )}

                                                            {/* Tags display */}
                                                            {post.tags &&
                                                                post.tags
                                                                    .length >
                                                                    0 && (
                                                                    <div className="mt-2 flex flex-wrap gap-1">
                                                                        {post.tags
                                                                            .slice(
                                                                                0,
                                                                                3,
                                                                            )
                                                                            .map(
                                                                                (
                                                                                    tag: any,
                                                                                ) => (
                                                                                    <span
                                                                                        key={
                                                                                            tag.id
                                                                                        }
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
                                                                                        {
                                                                                            tag.name
                                                                                        }
                                                                                    </span>
                                                                                ),
                                                                            )}
                                                                        {post
                                                                            .tags
                                                                            .length >
                                                                            3 && (
                                                                            <span className="bg-secondary text-muted-foreground inline-flex items-center rounded-full px-2 py-1 text-xs font-medium">
                                                                                +
                                                                                {post
                                                                                    .tags
                                                                                    .length -
                                                                                    3}{' '}
                                                                                more
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}

                                                            {/* Post metadata */}
                                                            <div className="mt-3 flex items-center justify-between">
                                                                <div className="flex items-center">
                                                                    <span className="text-muted-foreground text-xs">
                                                                        Posted
                                                                        by{' '}
                                                                        {post
                                                                            .author
                                                                            ?.id ? (
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
                                                                                        .name ||
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
                                                                            className="text-muted-foreground flex items-center text-xs"
                                                                            onClick={(
                                                                                e,
                                                                            ) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                router.push(
                                                                                    `/posts/${post.id}`,
                                                                                );
                                                                            }}
                                                                        >
                                                                            <MessageSquare className="mr-1 h-3 w-3" />
                                                                            {Array.isArray(
                                                                                post.comments,
                                                                            )
                                                                                ? post
                                                                                      .comments
                                                                                      .length
                                                                                : 0}
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* Action buttons */}
                                                                <div className="flex space-x-1">
                                                                    {canEditPost && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(
                                                                                e: React.MouseEvent,
                                                                            ) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                router.push(
                                                                                    `/communities/${community.slug}/posts/${post.id}/edit`,
                                                                                );
                                                                            }}
                                                                            className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-full p-1.5"
                                                                        >
                                                                            <Edit className="h-4 w-4" />
                                                                        </button>
                                                                    )}
                                                                    {canDeletePost && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(
                                                                                e,
                                                                            ) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                // Add your delete logic here, e.g. open a dialog or call a mutation
                                                                                toast.info(
                                                                                    'Delete post clicked',
                                                                                );
                                                                            }}
                                                                            className="text-muted-foreground hover:bg-accent hover:text-destructive rounded-full p-1.5"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                </Link>
                                            ))}
                                        </div>
                                    )}

                                {/* Empty state for members */}
                                {isMember &&
                                    (!filteredPosts ||
                                        filteredPosts.length === 0) && (
                                        <div className="py-12 text-center">
                                            <Calendar className="text-muted-foreground mx-auto mb-4 h-12 w-12 opacity-50" />
                                            <p className="text-muted-foreground">
                                                {selectedTagFilters.length > 0
                                                    ? 'No posts match the selected tags.'
                                                    : 'No posts yet.'}
                                            </p>
                                            {selectedTagFilters.length > 0 ? (
                                                <Button
                                                    onClick={() =>
                                                        setSelectedTagFilters(
                                                            [],
                                                        )
                                                    }
                                                    className="mt-4"
                                                >
                                                    Clear Filters
                                                </Button>
                                            ) : canCreatePost ? (
                                                <Button
                                                    asChild
                                                    className="mt-4"
                                                >
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
                                        You need to follow or join this
                                        community to view posts
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
                    </TabsContent>

                    <TabsContent value="about" className="mt-0">
                        <div className="space-y-6">
                            <div>
                                <h2 className="mb-2 text-xl font-semibold">
                                    Overview
                                </h2>
                                <p className="text-muted-foreground">
                                    {community.description ||
                                        'No description provided.'}
                                </p>
                            </div>

                            <div>
                                <h3 className="mb-3 font-semibold">Rules</h3>
                                {community.rules ? (
                                    <div className="text-sm leading-relaxed whitespace-pre-line">
                                        {community.rules}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-sm">
                                        No rules have been set for this
                                        community.
                                    </p>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="members" className="mt-0">
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <h2 className="text-xl font-semibold">
                                        Members
                                    </h2>
                                    <p className="text-muted-foreground text-sm">
                                        People who are part of this community
                                    </p>
                                </div>
                                {canInviteCommunityMembers && (
                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            setIsInviteEmailDialogOpen(true)
                                        }
                                    >
                                        Invite Members
                                    </Button>
                                )}
                            </div>

                            {community.members &&
                            community.members.length > 0 ? (
                                <>
                                    <div className="overflow-hidden rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>User</TableHead>
                                                    <TableHead>Role</TableHead>
                                                    <TableHead>
                                                        Joined
                                                    </TableHead>
                                                    <TableHead className="text-right">
                                                        Actions
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
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
                                                    .slice(
                                                        (currentMembersPage -
                                                            1) *
                                                            membersPerPage,
                                                        currentMembersPage *
                                                            membersPerPage,
                                                    )
                                                    .map((member: any) => (
                                                        <TableRow
                                                            key={member.userId}
                                                        >
                                                            <TableCell>
                                                                <div className="flex items-center gap-3">
                                                                    {member.user
                                                                        ?.id ? (
                                                                        <UserProfilePopover
                                                                            userId={
                                                                                member
                                                                                    .user
                                                                                    .id
                                                                            }
                                                                        >
                                                                            <Avatar className="cursor-pointer">
                                                                                <AvatarImage
                                                                                    src={
                                                                                        member
                                                                                            .user
                                                                                            ?.image ||
                                                                                        '/placeholder.svg'
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
                                                                                    member
                                                                                        .user
                                                                                        ?.image ||
                                                                                    '/placeholder.svg'
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
                                                                        {member
                                                                            .user
                                                                            ?.id ? (
                                                                            <UserProfilePopover
                                                                                userId={
                                                                                    member
                                                                                        .user
                                                                                        .id
                                                                                }
                                                                            >
                                                                                <p className="cursor-pointer text-sm font-medium hover:underline">
                                                                                    {member
                                                                                        .user
                                                                                        ?.name ||
                                                                                        'Unknown User'}
                                                                                </p>
                                                                            </UserProfilePopover>
                                                                        ) : (
                                                                            <p className="text-sm font-medium">
                                                                                {member
                                                                                    .user
                                                                                    ?.name ||
                                                                                    'Unknown User'}
                                                                            </p>
                                                                        )}
                                                                        <p className="text-muted-foreground text-xs">
                                                                            {
                                                                                member
                                                                                    .user
                                                                                    ?.email
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
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
                                                                    {member.role ===
                                                                    'admin'
                                                                        ? 'Admin'
                                                                        : member.role ===
                                                                            'moderator'
                                                                          ? 'Moderator'
                                                                          : 'Member'}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                {member.joinedAt
                                                                    ? new Date(
                                                                          member.joinedAt,
                                                                      ).toLocaleDateString()
                                                                    : '-'}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {canManageCommunityMembers && (
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger
                                                                            asChild
                                                                        >
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                            >
                                                                                <MoreHorizontal className="h-4 w-4" />
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="end">
                                                                            {member.role ===
                                                                                'member' && (
                                                                                <DropdownMenuItem
                                                                                    onClick={() =>
                                                                                        handleAssignModerator(
                                                                                            member.userId,
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <Shield className="mr-2 h-4 w-4" />
                                                                                    Make
                                                                                    Moderator
                                                                                </DropdownMenuItem>
                                                                            )}
                                                                            {member.role ===
                                                                                'moderator' && (
                                                                                <DropdownMenuItem
                                                                                    onClick={() =>
                                                                                        handleRemoveModerator(
                                                                                            member.userId,
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <UserMinus className="mr-2 h-4 w-4" />
                                                                                    Remove
                                                                                    Mod
                                                                                </DropdownMenuItem>
                                                                            )}
                                                                            <DropdownMenuSeparator />
                                                                            <DropdownMenuItem
                                                                                onClick={() =>
                                                                                    handleRemoveUserFromCommunity(
                                                                                        member.userId,
                                                                                    )
                                                                                }
                                                                                className="text-destructive"
                                                                            >
                                                                                <UserMinus className="mr-2 h-4 w-4" />
                                                                                Kick
                                                                                User
                                                                            </DropdownMenuItem>
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {/* Pagination controls */}
                                    {community.members.length >
                                        membersPerPage && (
                                        <div className="mt-6">
                                            <div className="text-muted-foreground mb-2 text-center text-sm">
                                                Showing{' '}
                                                {(currentMembersPage - 1) *
                                                    membersPerPage +
                                                    1}{' '}
                                                to{' '}
                                                {Math.min(
                                                    currentMembersPage *
                                                        membersPerPage,
                                                    community.members.length,
                                                )}{' '}
                                                of {community.members.length}{' '}
                                                members
                                            </div>
                                            <div className="flex justify-center">
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            setCurrentMembersPage(
                                                                (prev) =>
                                                                    Math.max(
                                                                        prev -
                                                                            1,
                                                                        1,
                                                                    ),
                                                            )
                                                        }
                                                        disabled={
                                                            currentMembersPage ===
                                                            1
                                                        }
                                                    >
                                                        Previous
                                                    </Button>
                                                    <div className="flex items-center gap-1">
                                                        {(() => {
                                                            const totalPages =
                                                                Math.ceil(
                                                                    community
                                                                        .members
                                                                        .length /
                                                                        membersPerPage,
                                                                );
                                                            const pageNumbers =
                                                                [];
                                                            if (totalPages > 0)
                                                                pageNumbers.push(
                                                                    1,
                                                                );
                                                            if (
                                                                currentMembersPage >
                                                                3
                                                            )
                                                                pageNumbers.push(
                                                                    'ellipsis1',
                                                                );
                                                            for (
                                                                let i =
                                                                    Math.max(
                                                                        2,
                                                                        currentMembersPage -
                                                                            1,
                                                                    );
                                                                i <=
                                                                Math.min(
                                                                    totalPages -
                                                                        1,
                                                                    currentMembersPage +
                                                                        1,
                                                                );
                                                                i++
                                                            ) {
                                                                if (
                                                                    i !== 1 &&
                                                                    i !==
                                                                        totalPages
                                                                )
                                                                    pageNumbers.push(
                                                                        i,
                                                                    );
                                                            }
                                                            if (
                                                                currentMembersPage <
                                                                totalPages - 2
                                                            )
                                                                pageNumbers.push(
                                                                    'ellipsis2',
                                                                );
                                                            if (totalPages > 1)
                                                                pageNumbers.push(
                                                                    totalPages,
                                                                );

                                                            return pageNumbers.map(
                                                                (
                                                                    page,
                                                                    index,
                                                                ) => {
                                                                    if (
                                                                        page ===
                                                                            'ellipsis1' ||
                                                                        page ===
                                                                            'ellipsis2'
                                                                    ) {
                                                                        return (
                                                                            <span
                                                                                key={`ellipsis-${index}`}
                                                                                className="px-2"
                                                                            >
                                                                                ...
                                                                            </span>
                                                                        );
                                                                    }
                                                                    return (
                                                                        <Button
                                                                            key={`page-${page}`}
                                                                            variant={
                                                                                currentMembersPage ===
                                                                                page
                                                                                    ? 'default'
                                                                                    : 'outline'
                                                                            }
                                                                            size="sm"
                                                                            className="h-8 w-8 p-0"
                                                                            onClick={() =>
                                                                                setCurrentMembersPage(
                                                                                    page as number,
                                                                                )
                                                                            }
                                                                        >
                                                                            {
                                                                                page
                                                                            }
                                                                        </Button>
                                                                    );
                                                                },
                                                            );
                                                        })()}
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            setCurrentMembersPage(
                                                                (prev) =>
                                                                    Math.min(
                                                                        prev +
                                                                            1,
                                                                        Math.ceil(
                                                                            community
                                                                                .members
                                                                                .length /
                                                                                membersPerPage,
                                                                        ),
                                                                    ),
                                                            )
                                                        }
                                                        disabled={
                                                            currentMembersPage ===
                                                            Math.ceil(
                                                                community
                                                                    .members
                                                                    .length /
                                                                    membersPerPage,
                                                            )
                                                        }
                                                    >
                                                        Next
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-muted-foreground">
                                    No members found.
                                </p>
                            )}
                        </div>

                        <InviteEmailDialog
                            open={isInviteEmailDialogOpen}
                            onOpenChange={setIsInviteEmailDialogOpen}
                            communityId={community.id}
                            communityName={community.name}
                            isAdmin={isAdmin}
                        />
                    </TabsContent>

                    {canManageCommunityMembers && (
                        <TabsContent value="manage" className="mt-0">
                            <div className="space-y-6">
                                <div>
                                    <h2 className="mb-2 text-xl font-semibold">
                                        Pending Requests
                                    </h2>
                                    <p className="text-muted-foreground mb-4 text-sm">
                                        Manage join and follow requests for this
                                        community
                                    </p>

                                    {pendingRequests &&
                                    pendingRequests.length > 0 ? (
                                        <div className="overflow-hidden rounded-md border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>
                                                            User
                                                        </TableHead>
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
                                                    {pendingRequests.map(
                                                        (request) => (
                                                            <TableRow
                                                                key={request.id}
                                                            >
                                                                <TableCell>
                                                                    <div className="flex items-center gap-2">
                                                                        <Avatar className="h-8 w-8">
                                                                            <AvatarImage
                                                                                src={
                                                                                    request
                                                                                        .user
                                                                                        ?.image ||
                                                                                    undefined ||
                                                                                    '/placeholder.svg'
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
                                                                                request
                                                                                    .user
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
                                                        ),
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground py-8 text-center">
                                            No pending requests at this time.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </TabsContent>
                    )}
                </div>
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
            <div className="mb-8">
                <Skeleton className="h-32 w-full rounded-lg sm:h-40 md:h-48 lg:h-56" />

                {/* Overlapping Content Skeleton */}
                <div className="relative -mt-8 px-4 sm:-mt-10 sm:px-6 md:-mt-12 md:px-8 lg:-mt-16">
                    {/* Mobile Layout Skeleton */}
                    <div className="block lg:hidden">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                            <Skeleton className="h-16 w-16 rounded-full sm:h-20 sm:w-20" />
                            <div className="flex-1 sm:pb-2">
                                <Skeleton className="mb-2 h-6 w-48" />
                                <Skeleton className="mb-1 h-4 w-32" />
                                <Skeleton className="h-4 w-40" />
                            </div>
                        </div>
                        <div className="mt-4 space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    </div>

                    {/* Desktop Layout Skeleton */}
                    <div className="hidden lg:flex lg:items-end lg:justify-between">
                        <div className="flex items-end gap-6">
                            <Skeleton className="h-24 w-24 rounded-full xl:h-28 xl:w-28" />
                            <div className="pb-3">
                                <Skeleton className="mb-2 h-8 w-64" />
                                <Skeleton className="h-4 w-48" />
                            </div>
                        </div>
                        <div className="flex gap-3 pb-3">
                            <Skeleton className="h-10 w-32" />
                            <Skeleton className="h-10 w-32" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs Skeleton */}
            <div className="mb-6">
                <div className="border-b">
                    <Skeleton className="h-10 w-80" />
                </div>
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
            </div>
        </div>
    );
}
