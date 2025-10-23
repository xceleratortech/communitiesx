'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Users, Building, Crown } from 'lucide-react';
import { trpc } from '@/providers/trpc-provider';

interface Community {
    id: number;
    name: string;
    description: string | null;
    slug: string;
    userRole: string;
    canPost: boolean;
    reason: 'member' | 'org_admin' | 'super_admin';
    organization?: {
        id: string;
        name: string;
        createdAt: Date;
        slug: string;
        allowCrossOrgDM: boolean;
    } | null;
}

interface CommunitySelectorProps {
    selectedCommunities: number[];
    onSelectionChange: (communityIds: number[]) => void;
    onNext: () => void;
}

export function CommunitySelector({
    selectedCommunities,
    onSelectionChange,
    onNext,
}: CommunitySelectorProps) {
    const [isLoading, setIsLoading] = useState(false);

    const { data: communities, isLoading: isLoadingCommunities } =
        trpc.communities.getUserPostableCommunities.useQuery();

    const handleCommunityToggle = (communityId: number) => {
        if (selectedCommunities.includes(communityId)) {
            onSelectionChange(
                selectedCommunities.filter((id) => id !== communityId),
            );
        } else {
            onSelectionChange([...selectedCommunities, communityId]);
        }
    };

    const handleNext = async () => {
        if (selectedCommunities.length === 0) return;

        setIsLoading(true);
        try {
            onNext();
        } finally {
            setIsLoading(false);
        }
    };

    const getRoleIcon = (reason: string) => {
        switch (reason) {
            case 'super_admin':
                return <Crown className="h-4 w-4 text-yellow-500" />;
            case 'org_admin':
                return <Building className="h-4 w-4 text-blue-500" />;
            case 'member':
                return <Users className="h-4 w-4 text-green-500" />;
            default:
                return <Users className="h-4 w-4 text-gray-500" />;
        }
    };

    const getRoleBadge = (reason: string) => {
        switch (reason) {
            case 'super_admin':
                return (
                    <Badge
                        variant="secondary"
                        className="bg-yellow-100 text-yellow-800"
                    >
                        Super Admin
                    </Badge>
                );
            case 'org_admin':
                return (
                    <Badge
                        variant="secondary"
                        className="bg-blue-100 text-blue-800"
                    >
                        Org Admin
                    </Badge>
                );
            case 'member':
                return (
                    <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-800"
                    >
                        Member
                    </Badge>
                );
            default:
                return null;
        }
    };

    if (isLoadingCommunities) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading communities...</span>
            </div>
        );
    }

    if (!communities || communities.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>No Communities Available</CardTitle>
                    <CardDescription>
                        You don't have permission to post in any communities.
                        Please join a community or contact your organization
                        admin.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <>
            <div className="space-y-6 pb-20">
                <div className="text-center">
                    <h2 className="text-2xl font-bold">Select Communities</h2>
                    <p className="text-muted-foreground mt-2">
                        Choose which communities you want to share this content
                        to
                    </p>
                </div>

                <div className="grid max-h-96 gap-4 overflow-y-auto">
                    {communities.map((community: Community) => (
                        <Card
                            key={community.id}
                            className={`cursor-pointer transition-all hover:shadow-md ${
                                selectedCommunities.includes(community.id)
                                    ? 'ring-primary bg-primary/5 ring-2'
                                    : 'hover:bg-muted/50'
                            }`}
                            onClick={() => handleCommunityToggle(community.id)}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start space-x-3">
                                    <Checkbox
                                        checked={selectedCommunities.includes(
                                            community.id,
                                        )}
                                        onChange={() =>
                                            handleCommunityToggle(community.id)
                                        }
                                        className="mt-1"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center space-x-3">
                                            <h3 className="truncate text-lg font-semibold">
                                                {community.name}
                                            </h3>
                                            <div className="flex items-center space-x-2">
                                                {getRoleIcon(community.reason)}
                                                {getRoleBadge(community.reason)}
                                            </div>
                                        </div>

                                        {community.description && (
                                            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                                                {community.description}
                                            </p>
                                        )}

                                        {community.organization && (
                                            <p className="text-muted-foreground mt-2 text-xs">
                                                Organization:{' '}
                                                {community.organization.name}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="flex items-center justify-between border-t pt-4">
                    <p className="text-muted-foreground text-sm">
                        {selectedCommunities.length} community
                        {selectedCommunities.length !== 1 ? 'ies' : ''} selected
                    </p>
                </div>
            </div>
            <div className="fixed right-4 bottom-4 z-50">
                <Button
                    onClick={handleNext}
                    disabled={selectedCommunities.length === 0 || isLoading}
                    className="min-w-24"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Next
                        </>
                    ) : (
                        'Next'
                    )}
                </Button>
            </div>
        </>
    );
}
