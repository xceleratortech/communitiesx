'use client';

import React, { useState, useCallback } from 'react';
import { trpc } from '@/providers/trpc-provider';
import { useSession } from '@/server/auth/client';
import { Input } from '@/components/ui/input';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Search, Users, Building } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import debounce from 'lodash/debounce';

export default function OrganizationPage() {
    const session = useSession();
    const router = useRouter();
    const userId = session?.data?.user?.id;
    const [searchTerm, setSearchTerm] = useState('');

    const { data: organizations, isLoading: isLoadingInitial } =
        trpc.organizations.getOrganizationByUserId.useQuery(
            { userId: userId || '' },
            {
                enabled: !!userId && !searchTerm,
                refetchOnWindowFocus: false,
            },
        );

    const { data: searchResults, isLoading: isSearching } =
        trpc.organizations.searchOrganizations.useQuery(
            { userId: userId || '', searchTerm },
            {
                enabled: !!userId && !!searchTerm,
                refetchOnWindowFocus: false,
            },
        );

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            setSearchTerm(value);
        }, 300),
        [],
    );

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        debouncedSearch(e.target.value);
    };

    const isLoading = isLoadingInitial || isSearching;
    const displayedOrgs = searchTerm ? searchResults : organizations;

    if (!userId) {
        return null;
    }

    return (
        <div>
            <div className="my-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">My Organizations</h1>
                    <p className="text-muted-foreground">
                        Organizations you are a part of
                    </p>
                </div>
            </div>

            <Card className="mb-6">
                <CardHeader className="flex flex-row items-center">
                    <div>
                        <CardTitle>Organization Overview</CardTitle>
                        <CardDescription>
                            At a glance information about your organizations
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <div className="flex items-center gap-2 rounded-lg border p-3">
                            <div className="bg-primary/10 rounded-full p-2">
                                <Building className="text-primary h-5 w-5" />
                            </div>
                            <div>
                                {isLoading ? (
                                    <div className="bg-muted h-7 w-16 animate-pulse rounded"></div>
                                ) : (
                                    <div className="text-xl font-bold">
                                        {organizations?.length || 0}
                                    </div>
                                )}
                                <div className="text-muted-foreground text-xs">
                                    Total Organizations
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border p-3">
                            <div className="bg-primary/10 rounded-full p-2">
                                <Users className="text-primary h-5 w-5" />
                            </div>
                            <div>
                                {isLoading ? (
                                    <div className="bg-muted h-7 w-16 animate-pulse rounded"></div>
                                ) : (
                                    <div className="text-xl font-bold">
                                        {organizations?.reduce(
                                            (sum, org) =>
                                                sum + (org.memberCount || 0),
                                            0,
                                        ) || 0}
                                    </div>
                                )}
                                <div className="text-muted-foreground text-xs">
                                    Total Members
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>All Organizations</CardTitle>
                    <CardDescription>
                        View and manage your organizations
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 flex items-center justify-between">
                        <div className="relative max-w-sm">
                            <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
                            <Input
                                placeholder="Search organizations..."
                                className="pl-8"
                                onChange={handleSearchChange}
                            />
                        </div>
                    </div>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Organization</TableHead>
                                    <TableHead>Slug</TableHead>
                                    <TableHead>Members</TableHead>
                                    <TableHead>Created</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    [...Array(7)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell>
                                                <div className="bg-muted h-4 w-32 animate-pulse rounded" />
                                            </TableCell>
                                            <TableCell>
                                                <div className="bg-muted h-4 w-16 animate-pulse rounded" />
                                            </TableCell>
                                            <TableCell>
                                                <div className="bg-muted h-4 w-12 animate-pulse rounded" />
                                            </TableCell>
                                            <TableCell>
                                                <div className="bg-muted h-4 w-20 animate-pulse rounded" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : displayedOrgs?.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={4}
                                            className="text-muted-foreground py-10 text-center"
                                        >
                                            {searchTerm
                                                ? 'No organizations match your search.'
                                                : 'You do not belong to any organization.'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    displayedOrgs?.map((org) => (
                                        <TableRow key={org.id}>
                                            <TableCell
                                                className="cursor-pointer font-medium hover:underline"
                                                onClick={() =>
                                                    router.push(
                                                        `/organization/${org.slug}`,
                                                    )
                                                }
                                            >
                                                {org.name}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {org.slug || '—'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {org.memberCount || 0} members
                                            </TableCell>
                                            <TableCell>
                                                {new Date(
                                                    org.createdAt,
                                                ).toLocaleDateString()}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
