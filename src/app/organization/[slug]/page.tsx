'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/providers/trpc-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    CircleCheckBig,
    Edit,
    Eye,
    MoreHorizontal,
    Trash2,
    Users,
    Building2,
    Award,
    Search,
    Loader2,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InviteUserDialog } from '@/components/invite-user-dialog';
import { UserBadgesInTable } from '@/components/ui/user-badges-in-table';
import { usePermission } from '@/hooks/use-permission';
import { PERMISSIONS } from '@/lib/permissions/permission-const';
import { BadgeManagement } from '@/components/badge-management';
import { Loading } from '@/components/ui/loading';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import debounce from 'lodash/debounce';

export default function OrganizationCommunitiesPage() {
    const params = useParams();
    const router = useRouter();
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Member search and pagination state
    const [memberSearchTerm, setMemberSearchTerm] = useState('');
    const [memberSearchRole, setMemberSearchRole] = useState<string>('all');
    const [currentMemberPage, setCurrentMemberPage] = useState(1);
    const [membersPerPage] = useState(10);

    const { data: orgData, isLoading } =
        trpc.organizations.getOrganizationWithCommunities.useQuery({
            slug: params.slug as string,
        });

    // Fetch paginated members with search and filtering
    const {
        data: membersData,
        isLoading: isLoadingMembers,
        isFetching: isFetchingMembers,
    } = trpc.organizations.getOrganizationMembersPaginated.useQuery(
        {
            orgId: orgData?.id || '',
            page: currentMemberPage,
            limit: membersPerPage,
            search: memberSearchTerm || undefined,
            role:
                memberSearchRole === 'all'
                    ? 'all'
                    : (memberSearchRole as 'admin' | 'user'),
        },
        { enabled: !!orgData?.id },
    );

    // Fetch all users with their badges in a single query
    const { data: usersWithBadges, isLoading: isLoadingUsers } =
        trpc.badges.getOrgUsers.useQuery(
            { orgId: orgData?.id || '' },
            { enabled: !!orgData?.id },
        );

    const utils = trpc.useUtils();
    const makeOrgAdminMutation = trpc.organizations.makeOrgAdmin.useMutation();
    const removeOrgMemberMutation =
        trpc.organizations.removeOrgMember.useMutation();
    const deleteCommunityMutation =
        trpc.organizations.deleteCommunity.useMutation();

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentMemberPage(1);
    }, [memberSearchTerm, memberSearchRole]);

    // Extract members and pagination info from the response
    const members = membersData?.members || [];
    const pagination = membersData?.pagination;

    // Search handling
    const debouncedMemberSearch = useCallback(
        debounce((value: string) => {
            setMemberSearchTerm(value);
        }, 300),
        [],
    );

    const handleMemberSearchChange = (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        debouncedMemberSearch(e.target.value);
    };

    // Pagination handlers
    const goToMemberPage = (page: number) => {
        setCurrentMemberPage(page);
    };

    const deleteCommunity = (communityId: number) => {
        deleteCommunityMutation.mutate(
            { communityId: communityId },
            {
                onSuccess: () => {
                    toast.success('Community deleted successfully');
                    setDeleteId(null);
                    utils.organizations.getOrganizationWithCommunities.invalidate(
                        { slug: params.slug as string },
                    );
                },
                onError: (err) => {
                    toast.error('Failed to delete community', {
                        description: err.message,
                    });
                },
            },
        );
    };

    const handleMakeAdmin = (userId: string) => {
        if (!orgData?.id) {
            toast.error('Organization ID not found');
            return;
        }

        makeOrgAdminMutation.mutate(
            { orgId: orgData.id, userId: userId },
            {
                onSuccess: () => {
                    toast.success('User made admin successfully');
                    utils.organizations.getOrganizationWithCommunities.invalidate(
                        { slug: params.slug as string },
                    );
                    utils.organizations.getOrganizationMembersPaginated.invalidate(
                        { orgId: orgData.id },
                    );
                },
                onError: (err) => {
                    toast.error('Failed to make user admin', {
                        description: err.message,
                    });
                },
            },
        );
    };

    const handleRemoveMember = (userId: string) => {
        if (!orgData?.id) {
            toast.error('Organization ID not found');
            return;
        }

        removeOrgMemberMutation.mutate(
            { orgId: orgData.id, userId: userId },
            {
                onSuccess: () => {
                    toast.success('Member deleted permanently');
                    utils.organizations.getOrganizationWithCommunities.invalidate(
                        { slug: params.slug as string },
                    );
                    utils.organizations.getOrganizationMembersPaginated.invalidate(
                        { orgId: orgData.id },
                    );
                },
                onError: (err) => {
                    toast.error('Failed to delete member', {
                        description: err.message,
                    });
                },
            },
        );
    };

    const { checkOrgPermission } = usePermission();
    const canUpdateCommunity = checkOrgPermission(PERMISSIONS.EDIT_COMMUNITY);
    const canCreateCommunity = checkOrgPermission(PERMISSIONS.CREATE_COMMUNITY);
    const canDeleteCommunity = checkOrgPermission(PERMISSIONS.DELETE_COMMUNITY);
    const canManageMembers = checkOrgPermission(PERMISSIONS.MANAGE_ORG_MEMBERS);
    const canInviteMembers = checkOrgPermission(PERMISSIONS.INVITE_ORG_MEMBERS);
    const canManageBadges = checkOrgPermission('view_badge');

    if (isLoading) return <Loading />;
    if (!orgData) return <div>Organization not found</div>;

    return (
        <div className="container mx-auto py-6">
            <div className="mb-4">
                <h1 className="mb-2 text-2xl font-bold lg:text-3xl">
                    {orgData.name}
                </h1>
                <p className="text-muted-foreground">
                    Manage communities, members, and badges for this
                    organization.
                </p>
            </div>

            <Tabs defaultValue="communities" className="w-full">
                <div className="border-border border-b">
                    <TabsList className="h-auto w-auto justify-start border-0 bg-transparent p-0">
                        <TabsTrigger
                            value="communities"
                            className="data-[state=active]:border-primary flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                        >
                            <Building2 className="h-4 w-4" />
                            <span className="hidden sm:inline">
                                Communities
                            </span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="members"
                            className="data-[state=active]:border-primary flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                        >
                            <Users className="h-4 w-4" />
                            <span className="hidden sm:inline">Members</span>
                        </TabsTrigger>
                        {canManageBadges && (
                            <TabsTrigger
                                value="badges"
                                className="data-[state=active]:border-primary flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                            >
                                <Award className="h-4 w-4" />
                                <span className="hidden sm:inline">Badges</span>
                            </TabsTrigger>
                        )}
                    </TabsList>
                </div>

                <div className="mt-6">
                    <TabsContent value="communities" className="mt-0 space-y-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="mb-1 text-xl font-semibold">
                                    Communities
                                </h2>
                                <p className="text-muted-foreground text-sm">
                                    Manage all communities for this
                                    organization.
                                </p>
                            </div>
                            {canCreateCommunity && (
                                <Link href="/communities/new">
                                    <Button className="w-full">
                                        Create Community
                                    </Button>
                                </Link>
                            )}
                        </div>

                        <div className="overflow-hidden rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Slug</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead className="text-right">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orgData.communities.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={5}
                                                className="text-muted-foreground py-8 text-center"
                                            >
                                                No communities found for this
                                                organization.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        orgData.communities.map(
                                            (community: any) => (
                                                <TableRow key={community.id}>
                                                    <TableCell className="font-medium">
                                                        {community.name}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {community.slug}
                                                    </TableCell>
                                                    <TableCell className="max-w-xs truncate">
                                                        {community.description}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {new Date(
                                                            community.createdAt,
                                                        ).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end">
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
                                                                    <DropdownMenuItem
                                                                        asChild
                                                                    >
                                                                        <Link
                                                                            href={`/communities/${community.slug}`}
                                                                        >
                                                                            <Eye className="mr-2 h-4 w-4" />
                                                                            View
                                                                            Community
                                                                        </Link>
                                                                    </DropdownMenuItem>
                                                                    {canUpdateCommunity && (
                                                                        <DropdownMenuItem
                                                                            asChild
                                                                        >
                                                                            <Link
                                                                                href={`/communities/${community.slug}/edit`}
                                                                            >
                                                                                <Edit className="mr-2 h-4 w-4" />
                                                                                Edit
                                                                                Community
                                                                            </Link>
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    <DropdownMenuSeparator />
                                                                    {canDeleteCommunity && (
                                                                        <DropdownMenuItem
                                                                            className="text-destructive"
                                                                            onSelect={() =>
                                                                                deleteCommunity(
                                                                                    community.id,
                                                                                )
                                                                            }
                                                                        >
                                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                                            Delete
                                                                            Community
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ),
                                        )
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="members" className="mt-0 space-y-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="mb-1 text-xl font-semibold">
                                    Members
                                </h2>
                                <p className="text-muted-foreground text-sm">
                                    View and manage organization members.
                                </p>
                            </div>
                            {canInviteMembers && (
                                <InviteUserDialog orgs={[orgData]}>
                                    <Button variant="default">
                                        Invite Member
                                    </Button>
                                </InviteUserDialog>
                            )}
                        </div>

                        {/* Search and Filter Controls */}
                        <div className="space-y-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                                <div className="flex-1">
                                    <Label
                                        htmlFor="member-search"
                                        className="text-sm font-medium"
                                    >
                                        Search Members
                                    </Label>
                                    <div className="relative mt-1">
                                        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                                        <Input
                                            id="member-search"
                                            placeholder="Search by name or email..."
                                            value={memberSearchTerm}
                                            onChange={handleMemberSearchChange}
                                            className={`pl-10 ${memberSearchTerm ? 'border-primary' : ''}`}
                                        />
                                        {isFetchingMembers &&
                                            !isLoadingMembers && (
                                                <Loader2 className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin" />
                                            )}
                                    </div>
                                </div>
                                <div className="w-full sm:w-32">
                                    <Label
                                        htmlFor="role-filter"
                                        className="text-sm font-medium"
                                    >
                                        Role
                                    </Label>
                                    <Select
                                        value={memberSearchRole}
                                        onValueChange={(value) =>
                                            setMemberSearchRole(value)
                                        }
                                    >
                                        <SelectTrigger
                                            className={`mt-1 ${memberSearchRole !== 'all' ? 'border-primary' : ''}`}
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                All Roles
                                            </SelectItem>
                                            <SelectItem value="admin">
                                                Admin
                                            </SelectItem>
                                            <SelectItem value="user">
                                                User
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {isFetchingMembers &&
                                        !isLoadingMembers &&
                                        memberSearchRole !== 'all' && (
                                            <Loader2 className="text-muted-foreground ml-2 h-4 w-4 animate-spin" />
                                        )}
                                </div>
                            </div>

                            {/* Results Summary */}
                            <div className="text-muted-foreground flex items-center justify-between text-sm">
                                <span>
                                    {isLoadingMembers || isFetchingMembers ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            {isFetchingMembers &&
                                            !isLoadingMembers
                                                ? 'Searching...'
                                                : 'Loading...'}
                                        </span>
                                    ) : (
                                        `Showing ${(currentMemberPage - 1) * membersPerPage + 1}-${Math.min(currentMemberPage * membersPerPage, pagination?.total || 0)} of ${pagination?.total || 0} members`
                                    )}
                                </span>
                                {(memberSearchTerm ||
                                    memberSearchRole !== 'all') && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setMemberSearchTerm('');
                                            setMemberSearchRole('all');
                                        }}
                                    >
                                        Clear Filters
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-md border">
                            {isLoadingMembers ||
                            (isFetchingMembers && !members.length) ? (
                                <div className="space-y-4">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-center">
                                                    Name
                                                </TableHead>
                                                <TableHead className="text-center">
                                                    Badges
                                                </TableHead>
                                                <TableHead className="text-center">
                                                    Email
                                                </TableHead>
                                                <TableHead className="text-center">
                                                    Role
                                                </TableHead>
                                                <TableHead className="text-center">
                                                    Joined
                                                </TableHead>
                                                {canManageMembers && (
                                                    <TableHead className="text-center">
                                                        Actions
                                                    </TableHead>
                                                )}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Array.from({
                                                length: membersPerPage,
                                            }).map((_, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>
                                                        <div className="bg-muted h-4 w-24 animate-pulse rounded" />
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="bg-muted h-4 w-20 animate-pulse rounded" />
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="bg-muted h-4 w-32 animate-pulse rounded" />
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="bg-muted h-4 w-20 animate-pulse rounded" />
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="bg-muted h-4 w-20 animate-pulse rounded" />
                                                    </TableCell>
                                                    {canManageMembers && (
                                                        <TableCell>
                                                            <div className="bg-muted h-8 w-8 animate-pulse rounded" />
                                                        </TableCell>
                                                    )}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-center">
                                                Name
                                            </TableHead>
                                            <TableHead className="text-center">
                                                Badges
                                            </TableHead>
                                            <TableHead className="text-center">
                                                Email
                                            </TableHead>
                                            <TableHead className="text-center">
                                                Role
                                            </TableHead>
                                            <TableHead className="text-center">
                                                Joined
                                            </TableHead>
                                            {canManageMembers && (
                                                <TableHead className="text-center">
                                                    Actions
                                                </TableHead>
                                            )}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {members.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={
                                                        canManageMembers ? 6 : 5
                                                    }
                                                    className="text-muted-foreground py-8 text-center"
                                                >
                                                    {memberSearchTerm ||
                                                    memberSearchRole !==
                                                        'all' ? (
                                                        <div className="space-y-2">
                                                            <p>
                                                                No members found
                                                                matching your
                                                                filters
                                                            </p>
                                                            <p className="text-xs">
                                                                Try adjusting
                                                                your search
                                                                criteria or
                                                                clearing some
                                                                filters
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        'No members found for this organization.'
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            members.map((member: any) => (
                                                <TableRow key={member.id}>
                                                    <TableCell className="text-center font-medium">
                                                        {member.name}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <UserBadgesInTable
                                                            userId={member.id}
                                                            userBadges={
                                                                usersWithBadges?.find(
                                                                    (u) =>
                                                                        u.id ===
                                                                        member.id,
                                                                )
                                                                    ?.badgeAssignments ||
                                                                []
                                                            }
                                                            isLoading={
                                                                isLoadingUsers
                                                            }
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-center">
                                                        {member.email}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <span
                                                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                                                member.role ===
                                                                'admin'
                                                                    ? 'bg-primary/10 text-primary'
                                                                    : 'bg-muted text-muted-foreground'
                                                            }`}
                                                        >
                                                            {member.role}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-center">
                                                        {new Date(
                                                            member.createdAt,
                                                        ).toLocaleDateString()}
                                                    </TableCell>
                                                    {canManageMembers && (
                                                        <TableCell className="text-center">
                                                            <div className="flex justify-center">
                                                                {member.role !==
                                                                    'admin' && (
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
                                                                            {member.role !==
                                                                                'admin' && (
                                                                                <DropdownMenuItem
                                                                                    onSelect={() =>
                                                                                        handleMakeAdmin(
                                                                                            member.id,
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <CircleCheckBig className="mr-2 h-4 w-4" />
                                                                                    Make
                                                                                    Admin
                                                                                </DropdownMenuItem>
                                                                            )}
                                                                            {member.role !==
                                                                                'admin' && (
                                                                                <DropdownMenuItem
                                                                                    className="text-destructive"
                                                                                    onSelect={() =>
                                                                                        handleRemoveMember(
                                                                                            member.id,
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                                    Remove
                                                                                    Member
                                                                                </DropdownMenuItem>
                                                                            )}
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    )}
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </div>

                        {/* Pagination Controls */}
                        {pagination && pagination.totalPages > 1 && (
                            <div className="flex items-center justify-between">
                                <div className="text-muted-foreground text-sm">
                                    {isFetchingMembers && !isLoadingMembers ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Loading page {currentMemberPage}...
                                        </span>
                                    ) : (
                                        <>
                                            <span>
                                                Page {currentMemberPage} of{' '}
                                                {pagination.totalPages}
                                            </span>
                                            <span className="ml-2">•</span>
                                            <span className="ml-2">
                                                {pagination.total} total members
                                            </span>
                                        </>
                                    )}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => goToMemberPage(1)}
                                        disabled={
                                            currentMemberPage === 1 ||
                                            isFetchingMembers
                                        }
                                    >
                                        <ChevronsLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            goToMemberPage(
                                                currentMemberPage - 1,
                                            )
                                        }
                                        disabled={
                                            currentMemberPage === 1 ||
                                            isFetchingMembers
                                        }
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            goToMemberPage(
                                                currentMemberPage + 1,
                                            )
                                        }
                                        disabled={
                                            currentMemberPage ===
                                                pagination.totalPages ||
                                            isFetchingMembers
                                        }
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            goToMemberPage(
                                                pagination.totalPages,
                                            )
                                        }
                                        disabled={
                                            currentMemberPage ===
                                                pagination.totalPages ||
                                            isFetchingMembers
                                        }
                                    >
                                        <ChevronsRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    {canManageBadges && (
                        <TabsContent value="badges" className="mt-0 space-y-6">
                            <BadgeManagement orgId={orgData.id} />
                        </TabsContent>
                    )}
                </div>
            </Tabs>
        </div>
    );
}
