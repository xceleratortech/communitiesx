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
import { Loading } from '@/components/ui/loading';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { isHtmlContentEmpty } from '@/lib/utils';
import { PollDisplay } from '@/components/polls';
import { PollCreator } from '@/components/polls';
import type { CreatePollData } from '@/types/poll';

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
    const [pollData, setPollData] = useState<CreatePollData | null>(null);
    const [isEditingPoll, setIsEditingPoll] = useState(false);
    const [pollCreationState, setPollCreationState] = useState<any>(null);

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

            // Initialize poll data if post has a poll
            if (post.poll) {
                const pollData = {
                    question: post.poll.question,
                    pollType: post.poll.pollType as 'single' | 'multiple',
                    options: post.poll.options.map((option) => option.text),
                    expiresAt: post.poll.expiresAt
                        ? new Date(post.poll.expiresAt)
                        : undefined,
                };
                setPollData(pollData);

                // Calculate expiration values from existing poll
                let expirationValue = 24;
                let expirationUnit: 'hours' | 'days' = 'hours';

                if (pollData.expiresAt) {
                    const now = new Date();
                    const diffMs = pollData.expiresAt.getTime() - now.getTime();
                    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

                    if (diffHours >= 24) {
                        expirationValue = Math.ceil(diffHours / 24);
                        expirationUnit = 'days';
                    } else {
                        expirationValue = diffHours;
                        expirationUnit = 'hours';
                    }
                }

                // Convert to PollCreationState format for PollCreator
                setPollCreationState({
                    isCreating: true,
                    question: pollData.question,
                    pollType: pollData.pollType,
                    options: pollData.options,
                    expiresAt: pollData.expiresAt,
                    hasExpiration: !!pollData.expiresAt,
                    expirationValue,
                    expirationUnit,
                });
            }
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

        const hasPoll =
            pollData && pollData.question.trim() && pollData.options.length > 0;
        const hasTitleOrContent = title.trim() || !isHtmlContentEmpty(content);

        if (!hasPoll && !hasTitleOrContent) {
            setError('Either title/content or poll is required.');
            return;
        }

        editPost.mutate({
            postId,
            title: title.trim() || (hasPoll ? pollData.question.trim() : ''),
            content: content,
            tagIds: selectedTags.map((tag) => tag.id), // Pass selected tag IDs
            poll: pollData || undefined, // Include poll data
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
        return <Loading message="Loading post..." />;
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
                        Title{' '}
                        {pollData && (
                            <span className="text-muted-foreground">
                                (optional)
                            </span>
                        )}
                    </label>
                    <Input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={
                            pollData
                                ? 'Enter post title (optional)'
                                : 'Enter post title'
                        }
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

                {/* Poll Section */}
                <div>
                    <div className="mb-2 flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">
                            Poll
                        </label>
                        <div className="flex gap-2">
                            {post.poll && !isEditingPoll && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsEditingPoll(true)}
                                >
                                    Edit Poll
                                </Button>
                            )}
                            {isEditingPoll && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsEditingPoll(false)}
                                >
                                    Cancel Edit
                                </Button>
                            )}
                        </div>
                    </div>

                    {post.poll && !isEditingPoll ? (
                        <div className="rounded-lg border bg-gray-50 p-4">
                            <PollDisplay
                                poll={{
                                    ...post.poll,
                                    pollType: post.poll.pollType as
                                        | 'single'
                                        | 'multiple',
                                    expiresAt:
                                        post.poll.expiresAt?.toISOString() ||
                                        null,
                                    createdAt:
                                        post.poll.createdAt.toISOString(),
                                    updatedAt:
                                        post.poll.updatedAt.toISOString(),
                                    options: post.poll.options.map(
                                        (option) => ({
                                            ...option,
                                            createdAt:
                                                option.createdAt.toISOString(),
                                        }),
                                    ),
                                }}
                                results={[]}
                                userVotes={[]}
                                canVote={false}
                                hasUserVoted={false}
                                totalVotes={0}
                                onVote={() => {}}
                                isVoting={false}
                            />
                        </div>
                    ) : (
                        <PollCreator
                            initialPoll={pollCreationState}
                            onPollChange={(poll) => {
                                setPollData(poll);
                                // Also update the creation state to keep them in sync
                                if (poll) {
                                    setPollCreationState({
                                        isCreating: true,
                                        question: poll.question,
                                        pollType: poll.pollType,
                                        options: poll.options,
                                        expiresAt: poll.expiresAt,
                                        hasExpiration: !!poll.expiresAt,
                                        expirationValue: 24,
                                        expirationUnit: 'hours' as const,
                                    });
                                }
                            }}
                        />
                    )}
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
                <Button
                    type="submit"
                    disabled={
                        editPost.isPending ||
                        (!pollData &&
                            !title.trim() &&
                            isHtmlContentEmpty(content))
                    }
                >
                    {editPost.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
            </form>
        </div>
    );
}
