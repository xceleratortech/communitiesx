'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { trpc } from '@/providers/trpc-provider';
import { useSession } from '@/server/auth/client';
import { Globe, Lock, Users, Calendar } from 'lucide-react';

export default function ExploreCommunitiesPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const session = useSession();

    const communitiesQuery = trpc.communities.getAll.useQuery({
        limit: 20,
    });

    const communities = communitiesQuery.data?.items || [];
    const isLoading = communitiesQuery.isLoading;

    const filteredCommunities = communities.filter(
        (community) =>
            community.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            community.description
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase()),
    );

    return (
        <div className="py-4">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Explore Communities</h1>
                <p className="text-muted-foreground">
                    Discover and join communities that interest you
                </p>
            </div>

            <div className="mb-6">
                <Input
                    type="text"
                    placeholder="Search communities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-md"
                />
            </div>

            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(6)].map((_, index) => (
                        <Card key={index}>
                            <CardHeader>
                                <div className="flex items-center space-x-3">
                                    <Skeleton className="h-12 w-12 rounded-full" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="mb-2 h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredCommunities.map((community) => (
                        <Card
                            key={community.id}
                            className="transition-shadow hover:shadow-md"
                        >
                            <CardHeader>
                                <div className="flex items-center space-x-3">
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage
                                            src={community.avatar || undefined}
                                            alt={community.name}
                                        />
                                        <AvatarFallback>
                                            {community.name
                                                .substring(0, 2)
                                                .toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <CardTitle className="truncate text-lg">
                                            {community.name}
                                        </CardTitle>
                                        <div className="mt-1 flex items-center space-x-2">
                                            {community.type === 'public' ? (
                                                <Globe className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <Lock className="h-4 w-4 text-orange-500" />
                                            )}
                                            <Badge
                                                variant="secondary"
                                                className="text-xs"
                                            >
                                                {community.type}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <CardDescription className="mb-4 line-clamp-3">
                                    {community.description ||
                                        'No description available'}
                                </CardDescription>

                                <div className="text-muted-foreground mb-4 flex items-center justify-between text-sm">
                                    <div className="flex items-center space-x-1">
                                        <Users className="h-4 w-4" />
                                        <span>
                                            {community.memberCount || 0} members
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <Calendar className="h-4 w-4" />
                                        <span>
                                            {new Date(
                                                community.createdAt,
                                            ).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                <Button asChild className="w-full">
                                    <Link
                                        href={`/communities/${community.slug}`}
                                    >
                                        View Community
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {!isLoading && filteredCommunities.length === 0 && (
                <div className="py-8 text-center">
                    <p className="text-muted-foreground mb-4">
                        {searchTerm
                            ? 'No communities found matching your search.'
                            : 'No communities available.'}
                    </p>
                    {searchTerm && (
                        <Button
                            variant="outline"
                            onClick={() => setSearchTerm('')}
                        >
                            Clear Search
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
