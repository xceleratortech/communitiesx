'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/providers/trpc-provider';
import { Button } from '@/components/ui/button';
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
import { usePermission } from '@/hooks/use-permission';
import { PERMISSIONS } from '@/lib/permissions/permission-const';

export default function OrganizationCommunitiesPage() {
    const params = useParams();
    const router = useRouter();
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const { data: orgData, isLoading } =
        trpc.organizations.getOrganizationWithCommunities.useQuery({
            slug: params.slug as string,
        });

    const utils = trpc.useUtils();
    const makeOrgAdminMutation = trpc.organizations.makeOrgAdmin.useMutation();
    const removeOrgMemberMutation =
        trpc.organizations.removeOrgMember.useMutation();
    const deleteCommunityMutation =
        trpc.organizations.deleteCommunity.useMutation();

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
                    toast.success('Member removed successfully');
                    utils.organizations.getOrganizationWithCommunities.invalidate(
                        { slug: params.slug as string },
                    );
                },
                onError: (err) => {
                    toast.error('Failed to remove member', {
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

    if (isLoading) return <div>Loading...</div>;
    if (!orgData) return <div>Organization not found</div>;

    return (
        <div className="container mx-auto py-6">
            <div className="mb-4">
                <h1 className="mb-2 text-2xl font-bold lg:text-3xl">
                    {orgData.name}
                </h1>
                <p className="text-muted-foreground">
                    Manage communities and members for this organization.
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

                        <div className="overflow-hidden rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Joined</TableHead>
                                        {canManageMembers && (
                                            <TableHead className="text-right">
                                                Actions
                                            </TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orgData.members &&
                                    orgData.members.length > 0 ? (
                                        orgData.members.map((member: any) => (
                                            <TableRow key={member.id}>
                                                <TableCell className="font-medium">
                                                    {member.name}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {member.email}
                                                </TableCell>
                                                <TableCell>
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
                                                <TableCell className="text-muted-foreground">
                                                    {new Date(
                                                        member.createdAt,
                                                    ).toLocaleDateString()}
                                                </TableCell>
                                                {canManageMembers && (
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end">
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
                                    ) : (
                                        <TableRow>
                                            <TableCell
                                                colSpan={
                                                    canManageMembers ? 5 : 4
                                                }
                                                className="text-muted-foreground py-8 text-center"
                                            >
                                                No members found for this
                                                organization.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
