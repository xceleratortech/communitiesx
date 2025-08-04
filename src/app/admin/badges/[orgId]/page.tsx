'use client';

import { useParams } from 'next/navigation';
import { BadgeManagement } from '@/components/badge-management';
import { trpc } from '@/providers/trpc-provider';
import { Loading } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

export default function OrgBadgeManagementPage() {
    const params = useParams();
    const orgId = params.orgId as string;

    const { data: organization, isLoading: isLoadingOrg } =
        trpc.organizations.getOrgDetails.useQuery(
            { orgId },
            { enabled: !!orgId },
        );

    if (isLoadingOrg) {
        return <Loading message="Loading organization..." />;
    }

    if (!organization) {
        return (
            <div className="container mx-auto p-4">
                <div className="mb-6">
                    <Button asChild variant="ghost">
                        <Link href="/admin">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Admin Dashboard
                        </Link>
                    </Button>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Organization Not Found</CardTitle>
                        <CardDescription>
                            The organization you're looking for doesn't exist or
                            you don't have permission to access it.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4">
            <div className="mb-6">
                <Button asChild variant="ghost">
                    <Link href="/admin">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Admin Dashboard
                    </Link>
                </Button>
            </div>

            <div className="mb-6">
                <h1 className="text-3xl font-bold">Badge Management</h1>
                <p className="text-muted-foreground">
                    Managing badges for{' '}
                    <span className="font-medium">{organization.name}</span>
                </p>
            </div>

            <BadgeManagement orgId={orgId} />
        </div>
    );
}
