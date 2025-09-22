'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '@/providers/trpc-provider';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { useTypedSession } from '@/server/auth/client';
import { toast } from 'sonner';
import { usePermission } from '@/hooks/use-permission';
import { PERMISSIONS } from '@/lib/permissions/permission-const';
import { isOrgAdminForCommunity } from '@/lib/utils';
import {
    CommunityBanner,
    CommunityTabs,
    CommunityOverview,
    CommunityTags,
    CommunityPosts,
    CommunityMembers,
    CommunityManage,
    CommunityDialogs,
    CommunitySkeleton,
} from '@/components/community';
import { SortSelect, type SortOption } from '@/components/ui/sort-select';
import { DateFilter, type DateFilterState } from '@/components/date-filter';

export default function CommunityDetailPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;
    const sessionData = useTypedSession();
    const session = sessionData.data;

    const [activeTab, setActiveTab] = useState('posts');
    const [isActionInProgress, setIsActionInProgress] = useState(false);

    // Sort state
    const [sortOption, setSortOption] = useState<SortOption>('latest');

    // Filter state
    const [dateFilter, setDateFilter] = useState<DateFilterState>({
        type: 'all',
    });

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

    // Tag filtering state
    const [selectedTagFilters, setSelectedTagFilters] = useState<number[]>([]);

    // Post filtering state
    const [showMyPosts, setShowMyPosts] = useState(false);

    // Pagination for members
    const [currentMembersPage, setCurrentMembersPage] = useState(1);
    const membersPerPage = 10;

    // Add Members dialog state
    const [isAddingMembers, setIsAddingMembers] = useState(false);
    const [memberSearchTerm, setMemberSearchTerm] = useState('');

    const [isClient, setIsClient] = useState(false);
    const { checkCommunityPermission } = usePermission();
    const utils = trpc.useUtils();

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Refetch data when date filter changes
    useEffect(() => {
        if (isClient && session) {
            utils.communities.getBySlug.invalidate({
                slug,
                sort: sortOption,
                dateFilter: dateFilter.type !== 'all' ? dateFilter : undefined,
            });
        }
    }, [
        dateFilter,
        isClient,
        session,
        slug,
        sortOption,
        utils.communities.getBySlug,
    ]);

    const {
        data: community,
        isLoading,
        refetch,
    } = trpc.communities.getBySlug.useQuery(
        {
            slug,
            sort: sortOption,
            dateFilter: dateFilter.type !== 'all' ? dateFilter : undefined,
        },
        {
            enabled: !!session,
        },
    );

    const isOrgAdminForCommunityCheck = isOrgAdminForCommunity(
        session?.user,
        community?.orgId,
    );

    const isSuperAdmin = session?.user?.appRole === 'admin';

    const canCreatePost = useMemo(() => {
        if (!session?.user?.id || !community) return false;
        if (isSuperAdmin) return true;
        if (isOrgAdminForCommunityCheck) return true;

        const userMembership = community.members?.find(
            (m) =>
                m.userId === session.user.id &&
                m.membershipType === 'member' &&
                m.status === 'active',
        );

        if (!userMembership) return false;

        const roleHierarchy = {
            member: 1,
            moderator: 2,
            admin: 3,
        };

        const userRoleLevel =
            roleHierarchy[userMembership.role as keyof typeof roleHierarchy] ||
            0;
        const minRoleLevel =
            roleHierarchy[
                community.postCreationMinRole as keyof typeof roleHierarchy
            ] || 1;

        return userRoleLevel >= minRoleLevel;
    }, [
        session?.user?.id,
        community,
        isSuperAdmin,
        isOrgAdminForCommunityCheck,
    ]);

    const canEditPost = (post: any) => {
        if (!session) return false;

        // Check if user is the post author
        if (post.author && post.author.id === session.user.id) return true;

        // Check community permissions
        return checkCommunityPermission(
            community?.id?.toString() ?? '',
            PERMISSIONS.EDIT_POST,
            community?.orgId,
        );
    };

    const canDeletePost = (post: any) => {
        if (!session) return false;

        // Check if user is the post author
        if (post.author && post.author.id === session.user.id) return true;

        // Check community permissions
        return checkCommunityPermission(
            community?.id?.toString() ?? '',
            PERMISSIONS.DELETE_POST,
            community?.orgId,
        );
    };

    const canCreateTag = checkCommunityPermission(
        community?.id?.toString() ?? '',
        PERMISSIONS.CREATE_TAG,
        community?.orgId,
    );
    const canEditTag = checkCommunityPermission(
        community?.id?.toString() ?? '',
        PERMISSIONS.EDIT_TAG,
        community?.orgId,
    );
    const canDeleteTag = checkCommunityPermission(
        community?.id?.toString() ?? '',
        PERMISSIONS.DELETE_TAG,
        community?.orgId,
    );

    const canManageCommunityMembers = checkCommunityPermission(
        community?.id?.toString() ?? '',
        PERMISSIONS.MANAGE_COMMUNITY_MEMBERS,
        community?.orgId,
    );
    const canManageCommunityAdmins = checkCommunityPermission(
        community?.id?.toString() ?? '',
        PERMISSIONS.ASSIGN_COMMUNITY_ADMIN,
        community?.orgId,
    );
    const canRemoveCommunityAdmins = checkCommunityPermission(
        community?.id?.toString() ?? '',
        PERMISSIONS.REMOVE_COMMUNITY_ADMIN,
        community?.orgId,
    );
    const canInviteCommunityMembers = checkCommunityPermission(
        community?.id?.toString() ?? '',
        PERMISSIONS.INVITE_COMMUNITY_MEMBERS,
        community?.orgId,
    );

    const canKickMember = (memberRole: string, memberUserId: string) => {
        if (memberUserId === session?.user?.id) return false;
        if (community?.createdBy === memberUserId) return false;
        if (session?.user?.appRole === 'admin') return true;
        if (isOrgAdminForCommunityCheck) return true;

        if (
            checkCommunityPermission(
                community?.id?.toString() ?? '',
                PERMISSIONS.MANAGE_COMMUNITY_MEMBERS,
                community?.orgId,
            )
        ) {
            const currentUserMembership = community?.members?.find(
                (m) => m.userId === session?.user?.id,
            );

            if (currentUserMembership?.role === 'admin') {
                return memberRole !== 'admin';
            } else if (currentUserMembership?.role === 'moderator') {
                return (
                    memberRole === 'member' &&
                    session?.user?.appRole !== 'admin' &&
                    community?.createdBy !== memberUserId
                );
            }
        }

        return false;
    };

    const shouldDisableActionButton = (
        memberRole: string,
        memberUserId: string,
    ) => {
        if (memberUserId === session?.user?.id) return false;
        if (community?.createdBy === memberUserId) return false;
        if (session?.user?.appRole === 'admin') return false;
        if (isOrgAdminForCommunityCheck) return false;

        const currentUserMembership = community?.members?.find(
            (m) => m.userId === session?.user?.id,
        );

        if (currentUserMembership?.role === 'admin') {
            return false;
        } else if (currentUserMembership?.role === 'moderator') {
            return (
                memberRole === 'admin' ||
                memberRole === 'moderator' ||
                session?.user?.appRole === 'admin' ||
                community?.createdBy === memberUserId
            );
        }

        return true;
    };

    // Fetch pending requests if user is admin or moderator
    const { data: pendingRequests, refetch: refetchPendingRequests } =
        trpc.communities.getPendingRequests.useQuery(
            { communityId: community?.id || 0 },
            {
                enabled:
                    !!session &&
                    !!community?.id &&
                    (!!community?.members?.some(
                        (m) =>
                            m.userId === session?.user.id &&
                            (m.role === 'admin' || m.role === 'moderator'),
                    ) ||
                        isOrgAdminForCommunityCheck ||
                        session?.user?.appRole === 'admin'),
            },
        );

    // Get organization members not in community
    const { data: availableOrgMembers, refetch: refetchAvailableMembers } =
        trpc.communities.getOrgMembersNotInCommunity.useQuery(
            {
                communityId: community?.id || 0,
                search: memberSearchTerm || undefined,
            },
            {
                enabled:
                    !!session && !!community?.id && canManageCommunityMembers,
            },
        );

    // Check if user has pending requests
    const { data: userPendingRequests } =
        trpc.communities.getUserPendingRequests.useQuery(
            { communityId: community?.id || 0 },
            { enabled: !!session && !!community?.id && !!session?.user },
        );

    const hasPendingJoinRequest =
        userPendingRequests?.some(
            (req: { requestType: string; status: string }) =>
                req.requestType === 'join' && req.status === 'pending',
        ) || false;

    const hasPendingFollowRequest =
        userPendingRequests?.some(
            (req: { requestType: string; status: string }) =>
                req.requestType === 'follow' && req.status === 'pending',
        ) || false;

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

    const assignAdminMutation = trpc.communities.assignAdmin.useMutation({
        onSuccess: () => {
            refetch();
            toast.success('Admin role assigned successfully');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to assign admin role');
        },
        onSettled: () => {
            setIsActionInProgress(false);
        },
    });

    const removeAdminMutation = trpc.communities.removeAdmin.useMutation({
        onSuccess: () => {
            refetch();
            toast.success('Admin role removed successfully');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to remove admin role');
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

    // Add member to community mutation
    const addMemberMutation =
        trpc.communities.addOrgMembersToCommunity.useMutation({
            onSuccess: () => {
                refetch();
                refetchAvailableMembers();
                setIsAddingMembers(false);
                toast.success('Members added to community successfully');
            },
            onError: (error: any) => {
                toast.error('Failed to add members to community', {
                    description: error.message,
                });
            },
            onSettled: () => {
                setIsAddingMembers(false);
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

    const handleAssignAdmin = (userId: string) => {
        if (!community) return;
        assignAdminMutation.mutate({
            communityId: community.id,
            userId,
        });
    };

    const handleRemoveAdmin = (userId: string) => {
        if (!community) return;
        removeAdminMutation.mutate({
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

    // Handle adding member to community
    const handleAddMember = async (
        users: { userId: string; role: 'member' | 'moderator' }[],
    ) => {
        if (!community || !users.length) return;

        setIsAddingMembers(true);
        try {
            await addMemberMutation.mutateAsync({
                communityId: community.id,
                users,
            });
        } catch (error) {
            // Error is already handled in the mutation
        }
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

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        setCurrentMembersPage(1);
    };

    const deletePostMutation = trpc.community.deletePost.useMutation({
        onSuccess: () => {
            refetch();
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
            toast.error('Failed to delete post');
        }
    };

    const filteredPosts = useMemo(() => {
        if (!community?.posts) return [];

        let filtered = community.posts;

        if (showMyPosts) {
            filtered = filtered.filter(
                (post: any) => post.author?.id === session?.user?.id,
            );
        }

        if (selectedTagFilters.length > 0) {
            filtered = filtered.filter(
                (post: any) =>
                    post.tags &&
                    post.tags.some((tag: any) =>
                        selectedTagFilters.includes(tag.id),
                    ),
            );
        }

        return filtered;
    }, [community?.posts, selectedTagFilters, showMyPosts, session?.user?.id]);

    const handleTagFilterToggle = (tagId: number) => {
        setSelectedTagFilters((prev) =>
            prev.includes(tagId)
                ? prev.filter((id) => id !== tagId)
                : [...prev, tagId],
        );
    };

    const handlePostFilterToggle = () => {
        setShowMyPosts((prev) => !prev);
    };

    // Handle sort change
    const handleSortChange = (newSort: SortOption) => {
        setSortOption(newSort);
    };

    if (!isClient) {
        return <CommunitySkeleton />;
    }

    if (session === undefined) {
        return <CommunitySkeleton />;
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

    if (isClient && isLoading) {
        return <Loading message="Loading community..." />;
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
                    <Link href="/communities">Back to Communities</Link>
                </Button>
            </div>
        );
    }

    const userMembership = community.members?.find(
        (m) => m.userId === session.user.id,
    );

    const isMember =
        (!!userMembership && userMembership.membershipType === 'member') ||
        isOrgAdminForCommunityCheck ||
        isSuperAdmin;
    const isFollower =
        !!userMembership && userMembership.membershipType === 'follower';
    const isModerator = !!userMembership && userMembership.role === 'moderator';
    const isAdmin = !!userMembership && userMembership.role === 'admin';
    const canInteract = isMember || isOrgAdminForCommunityCheck || isSuperAdmin;

    return (
        <div className="container mx-auto py-6">
            <CommunityBanner
                community={community}
                isMember={isMember}
                isFollower={isFollower}
                isAdmin={isAdmin}
                hasPendingJoinRequest={hasPendingJoinRequest}
                hasPendingFollowRequest={hasPendingFollowRequest}
                isActionInProgress={isActionInProgress}
                onJoinCommunity={handleJoinCommunity}
                onFollowCommunity={handleFollowCommunity}
                onLeaveCommunity={handleLeaveCommunity}
                onUnfollowCommunity={handleUnfollowCommunity}
            />

            {/* Add sort control above tabs */}
            {community && (
                <div className="mb-4 flex justify-end">
                    <DateFilter
                        value={dateFilter}
                        onChange={setDateFilter}
                        disabled={isLoading}
                    />
                    <SortSelect
                        value={sortOption}
                        onValueChange={handleSortChange}
                    />
                </div>
            )}

            <CommunityTabs
                activeTab={activeTab}
                onTabChange={handleTabChange}
                canManageCommunityMembers={canManageCommunityMembers}
                pendingRequestsCount={pendingRequests?.length || 0}
            >
                <CommunityOverview community={community} />

                <CommunityPosts
                    community={community}
                    isLoading={isLoading}
                    isMember={isMember}
                    canInteract={canInteract}
                    canCreatePost={canCreatePost}
                    filteredPosts={filteredPosts}
                    showMyPosts={showMyPosts}
                    selectedTagFilters={selectedTagFilters}
                    onPostFilterToggle={handlePostFilterToggle}
                    onTagFilterToggle={handleTagFilterToggle}
                    onClearTagFilters={() => setSelectedTagFilters([])}
                    onClearPostFilter={() => setShowMyPosts(false)}
                    onDeletePost={handleDeletePost}
                    canEditPost={canEditPost}
                    canDeletePost={canDeletePost}
                    router={router}
                    dateFilter={dateFilter}
                    onDateFilterChange={setDateFilter}
                />

                <CommunityTags
                    community={community}
                    canCreateTag={canCreateTag}
                    canEditTag={canEditTag}
                    canDeleteTag={canDeleteTag}
                />

                <CommunityMembers
                    community={community}
                    canManageCommunityMembers={canManageCommunityMembers}
                    canManageCommunityAdmins={canManageCommunityAdmins}
                    canRemoveCommunityAdmins={canRemoveCommunityAdmins}
                    canInviteCommunityMembers={canInviteCommunityMembers}
                    currentMembersPage={currentMembersPage}
                    membersPerPage={membersPerPage}
                    onPageChange={setCurrentMembersPage}
                    onAssignModerator={handleAssignModerator}
                    onAssignAdmin={handleAssignAdmin}
                    onRemoveAdmin={handleRemoveAdmin}
                    onRemoveModerator={handleRemoveModerator}
                    onRemoveUserFromCommunity={handleRemoveUserFromCommunity}
                    canKickMember={canKickMember}
                    shouldDisableActionButton={shouldDisableActionButton}
                    availableOrgMembers={availableOrgMembers || []}
                    onAddMembers={handleAddMember}
                    isAddingMembers={isAddingMembers}
                />

                {canManageCommunityMembers && (
                    <CommunityManage
                        pendingRequests={pendingRequests || []}
                        onApproveRequest={handleApproveRequest}
                        onRejectRequest={handleRejectRequest}
                    />
                )}
            </CommunityTabs>

            <CommunityDialogs
                isLeaveCommunityDialogOpen={isLeaveCommunityDialogOpen}
                isRemoveModeratorDialogOpen={isRemoveModeratorDialogOpen}
                isRemoveUserDialogOpen={isRemoveUserDialogOpen}
                onLeaveCommunityDialogChange={setIsLeaveCommunityDialogOpen}
                onRemoveModeratorDialogChange={setIsRemoveModeratorDialogOpen}
                onRemoveUserDialogChange={setIsRemoveUserDialogOpen}
                onConfirmLeaveCommunity={confirmLeaveCommunity}
                onConfirmRemoveModerator={confirmRemoveModerator}
                onConfirmRemoveUser={confirmRemoveUserFromCommunity}
            />
        </div>
    );
}
