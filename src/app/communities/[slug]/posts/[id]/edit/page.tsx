'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { trpc } from '@/providers/trpc-provider';
import { useSession } from '@/server/auth/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import TipTapEditor from '@/components/TipTapEditor';
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
import { Check, ChevronsUpDown, X, ArrowLeft, Home, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function EditCommunityPostPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const postId = parseInt(params.id as string);
    const communitySlug = params.slug as string;
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [error, setError] = useState('');
    const [selectedTags, setSelectedTags] = useState<any[]>([]);
    const [open, setOpen] = useState(false);

    const { data: post, isLoading } = trpc.community.getPost.useQuery(
        { postId },
        { enabled: !!session },
    );

    // Fetch community data for context
    const { data: community } = trpc.communities.getBySlug.useQuery(
        { slug: communitySlug },
        { enabled: !!session && !!communitySlug },
    );

    const editPost = trpc.community.editPost.useMutation({
        onSuccess: () => {
            router.push(`/communities/${communitySlug}/posts/${postId}`);
        },
        onError: (err: any) => {
            setError(err.message || 'Failed to update post');
        },
    });

    // Fetch available tags for the post's community
    const communityId = post?.communityId;
    const { data: communityData, isLoading: isLoadingCommunity } =
        trpc.communities.getById.useQuery(
            { id: communityId! },
            { enabled: !!communityId },
        );
    const availableTags = communityData?.tags || [];

    useEffect(() => {
        if (post) {
            setTitle(post.title);
            setContent(post.content);
            // Pre-select tags
            setSelectedTags(post.tags || []);
        }
    }, [post]);

    const handleTagSelect = (tag: any) => {
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
        setError('');
        if (!title.trim() || !content.trim()) {
            setError('Title and content are required.');
            return;
        }
        editPost.mutate({
            postId,
            title: title.trim(),
            content: content,
            tagIds: selectedTags.map((tag) => tag.id), // Pass selected tag IDs
        });
    };

    if (!session) {
        return (
            <div className="mx-auto max-w-4xl p-4">
                <h1 className="mb-4 text-3xl font-bold">Access Denied</h1>
                <p className="mb-4 text-gray-600">
                    Please sign in to edit this post.
                </p>
            </div>
        );
    }

    if (isLoading) {
        return <div className="p-4">Loading post...</div>;
    }

    if (!post) {
        return <div className="p-4">Post not found</div>;
    }

    if (post.isDeleted) {
        router.push(`/communities/${communitySlug}/posts/${postId}`);
        return null;
    }

    return (
        <div className="mx-auto max-w-4xl py-4">
            {/* Breadcrumb Navigation */}
            <nav className="text-muted-foreground mb-6 flex items-center space-x-2 text-sm">
                <Link
                    href="/"
                    className="hover:text-foreground flex items-center transition-colors"
                >
                    <Home className="mr-1 h-4 w-4" />
                    Home
                </Link>
                <span>/</span>
                <Link
                    href="/communities"
                    className="hover:text-foreground flex items-center transition-colors"
                >
                    <Users className="mr-1 h-4 w-4" />
                    Communities
                </Link>
                <span>/</span>
                <Link
                    href={`/communities/${communitySlug}`}
                    className="hover:text-foreground flex items-center transition-colors"
                >
                    {community?.name || 'Community'}
                </Link>
                <span>/</span>
                <Link
                    href={`/communities/${communitySlug}/posts/${postId}`}
                    className="hover:text-foreground flex items-center transition-colors"
                >
                    Posts
                </Link>
                <span>/</span>
                <span className="text-foreground font-medium">Edit Post</span>
            </nav>

            {/* Community Context Card */}
            {community && (
                <Card className="mb-6">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage
                                        src={community.avatar || undefined}
                                        alt={community.name}
                                    />
                                    <AvatarFallback className="bg-primary text-sm font-semibold">
                                        {community.name
                                            .substring(0, 2)
                                            .toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h2 className="text-lg font-semibold">
                                        {community.name}
                                    </h2>
                                    <div className="text-muted-foreground flex items-center space-x-2 text-sm">
                                        <Badge
                                            variant={
                                                community.type === 'private'
                                                    ? 'secondary'
                                                    : 'outline'
                                            }
                                        >
                                            {community.type === 'private'
                                                ? 'Private'
                                                : 'Public'}
                                        </Badge>
                                        <span>•</span>
                                        <span>Edit Community Post</span>
                                    </div>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    router.push(
                                        `/communities/${communitySlug}/posts/${postId}`,
                                    )
                                }
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Post
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <h1 className="mb-6 text-3xl font-bold">Edit {post.title}</h1>
            {error && <div className="mb-4 text-red-500">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label
                        htmlFor="title"
                        className="mb-1 block text-sm font-medium text-gray-700"
                    >
                        Title
                    </label>
                    <Input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label
                        htmlFor="content"
                        className="mb-1 block text-sm font-medium text-gray-700"
                    >
                        Content
                    </label>
                    <TipTapEditor
                        key={`editor-${post?.id}-${post?.updatedAt}`}
                        content={content}
                        onChange={setContent}
                        placeholder="Edit your post content here..."
                        postId={postId}
                        communityId={post?.communityId || undefined}
                        communitySlug={community?.slug || undefined}
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
                                                    (tag: any) => (
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
                                                            <div>
                                                                <div className="font-medium">
                                                                    {tag.name}
                                                                </div>
                                                                {tag.description && (
                                                                    <div className="text-muted-foreground text-sm">
                                                                        {
                                                                            tag.description
                                                                        }
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </CommandItem>
                                                    ),
                                                )}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            {/* Selected Tags Display */}
                            {selectedTags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {selectedTags.map((tag) => (
                                        <Badge
                                            key={tag.id}
                                            variant="secondary"
                                            className="flex items-center gap-1"
                                        >
                                            {tag.name}
                                            <X
                                                className="h-3 w-3 cursor-pointer"
                                                onClick={() =>
                                                    handleTagRemove(tag.id)
                                                }
                                            />
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                <Button type="submit" disabled={editPost.isPending}>
                    {editPost.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
            </form>
        </div>
    );
}
