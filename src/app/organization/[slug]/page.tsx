'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import debounce from 'lodash/debounce';

export default function OrganizationCommunitiesPage() {
    const params = useParams();
    const router = useRouter();
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Member search and pagination state
    const [memberSearchTerm, setMemberSearchTerm] = useState('');
    const [memberSearchRole, setMemberSearchRole] = useState<
        'all' | 'admin' | 'user'
    >('all');
    const [currentMemberPage, setCurrentMemberPage] = useState(1);
    const [membersPerPage] = useState(10);

    // State for create user dialog
    const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        password: '',
        role: 'user' as 'admin' | 'user',
    });
    const [isCreatingUser, setIsCreatingUser] = useState(false);

    // State for bulk CSV upload (now handled within the Create Member dialog)
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvData, setCsvData] = useState<any[]>([]);
    const [isProcessingCsv, setIsProcessingCsv] = useState(false);
    const [isUploadingBulk, setIsUploadingBulk] = useState(false);
    const [csvErrors, setCsvErrors] = useState<string[]>([]);
    const [csvPreview, setCsvPreview] = useState<any[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            role: memberSearchRole,
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
    const createUserMutation = trpc.organizations.createUser.useMutation();

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

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orgData?.id) {
            toast.error('Organization ID not found');
            return;
        }

        setIsCreatingUser(true);
        try {
            await createUserMutation.mutateAsync({
                ...newUser,
                orgId: orgData.id,
            });

            toast.success('User created successfully');
            setIsCreateUserDialogOpen(false);
            setNewUser({
                name: '',
                email: '',
                password: '',
                role: 'user',
            });

            // Refresh the members list
            utils.organizations.getOrganizationMembersPaginated.invalidate({
                orgId: orgData.id,
            });
        } catch (error: any) {
            toast.error('Failed to create user', {
                description: error.message,
            });
        } finally {
            setIsCreatingUser(false);
        }
    };

    // CSV processing functions
    const processCsvFile = (file: File) => {
        setIsProcessingCsv(true);
        setCsvErrors([]);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csv = e.target?.result as string;
                const lines = csv.split('\n');
                const headers = lines[0]
                    .split(',')
                    .map((h) => h.trim().toLowerCase());

                // Validate required headers
                const requiredHeaders = ['name', 'email', 'password', 'role'];
                const missingHeaders = requiredHeaders.filter(
                    (h) => !headers.includes(h),
                );

                if (missingHeaders.length > 0) {
                    setCsvErrors([
                        `Missing required headers: ${missingHeaders.join(', ')}`,
                    ]);
                    setIsProcessingCsv(false);
                    return;
                }

                const data = lines
                    .slice(1)
                    .filter((line) => line.trim())
                    .map((line, index) => {
                        const values = line.split(',').map((v) => v.trim());
                        const row: any = {};

                        headers.forEach((header, i) => {
                            row[header] = values[i] || '';
                        });

                        // Validate row data
                        if (!row.name || !row.email || !row.password) {
                            setCsvErrors((prev) => [
                                ...prev,
                                `Row ${index + 2}: Missing name, email, or password`,
                            ]);
                        }

                        // Validate password length
                        if (row.password && row.password.length < 8) {
                            setCsvErrors((prev) => [
                                ...prev,
                                `Row ${index + 2}: Password must be at least 8 characters long`,
                            ]);
                        }

                        if (
                            row.role &&
                            !['admin', 'user'].includes(row.role.toLowerCase())
                        ) {
                            row.role = 'user'; // Default to user if invalid role
                        } else if (!row.role) {
                            row.role = 'user';
                        }

                        return row;
                    });

                setCsvData(data);
                setCsvPreview(data.slice(0, 5)); // Show first 5 rows as preview
                setIsProcessingCsv(false);
            } catch (error) {
                setCsvErrors([
                    'Failed to process CSV file. Please check the format.',
                ]);
                setIsProcessingCsv(false);
            }
        };

        reader.readAsText(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
                toast.error('Please select a valid CSV file');
                return;
            }
            setCsvFile(file);
            processCsvFile(file);
        }
    };

    const handleBulkUpload = async () => {
        if (!orgData?.id || csvData.length === 0) return;

        setIsUploadingBulk(true);
        try {
            // Create users one by one
            for (const user of csvData) {
                await createUserMutation.mutateAsync({
                    name: user.name,
                    email: user.email,
                    password: user.password,
                    role: user.role.toLowerCase() as 'admin' | 'user',
                    orgId: orgData.id,
                });
            }

            toast.success(`Successfully created ${csvData.length} users`);
            setIsCreateUserDialogOpen(false);
            resetBulkUploadState();

            // Refresh the members list
            utils.organizations.getOrganizationMembersPaginated.invalidate({
                orgId: orgData.id,
            });
        } catch (error: any) {
            toast.error('Failed to create some users', {
                description: error.message,
            });
        } finally {
            setIsUploadingBulk(false);
        }
    };

    const generateRandomPassword = () => {
        const chars =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    };

    const resetBulkUploadState = () => {
        setCsvFile(null);
        setCsvData([]);
        setCsvPreview([]);
        setCsvErrors([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const { checkOrgPermission } = usePermission();
    const canUpdateCommunity = checkOrgPermission(PERMISSIONS.EDIT_COMMUNITY);
    const canCreateCommunity = checkOrgPermission(PERMISSIONS.CREATE_COMMUNITY);
    const canDeleteCommunity = checkOrgPermission(PERMISSIONS.DELETE_COMMUNITY);
    const canManageMembers = checkOrgPermission(PERMISSIONS.MANAGE_ORG_MEMBERS);
    const canInviteMembers = checkOrgPermission(PERMISSIONS.INVITE_ORG_MEMBERS);
    const canManageBadges = checkOrgPermission('view_badge');
    const canCreateUsers = checkOrgPermission(PERMISSIONS.CREATE_ORG_USERS);

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
                            <div className="flex flex-col gap-2">
                                {canInviteMembers && (
                                    <InviteUserDialog orgs={[orgData]}>
                                        <Button variant="default">
                                            Invite Member
                                        </Button>
                                    </InviteUserDialog>
                                )}
                                {canCreateUsers && (
                                    <Dialog
                                        open={isCreateUserDialogOpen}
                                        onOpenChange={(open) => {
                                            setIsCreateUserDialogOpen(open);
                                            if (!open) {
                                                // Reset all states when dialog closes
                                                setNewUser({
                                                    name: '',
                                                    email: '',
                                                    password: '',
                                                    role: 'user',
                                                });
                                                resetBulkUploadState();
                                            }
                                        }}
                                    >
                                        <DialogTrigger asChild>
                                            <Button variant="outline">
                                                <Plus className="mr-2 h-4 w-4" />
                                                Create Member
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl">
                                            <DialogHeader>
                                                <DialogTitle>
                                                    Create Member(s)
                                                </DialogTitle>
                                                <DialogDescription>
                                                    Create individual members or
                                                    upload multiple members via
                                                    CSV file.
                                                </DialogDescription>
                                            </DialogHeader>

                                            <Tabs
                                                defaultValue="individual"
                                                className="w-full"
                                            >
                                                <TabsList className="grid w-full grid-cols-2">
                                                    <TabsTrigger value="individual">
                                                        Individual
                                                    </TabsTrigger>
                                                    <TabsTrigger value="bulk">
                                                        Bulk Upload
                                                    </TabsTrigger>
                                                </TabsList>

                                                <TabsContent
                                                    value="individual"
                                                    className="mt-4 space-y-4"
                                                >
                                                    <form
                                                        onSubmit={
                                                            handleCreateUser
                                                        }
                                                        className="space-y-4"
                                                    >
                                                        <div className="space-y-2">
                                                            <Label htmlFor="name">
                                                                Name
                                                            </Label>
                                                            <Input
                                                                id="name"
                                                                value={
                                                                    newUser.name
                                                                }
                                                                onChange={(e) =>
                                                                    setNewUser({
                                                                        ...newUser,
                                                                        name: e
                                                                            .target
                                                                            .value,
                                                                    })
                                                                }
                                                                placeholder="Full Name"
                                                                required
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="email">
                                                                Email
                                                            </Label>
                                                            <Input
                                                                id="email"
                                                                type="email"
                                                                value={
                                                                    newUser.email
                                                                }
                                                                onChange={(e) =>
                                                                    setNewUser({
                                                                        ...newUser,
                                                                        email: e
                                                                            .target
                                                                            .value,
                                                                    })
                                                                }
                                                                placeholder="user@example.com"
                                                                required
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="password">
                                                                Password
                                                            </Label>
                                                            <Input
                                                                id="password"
                                                                type="password"
                                                                value={
                                                                    newUser.password
                                                                }
                                                                onChange={(e) =>
                                                                    setNewUser({
                                                                        ...newUser,
                                                                        password:
                                                                            e
                                                                                .target
                                                                                .value,
                                                                    })
                                                                }
                                                                placeholder="Password"
                                                                required
                                                                minLength={8}
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="role">
                                                                Role
                                                            </Label>
                                                            <Select
                                                                value={
                                                                    newUser.role
                                                                }
                                                                onValueChange={(
                                                                    value: string,
                                                                ) =>
                                                                    setNewUser({
                                                                        ...newUser,
                                                                        role: value as
                                                                            | 'admin'
                                                                            | 'user',
                                                                    })
                                                                }
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select role" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="user">
                                                                        User
                                                                    </SelectItem>
                                                                    <SelectItem value="admin">
                                                                        Admin
                                                                    </SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <DialogFooter>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                onClick={() =>
                                                                    setIsCreateUserDialogOpen(
                                                                        false,
                                                                    )
                                                                }
                                                                disabled={
                                                                    isCreatingUser
                                                                }
                                                            >
                                                                Cancel
                                                            </Button>
                                                            <Button
                                                                type="submit"
                                                                disabled={
                                                                    isCreatingUser
                                                                }
                                                            >
                                                                {isCreatingUser ? (
                                                                    <>
                                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                        Creating...
                                                                    </>
                                                                ) : (
                                                                    'Create User'
                                                                )}
                                                            </Button>
                                                        </DialogFooter>
                                                    </form>
                                                </TabsContent>

                                                <TabsContent
                                                    value="bulk"
                                                    className="mt-4 space-y-4"
                                                >
                                                    <div className="space-y-4">
                                                        {/* File Upload */}
                                                        <div className="space-y-2">
                                                            <Label htmlFor="csv-file">
                                                                CSV File
                                                            </Label>
                                                            <Input
                                                                id="csv-file"
                                                                type="file"
                                                                accept=".csv"
                                                                onChange={
                                                                    handleFileChange
                                                                }
                                                                ref={
                                                                    fileInputRef
                                                                }
                                                            />
                                                            <p className="text-muted-foreground text-xs">
                                                                CSV should have
                                                                columns: name,
                                                                email, password,
                                                                role.
                                                                <Button
                                                                    variant="link"
                                                                    className="ml-1 h-auto p-0 text-xs"
                                                                    onClick={() => {
                                                                        const csvContent =
                                                                            'name,email,password,role\nJohn Doe,john@example.com,password123,user\nJane Smith,jane@example.com,secure456,admin';
                                                                        const blob =
                                                                            new Blob(
                                                                                [
                                                                                    csvContent,
                                                                                ],
                                                                                {
                                                                                    type: 'text/csv',
                                                                                },
                                                                            );
                                                                        const url =
                                                                            window.URL.createObjectURL(
                                                                                blob,
                                                                            );
                                                                        const a =
                                                                            document.createElement(
                                                                                'a',
                                                                            );
                                                                        a.href =
                                                                            url;
                                                                        a.download =
                                                                            'members_template.csv';
                                                                        a.click();
                                                                        window.URL.revokeObjectURL(
                                                                            url,
                                                                        );
                                                                    }}
                                                                >
                                                                    Download
                                                                    Template
                                                                </Button>
                                                            </p>
                                                        </div>

                                                        {/* CSV Preview */}
                                                        {csvPreview.length >
                                                            0 && (
                                                            <div className="space-y-2">
                                                                <Label>
                                                                    Preview
                                                                    (first 5
                                                                    rows)
                                                                </Label>
                                                                <div className="max-h-40 overflow-y-auto rounded-md border p-3">
                                                                    <table className="w-full text-sm">
                                                                        <thead>
                                                                            <tr className="border-b">
                                                                                <th className="p-2 text-left">
                                                                                    Name
                                                                                </th>
                                                                                <th className="p-2 text-left">
                                                                                    Email
                                                                                </th>
                                                                                <th className="p-2 text-left">
                                                                                    Password
                                                                                </th>
                                                                                <th className="p-2 text-left">
                                                                                    Role
                                                                                </th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {csvPreview.map(
                                                                                (
                                                                                    row,
                                                                                    index,
                                                                                ) => (
                                                                                    <tr
                                                                                        key={
                                                                                            index
                                                                                        }
                                                                                        className="border-b"
                                                                                    >
                                                                                        <td className="p-2">
                                                                                            {
                                                                                                row.name
                                                                                            }
                                                                                        </td>
                                                                                        <td className="p-2">
                                                                                            {
                                                                                                row.email
                                                                                            }
                                                                                        </td>
                                                                                        <td className="p-2">
                                                                                            {
                                                                                                row.password
                                                                                            }
                                                                                        </td>
                                                                                        <td className="p-2">
                                                                                            {
                                                                                                row.role
                                                                                            }
                                                                                        </td>
                                                                                    </tr>
                                                                                ),
                                                                            )}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Errors */}
                                                        {csvErrors.length >
                                                            0 && (
                                                            <div className="space-y-2">
                                                                <Label className="text-destructive">
                                                                    Errors Found
                                                                </Label>
                                                                <div className="border-destructive/20 bg-destructive/5 max-h-32 overflow-y-auto rounded-md border p-3">
                                                                    {csvErrors.map(
                                                                        (
                                                                            error,
                                                                            index,
                                                                        ) => (
                                                                            <p
                                                                                key={
                                                                                    index
                                                                                }
                                                                                className="text-destructive text-sm"
                                                                            >
                                                                                {
                                                                                    error
                                                                                }
                                                                            </p>
                                                                        ),
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Summary */}
                                                        {csvData.length > 0 && (
                                                            <div className="bg-muted/50 rounded-md p-3">
                                                                <p className="text-sm">
                                                                    <strong>
                                                                        {
                                                                            csvData.length
                                                                        }
                                                                    </strong>{' '}
                                                                    members will
                                                                    be created.
                                                                    {csvErrors.length >
                                                                        0 && (
                                                                        <span className="text-destructive ml-2">
                                                                            Please
                                                                            fix
                                                                            errors
                                                                            before
                                                                            proceeding.
                                                                        </span>
                                                                    )}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <DialogFooter>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setIsCreateUserDialogOpen(
                                                                    false,
                                                                );
                                                                resetBulkUploadState();
                                                            }}
                                                            disabled={
                                                                isUploadingBulk
                                                            }
                                                        >
                                                            Cancel
                                                        </Button>
                                                        <Button
                                                            onClick={
                                                                handleBulkUpload
                                                            }
                                                            disabled={
                                                                isUploadingBulk ||
                                                                csvData.length ===
                                                                    0 ||
                                                                csvErrors.length >
                                                                    0
                                                            }
                                                        >
                                                            {isUploadingBulk ? (
                                                                <>
                                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                    Creating{' '}
                                                                    {
                                                                        csvData.length
                                                                    }{' '}
                                                                    members...
                                                                </>
                                                            ) : (
                                                                `Create ${csvData.length} Members`
                                                            )}
                                                        </Button>
                                                    </DialogFooter>
                                                </TabsContent>
                                            </Tabs>
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </div>
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
                                            setMemberSearchRole(
                                                value as
                                                    | 'all'
                                                    | 'admin'
                                                    | 'user',
                                            )
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
