'use client';

import React, { useState, useEffect } from 'react';
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
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

// Define types for the data we're working with
type User = {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    orgId: string;
    organization?: {
        id: string;
        name: string;
    };
    role: string;
    createdAt: string | Date;
    updatedAt: string | Date;
};

type Organization = {
    id: string;
    name: string;
};

export default function AdminDashboard() {
    const router = useRouter();
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState('users');

    // State for create user dialog
    const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        password: '',
        role: 'user' as 'admin' | 'user',
        orgId: '',
    });

    // State for create org dialog
    const [isCreateOrgDialogOpen, setIsCreateOrgDialogOpen] = useState(false);
    const [newOrg, setNewOrg] = useState({
        name: '',
    });

    // State for invite user dialog
    const [isInviteUserDialogOpen, setIsInviteUserDialogOpen] = useState(false);
    const [inviteUser, setInviteUser] = useState({
        email: '',
        role: 'user' as 'admin' | 'user',
        orgId: '',
    });

    // Queries
    const { data: users, isLoading: isLoadingUsers } =
        trpc.admin.getUsers.useQuery(undefined, {
            enabled: !!session && session.user.role === 'admin',
        });

    const { data: orgs, isLoading: isLoadingOrgs } =
        trpc.admin.getOrgs.useQuery(undefined, {
            enabled: !!session && session.user.role === 'admin',
        });

    // Mutations
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
            utils.admin.getUsers.invalidate();
        },
    });

    const createOrgMutation = trpc.admin.createOrg.useMutation({
        onSuccess: () => {
            setIsCreateOrgDialogOpen(false);
            setNewOrg({
                name: '',
            });
            utils.admin.getOrgs.invalidate();
        },
    });

    const inviteUserMutation = trpc.admin.inviteUser.useMutation({
        onSuccess: () => {
            setIsInviteUserDialogOpen(false);
            setInviteUser({
                email: '',
                role: 'user' as 'admin' | 'user',
                orgId: '',
            });
        },
    });

    const utils = trpc.useUtils();

    // Handle form submissions
    const handleCreateUser = (e: React.FormEvent) => {
        e.preventDefault();
        createUserMutation.mutate(newUser);
    };

    const handleCreateOrg = (e: React.FormEvent) => {
        e.preventDefault();
        createOrgMutation.mutate(newOrg);
    };

    const handleInviteUser = (e: React.FormEvent) => {
        e.preventDefault();
        inviteUserMutation.mutate(inviteUser);
    };

    // Use useEffect for navigation instead of doing it during render
    useEffect(() => {
        if (session === null) {
            router.push('/auth/login');
        }
    }, [session, router]);

    // Check if user is admin
    if (session === undefined) {
        return <div>Loading...</div>;
    }

    if (!session) {
        return null; // Return null and let the useEffect handle the redirect
    }

    if (session.user.role !== 'admin') {
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
                </TabsList>

                <TabsContent value="users">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>User Management</CardTitle>
                                <div className="space-x-2">
                                    <Dialog
                                        open={isInviteUserDialogOpen}
                                        onOpenChange={setIsInviteUserDialogOpen}
                                    >
                                        <DialogTrigger asChild>
                                            <Button variant="outline">
                                                Invite User
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <form onSubmit={handleInviteUser}>
                                                <DialogHeader>
                                                    <DialogTitle>
                                                        Invite User
                                                    </DialogTitle>
                                                    <DialogDescription>
                                                        Send an invitation email
                                                        to a new user.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="grid gap-4 py-4">
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label
                                                            htmlFor="invite-email"
                                                            className="text-right"
                                                        >
                                                            Email
                                                        </Label>
                                                        <Input
                                                            id="invite-email"
                                                            type="email"
                                                            value={
                                                                inviteUser.email
                                                            }
                                                            onChange={(e) =>
                                                                setInviteUser({
                                                                    ...inviteUser,
                                                                    email: e
                                                                        .target
                                                                        .value,
                                                                })
                                                            }
                                                            className="col-span-3"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label
                                                            htmlFor="invite-role"
                                                            className="text-right"
                                                        >
                                                            Role
                                                        </Label>
                                                        <Select
                                                            value={
                                                                inviteUser.role
                                                            }
                                                            onValueChange={(
                                                                value: string,
                                                            ) =>
                                                                setInviteUser({
                                                                    ...inviteUser,
                                                                    role: value as
                                                                        | 'admin'
                                                                        | 'user',
                                                                })
                                                            }
                                                        >
                                                            <SelectTrigger className="col-span-3">
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
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label
                                                            htmlFor="invite-org"
                                                            className="text-right"
                                                        >
                                                            Organization
                                                        </Label>
                                                        <Select
                                                            value={
                                                                inviteUser.orgId
                                                            }
                                                            onValueChange={(
                                                                value: string,
                                                            ) =>
                                                                setInviteUser({
                                                                    ...inviteUser,
                                                                    orgId: value,
                                                                })
                                                            }
                                                        >
                                                            <SelectTrigger className="col-span-3">
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
                                                </div>
                                                <DialogFooter>
                                                    <Button
                                                        type="submit"
                                                        disabled={
                                                            inviteUserMutation.isPending
                                                        }
                                                    >
                                                        {inviteUserMutation.isPending
                                                            ? 'Sending...'
                                                            : 'Send Invitation'}
                                                    </Button>
                                                </DialogFooter>
                                            </form>
                                        </DialogContent>
                                    </Dialog>

                                    <Dialog
                                        open={isCreateUserDialogOpen}
                                        onOpenChange={setIsCreateUserDialogOpen}
                                    >
                                        <DialogTrigger asChild>
                                            <Button>Create User</Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <form onSubmit={handleCreateUser}>
                                                <DialogHeader>
                                                    <DialogTitle>
                                                        Create User
                                                    </DialogTitle>
                                                    <DialogDescription>
                                                        Create a new user
                                                        account.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="grid gap-4 py-4">
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label
                                                            htmlFor="name"
                                                            className="text-right"
                                                        >
                                                            Name
                                                        </Label>
                                                        <Input
                                                            id="name"
                                                            value={newUser.name}
                                                            onChange={(e) =>
                                                                setNewUser({
                                                                    ...newUser,
                                                                    name: e
                                                                        .target
                                                                        .value,
                                                                })
                                                            }
                                                            className="col-span-3"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label
                                                            htmlFor="email"
                                                            className="text-right"
                                                        >
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
                                                            className="col-span-3"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label
                                                            htmlFor="password"
                                                            className="text-right"
                                                        >
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
                                                                        e.target
                                                                            .value,
                                                                })
                                                            }
                                                            className="col-span-3"
                                                            required
                                                            minLength={8}
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label
                                                            htmlFor="role"
                                                            className="text-right"
                                                        >
                                                            Role
                                                        </Label>
                                                        <Select
                                                            value={newUser.role}
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
                                                            <SelectTrigger className="col-span-3">
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
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label
                                                            htmlFor="org"
                                                            className="text-right"
                                                        >
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
                                                            <SelectTrigger className="col-span-3">
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
                                                </div>
                                                <DialogFooter>
                                                    <Button
                                                        type="submit"
                                                        disabled={
                                                            createUserMutation.isPending
                                                        }
                                                    >
                                                        {createUserMutation.isPending
                                                            ? 'Creating...'
                                                            : 'Create User'}
                                                    </Button>
                                                </DialogFooter>
                                            </form>
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
                            {isLoadingUsers ? (
                                <div className="py-4 text-center">
                                    Loading users...
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Organization</TableHead>
                                            <TableHead>Verified</TableHead>
                                            <TableHead>Created</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users?.map((user: User) => (
                                            <TableRow key={user.id}>
                                                <TableCell>
                                                    {user.name}
                                                </TableCell>
                                                <TableCell>
                                                    {user.email}
                                                </TableCell>
                                                <TableCell>
                                                    {user.role}
                                                </TableCell>
                                                <TableCell>
                                                    {user.organization?.name ||
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
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="organizations">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Organization Management</CardTitle>
                                <Dialog
                                    open={isCreateOrgDialogOpen}
                                    onOpenChange={setIsCreateOrgDialogOpen}
                                >
                                    <DialogTrigger asChild>
                                        <Button>Create Organization</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <form onSubmit={handleCreateOrg}>
                                            <DialogHeader>
                                                <DialogTitle>
                                                    Create Organization
                                                </DialogTitle>
                                                <DialogDescription>
                                                    Create a new organization.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="grid gap-4 py-4">
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <Label
                                                        htmlFor="org-name"
                                                        className="text-right"
                                                    >
                                                        Name
                                                    </Label>
                                                    <Input
                                                        id="org-name"
                                                        value={newOrg.name}
                                                        onChange={(e) =>
                                                            setNewOrg({
                                                                ...newOrg,
                                                                name: e.target
                                                                    .value,
                                                            })
                                                        }
                                                        className="col-span-3"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter>
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
                            <CardDescription>
                                Manage organizations and create new ones.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoadingOrgs ? (
                                <div className="py-4 text-center">
                                    Loading organizations...
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>ID</TableHead>
                                            <TableHead>Name</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {orgs?.map((org: Organization) => (
                                            <TableRow key={org.id}>
                                                <TableCell>{org.id}</TableCell>
                                                <TableCell>
                                                    {org.name}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
