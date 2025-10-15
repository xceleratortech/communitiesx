'use client';

import type React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { trpc } from '@/providers/trpc-provider';
import { useSession } from '@/server/auth/client';
import { Plus } from 'lucide-react';
import { usePermission } from '@/hooks/use-permission';
import { PERMISSIONS } from '@/lib/permissions/permission-const';

interface CreatePostDialogProps {
    children: React.ReactNode;
}

export function CreatePostDialog({ children }: CreatePostDialogProps) {
    const [open, setOpen] = useState(false);
    const [selectedCommunityId, setSelectedCommunityId] = useState<string>('');

    const session = useSession();
    const router = useRouter();
    const { checkOrgPermission, isAppAdmin, userDetails } = usePermission();

    // Get user's communities where they can create posts
    const userCommunitiesQuery =
        trpc.communities.getUserPostableCommunities.useQuery(undefined, {
            enabled: !!session.data?.user?.id,
        });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedCommunityId) return; // require a community selection

        const community = (userCommunitiesQuery.data || []).find(
            (c) => c.id.toString() === selectedCommunityId,
        );

        if (community) {
            const search = new URLSearchParams({
                communityId: community.id.toString(),
                communitySlug: community.slug,
            });
            router.push(`/posts/new?${search.toString()}`);
            setOpen(false);
        } else {
            router.push('/posts/new');
            setOpen(false);
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setSelectedCommunityId('');
        }
        setOpen(newOpen);
    };

    const userCommunities = userCommunitiesQuery.data || [];
    // getUserPostableCommunities already handles org admin logic and returns communities where user can post
    const communitiesWhereCanPost = userCommunities.filter((community) => {
        return (community as any).canPost === true;
    });

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Create New Post</DialogTitle>
                    <DialogDescription>
                        Choose a community where you have posting permissions.
                        You'll be taken to the post editor next.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="community">Community</Label>
                        <Select
                            value={selectedCommunityId}
                            onValueChange={setSelectedCommunityId}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a community" />
                            </SelectTrigger>
                            <SelectContent>
                                {communitiesWhereCanPost.map((community) => (
                                    <SelectItem
                                        key={community.id}
                                        value={community.id.toString()}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <span>{community.name}</span>
                                            <span className="text-muted-foreground text-xs">
                                                (
                                                {(community as any).reason ===
                                                'org_admin'
                                                    ? 'Org Admin'
                                                    : (community as any)
                                                            .reason ===
                                                        'super_admin'
                                                      ? 'Super Admin'
                                                      : (community as any)
                                                            .userRole ||
                                                        'Member'}
                                                )
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {communitiesWhereCanPost.length === 0 && (
                            <p className="text-muted-foreground text-sm">
                                You don't have permission to post in any
                                communities. Join a community to create posts.
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end space-x-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                !selectedCommunityId ||
                                communitiesWhereCanPost.length === 0
                            }
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Continue
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
