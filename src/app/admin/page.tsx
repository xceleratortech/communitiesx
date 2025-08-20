'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/providers/trpc-provider';
import { useSession } from '@/server/auth/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
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
import { Label } from '@/components/ui/label';
import { Loading } from '@/components/ui/loading';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Loader2,
    CheckCircle,
    UserMinus,
    Search,
    MoreHorizontal,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { toast } from 'sonner';
import debounce from 'lodash/debounce';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InviteUserDialog } from '@/components/invite-user-dialog';
import { usePermission } from '@/hooks/use-permission';
import { BadgeManagement } from '@/components/badge-management';
import {
    useCsvBulkUpload,
    CsvValidationRule,
} from '@/hooks/use-csv-bulk-upload';

type User = {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    orgId: string | null;
    organization?: {
        id: string;
        name: string;
    };
    role: string;
    appRole: string;
    createdAt: string | Date;
    updatedAt: string | Date;
};

type Organization = {
    id: string;
    name: string;
};

interface CsvUserRow {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'user';
    orgname: string;
    [key: string]: string; // Index signature to satisfy CsvRow constraint
}

export default function AdminDashboard() {
    const router = useRouter();
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState('users');
    const [isClient, setIsClient] = useState(false);

    // State for user removal alert dialog
    const [isRemoveUserDialogOpen, setIsRemoveUserDialogOpen] = useState(false);
    const [userToRemove, setUserToRemove] = useState<string | null>(null);

    // State for create user dialog
    const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        password: '',
        role: 'user' as 'admin' | 'user',
        orgId: '',
    });

    // CSV validation rules for admin users
    const csvValidationRules: CsvValidationRule[] = [
        { field: 'name', required: true },
        { field: 'email', required: true },
        { field: 'password', required: true, minLength: 8 },
        {
            field: 'role',
            required: true,
            allowedValues: ['admin', 'user'],
            defaultValue: 'user',
        },
        { field: 'orgname', required: true },
    ];

    // CSV bulk upload hook
    const csvBulkUpload = useCsvBulkUpload<CsvUserRow>({
        requiredHeaders: ['name', 'email', 'password', 'role', 'orgname'],
        validationRules: csvValidationRules,
        processRow: async (user) => {
            if (!orgs) {
                throw new Error('No organizations available');
            }

            // Find organization by name (case-insensitive)
            const org = orgs.find((org) => {
                const orgName = org.name.trim();
                const csvOrgName = user.orgname.trim();
                return orgName.toLowerCase() === csvOrgName.toLowerCase();
            });

            if (!org) {
                const availableOrgs = orgs.map((o) => o.name).join(', ');
                throw new Error(
                    `Organization "${user.orgname}" not found. ` +
                        `Available organizations: ${availableOrgs}. ` +
                        `Please check the organization name spelling.`,
                );
            }

            await createUserMutation.mutateAsync({
                name: user.name,
                email: user.email,
                password: user.password,
                role: user.role,
                orgId: org.id,
            });
        },
        onSuccess: (successCount) => {
            toast.success(`Successfully created ${successCount} users`);
            setIsCreateUserDialogOpen(false);
            csvBulkUpload.resetBulkUploadState();
            utils.admin.getUsersPaginated.invalidate();
        },
        onComplete: (results) => {
            // Handle partial success - update CSV data to show only failed rows
            if (results.successful.length > 0 && results.failed.length > 0) {
                csvBulkUpload.setCsvData(results.failed.map((f) => f.row));
                csvBulkUpload.setCsvPreview(results.failed.map((f) => f.row));
            }
        },
    });

    // State for create org dialog
    const [isCreateOrgDialogOpen, setIsCreateOrgDialogOpen] = useState(false);
    const [newOrg, setNewOrg] = useState({
        name: '',
        slug: '',
    });

    // For direct email verification
    const [verifyEmail, setVerifyEmail] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [verifyError, setVerifyError] = useState<string | null>(null);
    const [verifySuccess, setVerifySuccess] = useState(false);

    // Search state for organizations
    const [searchTerm, setSearchTerm] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const utils = trpc.useUtils();

    // User search and pagination state
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [userSearchRole, setUserSearchRole] = useState<
        'all' | 'super-admin' | 'org-admin' | 'user'
    >('all');
    const [userSearchOrg, setUserSearchOrg] = useState<string>('all');
    const [userSearchVerified, setUserSearchVerified] = useState<
        'all' | 'verified' | 'unverified'
    >('all');
    const [currentUserPage, setCurrentUserPage] = useState(1);
    const usersPerPage = 10;

    const { appRole } = usePermission();
    const isAppAdmin = appRole?.includes('admin');

    // Function to get display role based on appRole and role
    const getDisplayRole = (user: User): string => {
        if (user.appRole === 'admin') {
            return 'Super Admin';
        } else if (user.role === 'admin' && user.appRole === 'user') {
            return 'Org Admin';
        } else {
            return 'User';
        }
    };

    // Queries
    const {
        data: usersData,
        isLoading: isLoadingUsers,
        isFetching: isFetchingUsers,
    } = trpc.admin.getUsersPaginated.useQuery(
        {
            page: currentUserPage,
            limit: usersPerPage,
            search: userSearchTerm,
            role: userSearchRole,
            orgId: userSearchOrg === 'all' ? undefined : userSearchOrg,
            verified: userSearchVerified,
        },
        {
            enabled: !!session,
        },
    );

    const { data: orgs, isLoading: isLoadingOrgs } =
        trpc.admin.getOrgs.useQuery(undefined, {
            enabled: !!session,
        });

    const { data: organizations, isLoading: isLoadingInitial } =
        trpc.admin.getAllOrganizations.useQuery(undefined, {
            enabled: !searchTerm,
            refetchOnWindowFocus: false,
        });

    const { data: searchResults, isLoading: isSearching } =
        trpc.admin.searchOrganizations.useQuery(
            { searchTerm },
            {
                enabled: !!searchTerm,
                refetchOnWindowFocus: false,
            },
        );

    const makeAppAdminMutation = trpc.admin.makeAppAdmin.useMutation();

    // Extract users and pagination info from the response
    const users = usersData?.users || [];
    const pagination = usersData?.pagination;

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentUserPage(1);
    }, [userSearchTerm, userSearchRole, userSearchOrg, userSearchVerified]);

    // Mutations
    const makeAppAdmin = (userId: string) => {
        makeAppAdminMutation.mutate(
            { userId },
            {
                onSuccess: () => {
                    toast.success('User promoted to App Admin');
                    utils.admin.getUsersPaginated.invalidate();
                },
                onError: (error) => {
                    toast.error(`Failed to promote user: ${error.message}`);
                },
            },
        );
    };
    const createUserMutation = trpc.admin.createUser.useMutation({
        onSuccess: () => {
            setIsCreateUserDialogOpen(false);
            setNewUser({
                name: '',
                email: '',
                password: '',
                role: 'user' as 'admin' | 'user',
                orgId: '',
            });
            utils.admin.getUsersPaginated.invalidate();
        },
    });

    const createOrgMutation = trpc.admin.createOrg.useMutation({
        onSuccess: () => {
            setIsCreateOrgDialogOpen(false);
            setNewOrg({
                name: '',
                slug: '',
            });
            utils.admin.getOrgs.invalidate();
        },
    });

    const removeOrgMutation = trpc.admin.removeOrg.useMutation();

    const removeOrg = async (orgId: string) => {
        try {
            await removeOrgMutation.mutateAsync(
                { orgId },
                {
                    onSuccess: () => {
                        toast.success('Organization removed successfully');
                        utils.admin.getOrgs.invalidate();
                    },
                    onError: (error) => {
                        toast.error(
                            `Failed to remove organization: ${error.message}`,
                        );
                    },
                },
            );
        } catch (error) {
            console.error('Error removing organization:', error);
            toast.error('Failed to remove organization');
        }
    };

    const removeUserMutation = trpc.admin.removeUser.useMutation({
        onSuccess: () => {
            utils.admin.getUsersPaginated.invalidate();
        },
    });

    // Handle form submissions
    const handleCreateUser = (e: React.FormEvent) => {
        e.preventDefault();
        createUserMutation.mutate(newUser);
    };

    const handleCreateOrg = (e: React.FormEvent) => {
        e.preventDefault();
        createOrgMutation.mutate(newOrg);
    };

    // Updated to open the alert dialog instead of using browser confirm
    const handleRemoveUser = (userId: string) => {
        // Prevent admins from removing themselves
        if (userId === session?.user.id) {
            toast.error('You cannot remove yourself from the platform');
            return;
        }

        setUserToRemove(userId);
        setIsRemoveUserDialogOpen(true);
    };

    // Actual removal function called from the alert dialog
    const confirmRemoveUser = () => {
        if (userToRemove) {
            removeUserMutation.mutate({ userId: userToRemove });
            setIsRemoveUserDialogOpen(false);
            setUserToRemove(null);
        }
    };

    // Handle direct email verification
    const handleVerifyEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsVerifying(true);
        setVerifyError(null);
        setVerifySuccess(false);

        try {
            const response = await fetch('/api/auth/verify-email-direct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: verifyEmail }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to verify email');
            }

            setVerifySuccess(true);
            setVerifyEmail('');
        } catch (err) {
            setVerifyError(
                err instanceof Error ? err.message : 'Failed to verify email',
            );
        } finally {
            setIsVerifying(false);
        }
    };

    // Search handling
    const debouncedSearch = useCallback(
        debounce((value: string) => {
            setSearchTerm(value);
        }, 300),
        [],
    );

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        debouncedSearch(e.target.value);
    };

    // User search handling
    const debouncedUserSearch = useCallback(
        debounce((value: string) => {
            setUserSearchTerm(value);
        }, 300),
        [],
    );

    const handleUserSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        debouncedUserSearch(e.target.value);
    };

    // Pagination handlers
    const goToUserPage = (page: number) => {
        setCurrentUserPage(page);
    };

    const isLoading = isLoadingInitial || isSearching;
    const displayedOrgs = searchTerm ? searchResults : organizations;

    // Use useEffect for navigation instead of doing it during render
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Don't render anything meaningful during SSR to avoid hydration mismatches
    if (!isClient) {
        return <Loading message="Initializing..." />;
    }

    // Check if user is admin
    if (session === undefined) {
        return <Loading message="Checking permissions..." />;
    }

    if (!session) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h1 className="mb-4 text-3xl font-bold">
                    Authentication Required
                </h1>
                <p className="text-muted-foreground mb-8">
                    Please sign in to access the admin dashboard.
                </p>
                <Button asChild>
                    <Link href="/auth/login">Sign In</Link>
                </Button>
            </div>
        );
    }

    if (!isAppAdmin) {
        return (
            <div className="container mx-auto p-4">
                <h1 className="mb-4 text-2xl font-bold">Access Denied</h1>
                <p>You do not have permission to access this page.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="mb-6 text-3xl font-bold">Admin Dashboard</h1>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                    <TabsTrigger value="users">Users</TabsTrigger>
                    <TabsTrigger value="organizations">
                        Organizations
                    </TabsTrigger>
                    <TabsTrigger value="badges">Badges</TabsTrigger>
                    <TabsTrigger value="tools">Admin Tools</TabsTrigger>
                </TabsList>
                <TabsContent value="users">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>User Management</CardTitle>
                                <div className="space-x-2">
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
                                                    orgId: '',
                                                });
                                                csvBulkUpload.resetBulkUploadState();
                                            }
                                        }}
                                    >
                                        <DialogTrigger asChild>
                                            <Button>Create User</Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle>
                                                    Create User(s)
                                                </DialogTitle>
                                                <DialogDescription>
                                                    Create individual users or
                                                    upload multiple users via
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
                                                        <div className="flex flex-col gap-2">
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
                                                        <div className="flex flex-col gap-2">
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
                                                        <div className="flex flex-col gap-2">
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
                                                                className="w-full"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-2">
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
                                                                <SelectTrigger className="w-full">
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
                                                        <div className="flex flex-col gap-2">
                                                            <Label htmlFor="org">
                                                                Organization
                                                            </Label>
                                                            <Select
                                                                value={
                                                                    newUser.orgId
                                                                }
                                                                onValueChange={(
                                                                    value: string,
                                                                ) =>
                                                                    setNewUser({
                                                                        ...newUser,
                                                                        orgId: value,
                                                                    })
                                                                }
                                                            >
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue placeholder="Select organization" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {orgs?.map(
                                                                        (
                                                                            org: Organization,
                                                                        ) => (
                                                                            <SelectItem
                                                                                key={
                                                                                    org.id
                                                                                }
                                                                                value={
                                                                                    org.id
                                                                                }
                                                                            >
                                                                                {
                                                                                    org.name
                                                                                }
                                                                            </SelectItem>
                                                                        ),
                                                                    )}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:gap-0">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                onClick={() =>
                                                                    setIsCreateUserDialogOpen(
                                                                        false,
                                                                    )
                                                                }
                                                                disabled={
                                                                    createUserMutation.isPending
                                                                }
                                                                className="w-full sm:w-auto"
                                                            >
                                                                Cancel
                                                            </Button>
                                                            <Button
                                                                type="submit"
                                                                disabled={
                                                                    createUserMutation.isPending
                                                                }
                                                                className="w-full sm:w-auto"
                                                            >
                                                                {createUserMutation.isPending
                                                                    ? 'Creating...'
                                                                    : 'Create User'}
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
                                                                    csvBulkUpload.handleFileChange
                                                                }
                                                            />
                                                            <p className="text-muted-foreground text-xs">
                                                                CSV should have
                                                                columns: name,
                                                                email, password,
                                                                role, orgname.
                                                                <br />
                                                                <span className="text-muted-foreground/80 text-xs">
                                                                    Fields with
                                                                    commas will
                                                                    be
                                                                    automatically
                                                                    handled if
                                                                    properly
                                                                    quoted.
                                                                </span>
                                                                <Button
                                                                    variant="link"
                                                                    className="ml-1 h-auto p-0 text-xs"
                                                                    onClick={() => {
                                                                        const csvContent =
                                                                            'name,email,password,role,orgname\n"John Doe",john@example.com,password123,user,Acme Corporation\n"Jane Smith",jane@example.com,secure456,admin,Tech Solutions\n"Doe, John",john.doe@example.com,password789,user,"Tech Corp, Inc."';
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
                                                                            'users_template.csv';
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

                                                            {/* Show available organization names */}
                                                            {orgs &&
                                                                orgs.length >
                                                                    0 && (
                                                                    <div className="bg-muted/30 mt-2 rounded-md p-2 sm:p-3">
                                                                        <p className="mb-2 text-xs font-medium">
                                                                            Available
                                                                            Organization
                                                                            Names:
                                                                        </p>
                                                                        <div
                                                                            className={`text-muted-foreground space-y-1 text-xs ${orgs.length > 5 ? 'max-h-32 overflow-y-auto' : ''}`}
                                                                        >
                                                                            {orgs.map(
                                                                                (
                                                                                    org,
                                                                                    index,
                                                                                ) => (
                                                                                    <div
                                                                                        key={
                                                                                            org.id
                                                                                        }
                                                                                        className="flex flex-wrap items-center gap-1 sm:gap-2"
                                                                                    >
                                                                                        <span className="bg-background rounded px-1 py-1 font-mono text-xs break-all sm:px-2">
                                                                                            {
                                                                                                org.name
                                                                                            }
                                                                                        </span>
                                                                                    </div>
                                                                                ),
                                                                            )}
                                                                        </div>
                                                                        <p className="text-muted-foreground mt-2 text-xs">
                                                                            Use
                                                                            the
                                                                            exact
                                                                            organization
                                                                            names
                                                                            shown
                                                                            above
                                                                            in
                                                                            your
                                                                            CSV
                                                                            file.
                                                                        </p>
                                                                    </div>
                                                                )}
                                                        </div>

                                                        {/* CSV Preview */}
                                                        {csvBulkUpload
                                                            .csvPreview.length >
                                                            0 && (
                                                            <div className="space-y-2">
                                                                <Label>
                                                                    Preview
                                                                    (first 5
                                                                    rows)
                                                                </Label>
                                                                <div className="max-h-48 overflow-auto rounded-md border p-2 sm:p-3">
                                                                    {/* Mobile: Card Layout */}
                                                                    <div className="block space-y-3 sm:hidden">
                                                                        {csvBulkUpload.csvPreview.map(
                                                                            (
                                                                                row: CsvUserRow,
                                                                                index: number,
                                                                            ) => (
                                                                                <div
                                                                                    key={
                                                                                        index
                                                                                    }
                                                                                    className="bg-muted/20 rounded-md border p-3"
                                                                                >
                                                                                    <div className="grid grid-cols-1 gap-2 text-xs">
                                                                                        <div>
                                                                                            <span className="font-semibold">
                                                                                                Name:
                                                                                            </span>{' '}
                                                                                            {
                                                                                                row.name
                                                                                            }
                                                                                        </div>
                                                                                        <div>
                                                                                            <span className="font-semibold">
                                                                                                Email:
                                                                                            </span>{' '}
                                                                                            {
                                                                                                row.email
                                                                                            }
                                                                                        </div>
                                                                                        <div>
                                                                                            <span className="font-semibold">
                                                                                                Password:
                                                                                            </span>{' '}
                                                                                            {
                                                                                                row.password
                                                                                            }
                                                                                        </div>
                                                                                        <div>
                                                                                            <span className="font-semibold">
                                                                                                Role:
                                                                                            </span>{' '}
                                                                                            {
                                                                                                row.role
                                                                                            }
                                                                                        </div>
                                                                                        <div>
                                                                                            <span className="font-semibold">
                                                                                                Org
                                                                                                Name:
                                                                                            </span>{' '}
                                                                                            {
                                                                                                row.orgname
                                                                                            }
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            ),
                                                                        )}
                                                                    </div>

                                                                    {/* Desktop: Table Layout */}
                                                                    <table className="hidden w-full text-sm sm:table">
                                                                        <thead>
                                                                            <tr className="border-b">
                                                                                <th className="w-1/5 p-2 text-left">
                                                                                    Name
                                                                                </th>
                                                                                <th className="w-2/5 p-2 text-left">
                                                                                    Email
                                                                                </th>
                                                                                <th className="w-1/5 p-2 text-left">
                                                                                    Password
                                                                                </th>
                                                                                <th className="w-1/10 p-2 text-left">
                                                                                    Role
                                                                                </th>
                                                                                <th className="w-1/5 p-2 text-left">
                                                                                    Org
                                                                                    Name
                                                                                </th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {csvBulkUpload.csvPreview.map(
                                                                                (
                                                                                    row: CsvUserRow,
                                                                                    index: number,
                                                                                ) => (
                                                                                    <tr
                                                                                        key={
                                                                                            index
                                                                                        }
                                                                                        className="border-b"
                                                                                    >
                                                                                        <td className="p-2 text-xs break-words">
                                                                                            {
                                                                                                row.name
                                                                                            }
                                                                                        </td>
                                                                                        <td className="p-2 text-xs break-words">
                                                                                            {
                                                                                                row.email
                                                                                            }
                                                                                        </td>
                                                                                        <td className="p-2 text-xs break-words">
                                                                                            {
                                                                                                row.password
                                                                                            }
                                                                                        </td>
                                                                                        <td className="p-2 text-xs">
                                                                                            {
                                                                                                row.role
                                                                                            }
                                                                                        </td>
                                                                                        <td className="p-2 text-xs break-words">
                                                                                            {
                                                                                                row.orgname
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
                                                        {csvBulkUpload.csvErrors
                                                            .length > 0 && (
                                                            <div className="space-y-2">
                                                                <Label className="text-destructive">
                                                                    Errors Found
                                                                </Label>
                                                                <div className="border-destructive/20 bg-destructive/5 max-h-32 overflow-y-auto rounded-md border p-3">
                                                                    {csvBulkUpload.csvErrors.map(
                                                                        (
                                                                            error: string,
                                                                            index: number,
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
                                                        {csvBulkUpload.csvData
                                                            .length > 0 && (
                                                            <div className="bg-muted/50 rounded-md p-3">
                                                                <p className="text-sm">
                                                                    <strong>
                                                                        {
                                                                            csvBulkUpload
                                                                                .csvData
                                                                                .length
                                                                        }
                                                                    </strong>{' '}
                                                                    users will
                                                                    be created.
                                                                    {csvBulkUpload
                                                                        .csvErrors
                                                                        .length >
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

                                                        {/* Upload Results Summary */}
                                                        {csvBulkUpload.uploadResults && (
                                                            <div className="space-y-3">
                                                                <Label className="text-base font-semibold">
                                                                    Upload
                                                                    Results
                                                                </Label>

                                                                {/* Success Summary */}
                                                                {csvBulkUpload
                                                                    .uploadResults
                                                                    .successful
                                                                    .length >
                                                                    0 && (
                                                                    <div className="rounded-md border border-green-200 bg-green-50 p-3">
                                                                        <div className="mb-2 flex items-center gap-2">
                                                                            <CheckCircle className="h-5 w-5 text-green-600" />
                                                                            <span className="font-medium text-green-800">
                                                                                Successfully
                                                                                Created:{' '}
                                                                                {
                                                                                    csvBulkUpload
                                                                                        .uploadResults
                                                                                        .successful
                                                                                        .length
                                                                                }{' '}
                                                                                users
                                                                            </span>
                                                                        </div>
                                                                        <div className="space-y-1 text-sm text-green-700">
                                                                            {csvBulkUpload.uploadResults.successful
                                                                                .slice(
                                                                                    0,
                                                                                    3,
                                                                                )
                                                                                .map(
                                                                                    (
                                                                                        user: CsvUserRow,
                                                                                        index: number,
                                                                                    ) => (
                                                                                        <div
                                                                                            key={
                                                                                                index
                                                                                            }
                                                                                            className="flex items-center gap-2"
                                                                                        >
                                                                                            <span className="font-medium">
                                                                                                {
                                                                                                    user.name
                                                                                                }
                                                                                            </span>
                                                                                            <span className="text-green-600">
                                                                                                (
                                                                                                {
                                                                                                    user.email
                                                                                                }

                                                                                                )
                                                                                            </span>
                                                                                            <Badge
                                                                                                variant="secondary"
                                                                                                className="text-xs"
                                                                                            >
                                                                                                {
                                                                                                    user.role
                                                                                                }
                                                                                            </Badge>
                                                                                        </div>
                                                                                    ),
                                                                                )}
                                                                            {csvBulkUpload
                                                                                .uploadResults
                                                                                .successful
                                                                                .length >
                                                                                3 && (
                                                                                <p className="text-xs text-green-600">
                                                                                    ...and{' '}
                                                                                    {csvBulkUpload
                                                                                        .uploadResults
                                                                                        .successful
                                                                                        .length -
                                                                                        3}{' '}
                                                                                    more
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Failure Summary */}
                                                                {csvBulkUpload
                                                                    .uploadResults
                                                                    .failed
                                                                    .length >
                                                                    0 && (
                                                                    <div className="rounded-md border border-red-200 bg-red-50 p-3">
                                                                        <div className="mb-2 flex items-center gap-2">
                                                                            <UserMinus className="h-5 w-5 text-red-600" />
                                                                            <span className="font-medium text-red-800">
                                                                                Failed
                                                                                to
                                                                                Create:{' '}
                                                                                {
                                                                                    csvBulkUpload
                                                                                        .uploadResults
                                                                                        .failed
                                                                                        .length
                                                                                }{' '}
                                                                                users
                                                                            </span>
                                                                        </div>
                                                                        <div className="space-y-1 text-sm text-red-700">
                                                                            {csvBulkUpload.uploadResults.failed
                                                                                .slice(
                                                                                    0,
                                                                                    3,
                                                                                )
                                                                                .map(
                                                                                    (
                                                                                        failure: {
                                                                                            row: CsvUserRow;
                                                                                            error: string;
                                                                                            rowNumber: number;
                                                                                        },
                                                                                        index: number,
                                                                                    ) => (
                                                                                        <div
                                                                                            key={
                                                                                                index
                                                                                            }
                                                                                            className="flex items-center gap-2"
                                                                                        >
                                                                                            <span className="font-medium">
                                                                                                {
                                                                                                    failure
                                                                                                        .row
                                                                                                        .name
                                                                                                }
                                                                                            </span>
                                                                                            <span className="text-red-600">
                                                                                                (
                                                                                                {
                                                                                                    failure
                                                                                                        .row
                                                                                                        .email
                                                                                                }

                                                                                                )
                                                                                            </span>
                                                                                            <Badge
                                                                                                variant="secondary"
                                                                                                className="text-xs"
                                                                                            >
                                                                                                Row{' '}
                                                                                                {
                                                                                                    failure.rowNumber
                                                                                                }
                                                                                            </Badge>
                                                                                        </div>
                                                                                    ),
                                                                                )}
                                                                            {csvBulkUpload
                                                                                .uploadResults
                                                                                .failed
                                                                                .length >
                                                                                3 && (
                                                                                <p className="text-xs text-red-600">
                                                                                    ...and{' '}
                                                                                    {csvBulkUpload
                                                                                        .uploadResults
                                                                                        .failed
                                                                                        .length -
                                                                                        3}{' '}
                                                                                    more
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        <div className="mt-2 text-xs text-red-600">
                                                                            <strong>
                                                                                Tip:
                                                                            </strong>{' '}
                                                                            Fix
                                                                            the
                                                                            errors
                                                                            above
                                                                            and
                                                                            try
                                                                            uploading
                                                                            again.
                                                                            Only
                                                                            failed
                                                                            rows
                                                                            will
                                                                            be
                                                                            processed.
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:gap-0">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setIsCreateUserDialogOpen(
                                                                    false,
                                                                );
                                                                csvBulkUpload.resetBulkUploadState();
                                                            }}
                                                            disabled={
                                                                csvBulkUpload.isUploadingBulk
                                                            }
                                                            className="w-full sm:w-auto"
                                                        >
                                                            Cancel
                                                        </Button>

                                                        {/* Retry Failed Rows Button */}
                                                        {csvBulkUpload.uploadResults &&
                                                            csvBulkUpload
                                                                .uploadResults
                                                                .failed.length >
                                                                0 && (
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        // Clear results and errors to allow retry
                                                                        csvBulkUpload.setUploadResults(
                                                                            null,
                                                                        );
                                                                        csvBulkUpload.setCsvErrors(
                                                                            [],
                                                                        );
                                                                    }}
                                                                    disabled={
                                                                        csvBulkUpload.isUploadingBulk
                                                                    }
                                                                    className="w-full sm:w-auto"
                                                                >
                                                                    Retry Failed
                                                                    Rows
                                                                </Button>
                                                            )}

                                                        <Button
                                                            onClick={
                                                                csvBulkUpload.handleBulkUpload
                                                            }
                                                            disabled={
                                                                csvBulkUpload.isUploadingBulk ||
                                                                csvBulkUpload
                                                                    .csvData
                                                                    .length ===
                                                                    0 ||
                                                                csvBulkUpload
                                                                    .csvErrors
                                                                    .length > 0
                                                            }
                                                            className="w-full sm:w-auto"
                                                        >
                                                            {csvBulkUpload.isUploadingBulk ? (
                                                                <>
                                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                    Creating{' '}
                                                                    {
                                                                        csvBulkUpload
                                                                            .csvData
                                                                            .length
                                                                    }{' '}
                                                                    users...
                                                                </>
                                                            ) : csvBulkUpload.uploadResults &&
                                                              csvBulkUpload
                                                                  .uploadResults
                                                                  .failed
                                                                  .length >
                                                                  0 ? (
                                                                `Retry ${csvBulkUpload.csvData.length} Failed Users`
                                                            ) : (
                                                                `Create ${csvBulkUpload.csvData.length} Users`
                                                            )}
                                                        </Button>
                                                    </DialogFooter>
                                                </TabsContent>
                                            </Tabs>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                            <CardDescription>
                                Manage users, create new accounts, and send
                                invitations.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Search and Filter Controls */}
                            <div className="mb-6 space-y-4">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                                    <div className="flex-1">
                                        <Label
                                            htmlFor="user-search"
                                            className="text-sm font-medium"
                                        >
                                            Search Users
                                        </Label>
                                        <div className="relative mt-1">
                                            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                                            <Input
                                                id="user-search"
                                                placeholder="Search by name or email..."
                                                value={userSearchTerm}
                                                onChange={
                                                    handleUserSearchChange
                                                }
                                                className={`pl-10 ${userSearchTerm ? 'border-primary' : ''}`}
                                            />
                                            {isFetchingUsers && (
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
                                            value={userSearchRole}
                                            onValueChange={(value) => {
                                                setUserSearchRole(
                                                    value as
                                                        | 'all'
                                                        | 'super-admin'
                                                        | 'org-admin'
                                                        | 'user',
                                                );
                                            }}
                                        >
                                            <SelectTrigger
                                                className={`mt-1 ${userSearchRole !== 'all' ? 'border-primary' : ''}`}
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">
                                                    All Roles
                                                </SelectItem>
                                                <SelectItem value="super-admin">
                                                    Super Admin
                                                </SelectItem>
                                                <SelectItem value="org-admin">
                                                    Org Admin
                                                </SelectItem>
                                                <SelectItem value="user">
                                                    User
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="w-full sm:w-40">
                                        <Label
                                            htmlFor="org-filter"
                                            className="text-sm font-medium"
                                        >
                                            Organization
                                        </Label>
                                        <Select
                                            value={userSearchOrg}
                                            onValueChange={(value) => {
                                                setUserSearchOrg(value);
                                            }}
                                        >
                                            <SelectTrigger
                                                className={`mt-1 ${userSearchOrg !== 'all' ? 'border-primary' : ''}`}
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">
                                                    All Organizations
                                                </SelectItem>
                                                {orgs?.map(
                                                    (org: Organization) => (
                                                        <SelectItem
                                                            key={org.id}
                                                            value={org.id}
                                                        >
                                                            {org.name}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="w-full sm:w-32">
                                        <Label
                                            htmlFor="verified-filter"
                                            className="text-sm font-medium"
                                        >
                                            Verified
                                        </Label>
                                        <Select
                                            value={userSearchVerified}
                                            onValueChange={(value) => {
                                                setUserSearchVerified(
                                                    value as
                                                        | 'all'
                                                        | 'verified'
                                                        | 'unverified',
                                                );
                                            }}
                                        >
                                            <SelectTrigger
                                                className={`mt-1 ${userSearchVerified !== 'all' ? 'border-primary' : ''}`}
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">
                                                    All
                                                </SelectItem>
                                                <SelectItem value="verified">
                                                    Verified
                                                </SelectItem>
                                                <SelectItem value="unverified">
                                                    Unverified
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Results Summary */}
                                <div className="text-muted-foreground flex items-center justify-between text-sm">
                                    <span>
                                        {isLoadingUsers || isFetchingUsers ? (
                                            <span className="flex items-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                {isFetchingUsers &&
                                                !isLoadingUsers
                                                    ? 'Searching...'
                                                    : 'Loading...'}
                                            </span>
                                        ) : (
                                            `Showing ${(currentUserPage - 1) * usersPerPage + 1}-${Math.min(currentUserPage * usersPerPage, pagination?.total || 0)} of ${pagination?.total || 0} users`
                                        )}
                                    </span>
                                    {userSearchTerm ||
                                    userSearchRole !== 'all' ||
                                    userSearchOrg !== 'all' ||
                                    userSearchVerified !== 'all' ? (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setUserSearchTerm('');
                                                setUserSearchRole('all');
                                                setUserSearchOrg('all');
                                                setUserSearchVerified('all');
                                            }}
                                        >
                                            Clear Filters
                                        </Button>
                                    ) : null}
                                </div>
                            </div>

                            {isLoadingUsers ? (
                                <div className="space-y-4">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>Role</TableHead>
                                                <TableHead>
                                                    Organization
                                                </TableHead>
                                                <TableHead>Verified</TableHead>
                                                <TableHead>Created</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Array.from({
                                                length: usersPerPage,
                                            }).map((_, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>
                                                        <div className="bg-muted h-4 w-24 animate-pulse rounded" />
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="bg-muted h-4 w-32 animate-pulse rounded" />
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="bg-muted h-4 w-20 animate-pulse rounded" />
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="bg-muted h-4 w-28 animate-pulse rounded" />
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="bg-muted h-4 w-16 animate-pulse rounded" />
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="bg-muted h-4 w-20 animate-pulse rounded" />
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="bg-muted h-8 w-8 animate-pulse rounded" />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>Role</TableHead>
                                                <TableHead>
                                                    Organization
                                                </TableHead>
                                                <TableHead>Verified</TableHead>
                                                <TableHead>Created</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {users.length === 0 ? (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={7}
                                                        className="text-muted-foreground py-8 text-center"
                                                    >
                                                        {userSearchTerm ||
                                                        userSearchRole !==
                                                            'all' ||
                                                        userSearchOrg !==
                                                            'all' ||
                                                        userSearchVerified !==
                                                            'all' ? (
                                                            <div className="space-y-2">
                                                                <p>
                                                                    No users
                                                                    found
                                                                    matching
                                                                    your filters
                                                                </p>
                                                                <p className="text-xs">
                                                                    Try
                                                                    adjusting
                                                                    your search
                                                                    criteria or
                                                                    clearing
                                                                    some filters
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            'No users found'
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                users.map((user: User) => (
                                                    <TableRow key={user.id}>
                                                        <TableCell>
                                                            {user.name}
                                                        </TableCell>
                                                        <TableCell>
                                                            {user.email}
                                                        </TableCell>
                                                        <TableCell>
                                                            {getDisplayRole(
                                                                user,
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {user.organization
                                                                ?.name ||
                                                                user.orgId}
                                                        </TableCell>
                                                        <TableCell>
                                                            {user.emailVerified
                                                                ? 'Yes'
                                                                : 'No'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {new Date(
                                                                user.createdAt,
                                                            ).toLocaleDateString()}
                                                        </TableCell>
                                                        <TableCell>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger
                                                                    asChild
                                                                >
                                                                    <Button
                                                                        variant="ghost"
                                                                        className="h-8 w-8 p-0"
                                                                    >
                                                                        <span className="sr-only">
                                                                            Open
                                                                            menu
                                                                        </span>
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuLabel>
                                                                        Actions
                                                                    </DropdownMenuLabel>
                                                                    <DropdownMenuItem
                                                                        onClick={() =>
                                                                            makeAppAdmin(
                                                                                user.id,
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            user.appRole ===
                                                                            'admin'
                                                                        }
                                                                    >
                                                                        <CheckCircle className="mr-2 h-4 w-4" />
                                                                        {user.appRole ===
                                                                        'admin'
                                                                            ? 'Already Admin'
                                                                            : 'Make Admin'}
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={() =>
                                                                            handleRemoveUser(
                                                                                user.id,
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            user.id ===
                                                                            session
                                                                                .user
                                                                                .id
                                                                        }
                                                                        className="text-destructive"
                                                                    >
                                                                        <UserMinus className="mr-2 h-4 w-4" />
                                                                        Remove
                                                                        User
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>

                                    {/* Pagination Controls */}
                                    {pagination &&
                                        pagination.totalPages > 1 && (
                                            <div className="mt-6 flex items-center justify-between">
                                                <div className="text-muted-foreground text-sm">
                                                    {isFetchingUsers &&
                                                    !isLoadingUsers ? (
                                                        <span className="flex items-center gap-2">
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                            Loading page{' '}
                                                            {currentUserPage}...
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <span>
                                                                Page{' '}
                                                                {
                                                                    currentUserPage
                                                                }{' '}
                                                                of{' '}
                                                                {
                                                                    pagination.totalPages
                                                                }
                                                            </span>
                                                            <span className="ml-2">
                                                                •
                                                            </span>
                                                            <span className="ml-2">
                                                                {
                                                                    pagination.total
                                                                }{' '}
                                                                total users
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            goToUserPage(1)
                                                        }
                                                        disabled={
                                                            currentUserPage ===
                                                                1 ||
                                                            isFetchingUsers
                                                        }
                                                    >
                                                        <ChevronsLeft className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            goToUserPage(
                                                                currentUserPage -
                                                                    1,
                                                            )
                                                        }
                                                        disabled={
                                                            currentUserPage ===
                                                                1 ||
                                                            isFetchingUsers
                                                        }
                                                    >
                                                        <ChevronLeft className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            goToUserPage(
                                                                currentUserPage +
                                                                    1,
                                                            )
                                                        }
                                                        disabled={
                                                            currentUserPage ===
                                                                pagination.totalPages ||
                                                            isFetchingUsers
                                                        }
                                                    >
                                                        <ChevronRight className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            goToUserPage(
                                                                pagination.totalPages,
                                                            )
                                                        }
                                                        disabled={
                                                            currentUserPage ===
                                                                pagination.totalPages ||
                                                            isFetchingUsers
                                                        }
                                                    >
                                                        <ChevronsRight className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="organizations">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Organization Management</CardTitle>
                                <div className="flex gap-2">
                                    <InviteUserDialog orgs={orgs ?? []}>
                                        <Button variant="outline">
                                            Invite User
                                        </Button>
                                    </InviteUserDialog>
                                    <Dialog
                                        open={isCreateOrgDialogOpen}
                                        onOpenChange={setIsCreateOrgDialogOpen}
                                    >
                                        <DialogTrigger asChild>
                                            <Button>Create Organization</Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>
                                                    Create New Organization
                                                </DialogTitle>
                                                <DialogDescription>
                                                    Add a new organization to
                                                    the platform. Click create
                                                    when you're done.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <form
                                                onSubmit={handleCreateOrg}
                                                className="space-y-4"
                                            >
                                                <div className="grid gap-4">
                                                    <div>
                                                        <div className="flex flex-col gap-2">
                                                            <Label htmlFor="org-name">
                                                                Name
                                                            </Label>
                                                            <Input
                                                                id="org-name"
                                                                value={
                                                                    newOrg.name
                                                                }
                                                                onChange={(e) =>
                                                                    setNewOrg({
                                                                        ...newOrg,
                                                                        name: e
                                                                            .target
                                                                            .value,
                                                                    })
                                                                }
                                                                placeholder="Acme Corporation"
                                                                required
                                                            />
                                                        </div>
                                                        <p className="text-muted-foreground mt-1 text-xs">
                                                            The display name of
                                                            the organization.
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <div className="flex flex-col gap-2">
                                                            <Label htmlFor="org-slug">
                                                                Slug
                                                            </Label>
                                                            <Input
                                                                id="org-slug"
                                                                value={
                                                                    newOrg.slug ||
                                                                    ''
                                                                }
                                                                onChange={(e) =>
                                                                    setNewOrg({
                                                                        ...newOrg,
                                                                        slug: e
                                                                            .target
                                                                            .value,
                                                                    })
                                                                }
                                                                placeholder="acme"
                                                                required
                                                                pattern="^[a-z0-9-]+$"
                                                                minLength={2}
                                                            />
                                                        </div>
                                                        <p className="text-muted-foreground mt-1 text-xs">
                                                            Used in URLs and API
                                                            requests. Lowercase
                                                            letters, numbers,
                                                            and hyphens only.
                                                        </p>
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() =>
                                                            setIsCreateOrgDialogOpen(
                                                                false,
                                                            )
                                                        }
                                                        disabled={
                                                            createOrgMutation.isPending
                                                        }
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        type="submit"
                                                        disabled={
                                                            createOrgMutation.isPending
                                                        }
                                                    >
                                                        {createOrgMutation.isPending
                                                            ? 'Creating...'
                                                            : 'Create Organization'}
                                                    </Button>
                                                </DialogFooter>
                                            </form>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                            <CardDescription>
                                Manage organizations and create new ones.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoadingOrgs ? (
                                <div className="py-4 text-center">
                                    <Loading
                                        message="Loading organizations..."
                                        size="sm"
                                    />
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Organization</TableHead>
                                            <TableHead>Slug</TableHead>
                                            <TableHead>Members</TableHead>
                                            <TableHead>Created</TableHead>
                                            <TableHead className="text-right">
                                                Actions
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {displayedOrgs?.map((org) => (
                                            <TableRow key={org.id}>
                                                <TableCell
                                                    className="cursor-pointer font-medium hover:underline"
                                                    onClick={() => {
                                                        window.location.href = `/admin/organizations/${org.slug}`;
                                                    }}
                                                >
                                                    {org.name}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge>
                                                        {org.slug || '—'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {org.memberCount || 0}{' '}
                                                    members
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(
                                                        org.createdAt,
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
                                                                <span className="sr-only">
                                                                    Open menu
                                                                </span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>
                                                                Actions
                                                            </DropdownMenuLabel>
                                                            <DropdownMenuItem
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    className="flex w-full justify-start"
                                                                    asChild
                                                                >
                                                                    <a
                                                                        href={`/admin/organizations/${org.slug}`}
                                                                    >
                                                                        View
                                                                        Details
                                                                    </a>
                                                                </Button>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    removeOrg(
                                                                        org.id,
                                                                    )
                                                                }
                                                                className="text-destructive"
                                                            >
                                                                Remove
                                                                Organization
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="badges">
                    <Card>
                        <CardHeader>
                            <CardTitle>Badge Management</CardTitle>
                            <CardDescription>
                                Manage badges for organizations. Select an
                                organization to view and manage its badges.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {organizations && organizations.length > 0 ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                        {organizations.map((org) => (
                                            <Card
                                                key={org.id}
                                                className="hover:bg-muted/50 cursor-pointer"
                                            >
                                                <CardHeader className="pb-3">
                                                    <CardTitle className="text-lg">
                                                        {org.name}
                                                    </CardTitle>
                                                    <CardDescription>
                                                        ID: {org.id}
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <Link
                                                        href={`/admin/badges/${org.id}`}
                                                    >
                                                        <Button
                                                            variant="outline"
                                                            className="w-full"
                                                        >
                                                            Manage Badges
                                                        </Button>
                                                    </Link>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="py-8 text-center">
                                    <p className="text-muted-foreground">
                                        No organizations found. Create an
                                        organization first to manage badges.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="tools">
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Verify Email Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Verify User Email</CardTitle>
                                <CardDescription>
                                    Directly verify a user's email address
                                </CardDescription>
                            </CardHeader>
                            <form
                                onSubmit={handleVerifyEmail}
                                className="space-y-4"
                            >
                                <CardContent>
                                    <div>
                                        <div className="space-y-2">
                                            <label
                                                htmlFor="verify-email"
                                                className="text-sm font-medium"
                                            >
                                                Email Address
                                            </label>
                                            <Input
                                                id="verify-email"
                                                type="email"
                                                placeholder="user@example.com"
                                                value={verifyEmail}
                                                onChange={(e) =>
                                                    setVerifyEmail(
                                                        e.target.value,
                                                    )
                                                }
                                                required
                                            />
                                        </div>

                                        {verifyError && (
                                            <div className="bg-destructive/15 text-destructive rounded-md p-3 text-sm">
                                                {verifyError}
                                            </div>
                                        )}

                                        {verifySuccess && (
                                            <div className="rounded-md bg-green-100 p-3 text-sm text-green-800">
                                                Email verified successfully!
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button
                                        type="submit"
                                        disabled={isVerifying}
                                    >
                                        {isVerifying ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Verifying...
                                            </>
                                        ) : (
                                            'Verify Email'
                                        )}
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Remove User Alert Dialog */}
            <AlertDialog
                open={isRemoveUserDialogOpen}
                onOpenChange={setIsRemoveUserDialogOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Kick User</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove this user? This
                            action cannot be undone and will delete the user's
                            account, community memberships, and all associated
                            data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmRemoveUser}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Kick User
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
