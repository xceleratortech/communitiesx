'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { trpc } from '@/providers/trpc-provider';
import React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditCommunityPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;
    const {
        data: community,
        isLoading,
        refetch,
    } = trpc.communities.getBySlug.useQuery({ slug });
    const updateCommunityMutation = trpc.community.updateCommunity.useMutation({
        onSuccess: () => {
            toast.success('Community updated successfully');
            refetch();
            router.push(`/communities/${slug}`);
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to update community');
        },
    });

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [rules, setRules] = useState('');
    const [banner, setBanner] = useState('');
    const [avatar, setAvatar] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Populate form fields when community loads
    React.useEffect(() => {
        if (community) {
            setName(community.name || '');
            setDescription(community.description || '');
            setRules(community.rules || '');
            setBanner(community.banner || '');
            setAvatar(community.avatar || '');
        }
    }, [community]);

    if (isLoading || !community) {
        return <EditCommunitySkeleton />;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        updateCommunityMutation.mutate({
            communityId: community.id,
            name,
            description,
            rules,
            banner,
            avatar,
        });
        setIsSubmitting(false);
    };

    return (
        <div className="container mx-auto max-w-2xl px-4 py-8 md:px-6">
            <Card>
                <CardHeader>
                    <CardTitle>Edit Community</CardTitle>
                    <CardDescription>
                        Update your community details below.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="mb-1 block font-medium">
                                Name
                            </label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                maxLength={50}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block font-medium">
                                Description
                            </label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                maxLength={300}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block font-medium">
                                Rules
                            </label>
                            <Textarea
                                value={rules}
                                onChange={(e) => setRules(e.target.value)}
                                rows={3}
                                maxLength={1000}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block font-medium">
                                Banner Image URL
                            </label>
                            <Input
                                value={banner}
                                onChange={(e) => setBanner(e.target.value)}
                                placeholder="https://..."
                            />
                        </div>
                        <div>
                            <label className="mb-1 block font-medium">
                                Avatar Image URL
                            </label>
                            <Input
                                value={avatar}
                                onChange={(e) => setAvatar(e.target.value)}
                                placeholder="https://..."
                            />
                        </div>
                        <div className="mt-4 flex gap-2">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                    router.push(`/communities/${slug}`)
                                }
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

function EditCommunitySkeleton() {
    return (
        <div className="container mx-auto max-w-2xl px-4 py-8 md:px-6">
            <Card>
                <CardHeader>
                    <Skeleton className="mb-2 h-8 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="mt-4 h-10 w-32" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
