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
    Award,
    ArrowLeft,
    Plus,
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
import { BadgeManagement } from '@/components/badge-management';
import { UserBadgesInTable } from '@/components/ui/user-badges-in-table';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function AdminOrganizationDetailPage() {
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

    const { isAppAdmin } = usePermission();

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
                    toast.success('Member deleted permanently');
                    utils.organizations.getOrganizationWithCommunities.invalidate(
                        { slug: params.slug as string },
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

    if (isLoading) return <div>Loading...</div>;
    if (!orgData) return <div>Organization not found</div>;

    return (
        <div className="container mx-auto py-6">
            <div className="mb-6">
                <Button
                    variant="ghost"
                    onClick={() => router.push('/admin')}
                    className="mb-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Admin Dashboard
                </Button>

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="mb-2 text-2xl font-bold lg:text-3xl">
                            {orgData.name}
                        </h1>
                        <p className="text-muted-foreground">
                            Admin view of organization details, members, and
                            communities.
                        </p>
                    </div>
                    <Badge variant="secondary">Super Admin View</Badge>
                </div>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <div className="border-border border-b">
                    <TabsList className="h-auto w-auto justify-start border-0 bg-transparent p-0">
                        <TabsTrigger
                            value="overview"
                            className="data-[state=active]:border-primary flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                        >
                            <Eye className="h-4 w-4" />
                            <span className="hidden sm:inline">Overview</span>
                        </TabsTrigger>
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
                            className="data-[state=active]:border-primary flex items-center gap-2 border-transparent px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                        >
                            <Users className="h-4 w-4" />
                            <span className="hidden sm:inline">Members</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="badges"
                            className="data-[state=active]:border-primary flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                        >
                            <Award className="h-4 w-4" />
                            <span className="hidden sm:inline">Badges</span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium">
                                    Total Members
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {orgData.members?.length || 0}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium">
                                    Total Communities
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {orgData.communities?.length || 0}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="communities" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Communities</CardTitle>
                                    <CardDescription>
                                        Communities created within this
                                        organization.
                                    </CardDescription>
                                </div>
                                <Button
                                    onClick={() => {
                                        // Navigate to community creation with pre-filled org
                                        router.push(
                                            `/communities/new?orgId=${orgData.id}`,
                                        );
                                    }}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Community
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {orgData.communities &&
                            orgData.communities.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Created</TableHead>
                                            <TableHead className="text-right">
                                                Actions
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {orgData.communities.map(
                                            (community) => (
                                                <TableRow key={community.id}>
                                                    <TableCell className="font-medium">
                                                        {community.name}
                                                    </TableCell>
                                                    <TableCell>
                                                        {community.description ||
                                                            'No description'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={
                                                                community.type ===
                                                                'public'
                                                                    ? 'default'
                                                                    : 'secondary'
                                                            }
                                                        >
                                                            {community.type}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {new Date(
                                                            community.createdAt,
                                                        ).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    className="h-8 w-8 p-0"
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
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        deleteCommunity(
                                                                            community.id,
                                                                        )
                                                                    }
                                                                    className="text-destructive"
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    Delete
                                                                    Community
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ),
                                        )}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-muted-foreground py-8 text-center">
                                    No communities found in this organization.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="members" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Organization Members</CardTitle>
                                    <CardDescription>
                                        Manage members and their roles within
                                        this organization.
                                    </CardDescription>
                                </div>
                                <InviteUserDialog
                                    orgs={[
                                        { id: orgData.id, name: orgData.name },
                                    ]}
                                >
                                    <Button>Invite Member</Button>
                                </InviteUserDialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {orgData.members && orgData.members.length > 0 ? (
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
                                            <TableHead className="text-center">
                                                Actions
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {orgData.members.map((member) => (
                                            <TableRow key={member.id}>
                                                <TableCell className="text-center font-medium">
                                                    {member.name}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <UserBadgesInTable
                                                        userId={member.id}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {member.email}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge
                                                        variant={
                                                            member.role ===
                                                            'admin'
                                                                ? 'default'
                                                                : 'secondary'
                                                        }
                                                    >
                                                        {member.role}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {new Date(
                                                        member.createdAt,
                                                    ).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger
                                                            asChild
                                                        >
                                                            <Button
                                                                variant="ghost"
                                                                className="h-8 w-8 p-0"
                                                            >
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {member.role !==
                                                                'admin' && (
                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        handleMakeAdmin(
                                                                            member.id,
                                                                        )
                                                                    }
                                                                >
                                                                    <CircleCheckBig className="mr-2 h-4 w-4" />
                                                                    Make Admin
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    handleRemoveMember(
                                                                        member.id,
                                                                    )
                                                                }
                                                                className="text-destructive"
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Delete Member
                                                                Permanently
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-muted-foreground py-8 text-center">
                                    No members found in this organization.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="badges" className="space-y-6">
                    <BadgeManagement orgId={orgData.id} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
