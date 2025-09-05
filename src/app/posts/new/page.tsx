'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { useState, useEffect, Suspense } from 'react';
import { trpc } from '@/providers/trpc-provider';
import { useSession } from '@/server/auth/client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import TipTapEditor from '@/components/TipTapEditor';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Loading } from '@/components/ui/loading';
import { isOrgAdminForCommunity } from '@/lib/utils';
import { usePermission } from '@/hooks/use-permission';
import { PERMISSIONS } from '@/lib/permissions/permission-const';
import { isHtmlContentEmpty } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface Tag {
    id: number;
    name: string;
    description: string | null;
    communityId: number;
}

function NewPostForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const communityId = searchParams.get('communityId')
        ? parseInt(searchParams.get('communityId')!)
        : null;
    const communitySlug = searchParams.get('communitySlug');
    const { data: session } = useSession();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
    const [open, setOpen] = useState(false);

    // Fetch community to check membership status if communityId is provided
    const { data: community, isLoading: isLoadingCommunity } =
        trpc.communities.getById.useQuery(
            { id: communityId! },
            { enabled: !!communityId },
        );

    // Check if user is a member of the community
    const {
        checkCommunityPermission,
        isAppAdmin,
        isLoading: isPermissionLoading,
    } = usePermission();

    const userMembership = community?.members?.find(
        (m) => m.userId === session?.user.id,
    );

    // Check if user is a member of the community
    const isMember =
        !!userMembership && userMembership.membershipType === 'member';

    // Check if user can create posts using proper permission system
    const canCreatePost = React.useMemo(() => {
        if (!community?.id) return false;

        // SuperAdmin can create posts anywhere
        if (isAppAdmin()) return true;

        // Check if user has permission to create posts in this community
        const hasPermission = checkCommunityPermission(
            community.id.toString(),
            PERMISSIONS.CREATE_POST,
            community.orgId, // Pass community's orgId for org admin validation
        );

        if (hasPermission) return true;

        // Fallback: check if user is a member with appropriate role
        if (!userMembership || userMembership.membershipType !== 'member') {
            return false;
        }

        const roleHierarchy = {
            member: 1,
            moderator: 2,
            admin: 3,
        };

        const userRoleLevel =
            roleHierarchy[userMembership.role as keyof typeof roleHierarchy] ||
            0;
        const minRoleLevel =
            roleHierarchy[
                community?.postCreationMinRole as keyof typeof roleHierarchy
            ] || 1;

        return userRoleLevel >= minRoleLevel;
    }, [
        community?.id,
        userMembership,
        community?.postCreationMinRole,
        checkCommunityPermission,
        isAppAdmin,
    ]);

    // Get available tags for the community
    const availableTags = community?.tags || [];

    const createPost = trpc.community.createPost.useMutation({
        onSuccess: (post) => {
            // If post was created from a community, redirect to the community-specific post view
            if (communityId && communitySlug) {
                router.push(`/communities/${communitySlug}/posts/${post.id}`);
            } else {
                router.push(`/posts/${post.id}`);
            }
        },
    });

    // If community ID is provided but user cannot create posts, redirect back to community page
    useEffect(() => {
        if (
            communityId &&
            community &&
            !canCreatePost &&
            !isLoadingCommunity &&
            !isPermissionLoading
        ) {
            router.push(`/communities/${communitySlug}`);
        }
    }, [
        communityId,
        community,
        canCreatePost,
        communitySlug,
        router,
        isLoadingCommunity,
        isPermissionLoading,
    ]);

    if (!session) {
        return (
            <div className="mx-auto max-w-4xl p-4">
                <h1 className="mb-4 text-3xl font-bold">Access Denied</h1>
                <p className="mb-4 text-gray-600">
                    Please sign in to create a new post.
                </p>
                <Button asChild>
                    <Link href="/auth/login">Sign In</Link>
                </Button>
            </div>
        );
    }

    // Show loading state while checking community membership and permissions
    if (communityId && (isLoadingCommunity || isPermissionLoading)) {
        return <Loading message="Loading community information..." />;
    }

    // Show access denied if user is not a member of the community or cannot create posts
    if (communityId && !canCreatePost) {
        let alertTitle = 'Membership Required';
        let alertDescription = '';

        if (!isMember) {
            alertDescription =
                community?.type === 'private'
                    ? 'This is a private community. You must be a member to create posts, not just a follower.'
                    : 'You must be a member of this community to create posts.';
        } else {
            const roleDisplay = {
                member: 'All members',
                moderator: 'Moderators and admins',
                admin: 'Admins only',
            };

            const currentRequirement =
                community?.postCreationMinRole || 'member';
            alertTitle = 'Insufficient Permissions';
            alertDescription = `This community restricts post creation to: ${roleDisplay[currentRequirement as keyof typeof roleDisplay]}. Members can still comment and react to existing posts.`;
        }

        return (
            <div className="mx-auto max-w-4xl p-4">
                <h1 className="mb-4 text-3xl font-bold">Access Denied</h1>
                <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{alertTitle}</AlertTitle>
                    <AlertDescription>{alertDescription}</AlertDescription>
                </Alert>
                <Button asChild>
                    <Link href={`/communities/${communitySlug}`}>
                        Return to Community
                    </Link>
                </Button>
            </div>
        );
    }

    const handleTagSelect = (tag: Tag) => {
        const isAlreadySelected = selectedTags.some(
            (selectedTag) => selectedTag.id === tag.id,
        );

        if (isAlreadySelected) {
            setSelectedTags(
                selectedTags.filter((selectedTag) => selectedTag.id !== tag.id),
            );
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const handleTagRemove = (tagId: number) => {
        setSelectedTags(selectedTags.filter((tag) => tag.id !== tagId));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || isHtmlContentEmpty(content)) {
            return;
        }

        createPost.mutate({
            title: title.trim(),
            content: content,
            communityId: communityId,
            tagIds: selectedTags.map((tag) => tag.id), // Send the selected tag IDs
        });
    };

    return (
        <div className="mx-auto max-w-4xl py-4">
            <h1 className="text-3xl font-bold">Create New Post</h1>
            {communityId && communitySlug && (
                <div className="text-muted-foreground mb-4 text-sm">
                    Creating post in community:{' '}
                    <Link
                        href={`/communities/${communitySlug}`}
                        className="font-medium underline"
                    >
                        {communitySlug}
                    </Link>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                        type="text"
                        id="title"
                        placeholder="Enter post title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <Label htmlFor="content">Content</Label>
                    <TipTapEditor
                        content={content}
                        onChange={setContent}
                        placeholder="Write your post content here..."
                        communityId={communityId || undefined}
                        communitySlug={communitySlug || undefined}
                    />
                </div>

                {/* Tags Selection */}
                {availableTags.length > 0 && (
                    <div>
                        <Label>Tags</Label>
                        <div className="space-y-2">
                            <Popover open={open} onOpenChange={setOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={open}
                                        className="w-full justify-between"
                                    >
                                        {selectedTags.length > 0
                                            ? `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''} selected`
                                            : 'Select tags...'}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search tags..." />
                                        <CommandList>
                                            <CommandEmpty>
                                                No tags found.
                                            </CommandEmpty>
                                            <CommandGroup>
                                                {availableTags.map(
                                                    (tag: Tag) => (
                                                        <CommandItem
                                                            key={tag.id}
                                                            value={tag.name}
                                                            onSelect={() =>
                                                                handleTagSelect(
                                                                    tag,
                                                                )
                                                            }
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    'mr-2 h-4 w-4',
                                                                    selectedTags.some(
                                                                        (
                                                                            selectedTag,
                                                                        ) =>
                                                                            selectedTag.id ===
                                                                            tag.id,
                                                                    )
                                                                        ? 'opacity-100'
                                                                        : 'opacity-0',
                                                                )}
                                                            />
                                                            {tag.name}
                                                        </CommandItem>
                                                    ),
                                                )}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            {selectedTags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {selectedTags.map((tag) => (
                                        <Badge
                                            key={tag.id}
                                            variant="secondary"
                                            className="flex items-center gap-1"
                                        >
                                            {tag.name}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleTagRemove(tag.id)
                                                }
                                                className="ml-1 rounded-full p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <Button
                    type="submit"
                    disabled={
                        createPost.isPending ||
                        !title.trim() ||
                        isHtmlContentEmpty(content)
                    }
                    className="w-full"
                >
                    {createPost.isPending ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating Post...
                        </>
                    ) : (
                        'Create Post'
                    )}
                </Button>
            </form>
        </div>
    );
}

export default function NewPostPage() {
    return (
        <Suspense fallback={<Loading message="Loading editor..." />}>
            <NewPostForm />
        </Suspense>
    );
}
