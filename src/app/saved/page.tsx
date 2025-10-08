'use client';
import Link from 'next/link';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { trpc } from '@/providers/trpc-provider';
import { useSession } from '@/server/auth/client';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Loader2,
    Bookmark,
    MessageSquare,
    ChevronDown,
    Ellipsis,
} from 'lucide-react';
import { SafeHtml } from '@/lib/sanitize';
import { SafeHtmlWithoutImages } from '@/components/ui/safe-html-without-images';
import { MixedMediaCarousel } from '@/components/ui/mixed-media-carousel';
import { HtmlImageCarousel } from '@/components/ui/html-image-carousel';
import { Separator } from '@/components/ui/separator';
import { LikeButton } from '@/components/ui/like-button';
import { ShareButton } from '@/components/ui/share-button';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useSavedPostsSync } from '@/hooks/use-saved-posts-sync';
import { formatRelativeTime, isHtmlContentEmpty } from '@/lib/utils';
import TipTapEditor from '@/components/TipTapEditor';
import { Plus, Minus } from 'lucide-react';

// Local type matching the fields used in this page
type SavedPost = {
    id: number;
    title: string;
    content: string;
    createdAt: string | number | Date;
    isDeleted?: boolean;
    likeCount?: number;
    isLiked?: boolean;
    isSaved?: boolean;
    comments?: any[];
    attachments?: any[];
    author?: {
        id?: string;
        name?: string;
        organization?: { name?: string } | null;
    } | null;
    community?: {
        slug: string;
        name?: string | null;
        avatar?: string | null;
    } | null;
};

// Lightweight inline comments preview component used in feed cards
function InlineCommentsPreview({
    post,
    session,
}: {
    post: SavedPost;
    session: ReturnType<typeof useSession>['data'];
}) {
    const router = useRouter();
    const utils = trpc.useUtils();
    const [commentContent, setCommentContent] = useState('');
    const [replyingTo, setReplyingTo] = useState<number | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [expandedComments, setExpandedComments] = useState<Set<number>>(
        new Set(),
    );

    const { data: fullPost, isLoading } = trpc.community.getPost.useQuery(
        { postId: post.id },
        { enabled: !!session },
    );

    const createComment = trpc.community.createComment.useMutation({
        onSuccess: () => {
            setCommentContent('');
            setReplyingTo(null);
            setReplyContent('');
            utils.community.getPost.invalidate({ postId: post.id });
        },
    });

    const handleSubmit = async () => {
        if (!session) return;
        if (isHtmlContentEmpty(commentContent)) return;
        await createComment.mutate({
            postId: post.id,
            content: commentContent,
            parentId: replyingTo ?? undefined,
        });
    };

    const handleSubmitReply = async (parentId: number) => {
        if (!session) return;
        if (isHtmlContentEmpty(replyContent)) return;
        await createComment.mutate({
            postId: post.id,
            content: replyContent,
            parentId,
        });
    };

    const toggleCommentExpansion = (commentId: number) => {
        setExpandedComments((prev) => {
            const next = new Set(prev);
            if (next.has(commentId)) {
                next.delete(commentId);
            } else {
                next.add(commentId);
            }
            return next;
        });
    };

    const viewAllHref = post.community
        ? `/communities/${post.community.slug}/posts/${post.id}#comments`
        : `/posts/${post.id}#comments`;

    const commentsList = (fullPost?.comments as any[]) || [];
    const rootComments = commentsList.filter((c) => !c.parentId);
    const previewRoots = rootComments.slice(0, 2);

    return (
        <div className="bg-muted/20 rounded-md border p-2">
            {/* Composer */}
            <div className="space-y-2">
                <TipTapEditor
                    content={commentContent}
                    onChange={setCommentContent}
                    placeholder={
                        session ? 'Add a comment' : 'Sign in to comment'
                    }
                    variant="compact"
                    postId={post.id}
                />
                <div className="flex justify-end gap-2">
                    <Button
                        size="sm"
                        disabled={
                            !session ||
                            createComment.isPending ||
                            isHtmlContentEmpty(commentContent)
                        }
                        onClick={handleSubmit}
                    >
                        {createComment.isPending
                            ? 'Posting...'
                            : 'Post Comment'}
                    </Button>
                </div>
            </div>

            {/* Recent comments */}
            <div className="mt-3 space-y-2">
                {isLoading ? (
                    <div className="text-muted-foreground text-sm">
                        Loading comments…
                    </div>
                ) : previewRoots.length === 0 ? (
                    <div className="text-muted-foreground text-sm">
                        No comments yet.
                    </div>
                ) : (
                    previewRoots.map((c) => {
                        const replies: any[] = Array.isArray(c.replies)
                            ? c.replies
                            : [];
                        const previewReplies = replies.slice(0, 2);

                        return (
                            <div key={c.id} className="rounded-sm border p-2">
                                <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs">
                                    <Avatar className="h-5 w-5">
                                        <AvatarImage
                                            src={c.author?.avatar || undefined}
                                        />
                                        <AvatarFallback className="text-[10px]">
                                            {c.author?.name
                                                ? c.author.name
                                                      .substring(0, 2)
                                                      .toUpperCase()
                                                : 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-foreground font-medium">
                                        {c.author?.name || 'Unknown'}
                                    </span>
                                    <span>•</span>
                                    <span>
                                        {new Date(c.createdAt).toLocaleString()}
                                    </span>
                                </div>
                                <SafeHtml
                                    html={c.content}
                                    className="prose prose-sm dark:prose-invert max-w-none text-sm"
                                />
                                {/* Actions */}
                                <div className="mt-1 flex items-center gap-2">
                                    <button
                                        className="text-muted-foreground hover:text-foreground text-xs underline"
                                        onClick={(e) => {
                                            preventEventPropagation(
                                                e as unknown as React.MouseEvent,
                                            );
                                            setReplyingTo(c.id);
                                        }}
                                        disabled={!session}
                                    >
                                        Reply
                                    </button>
                                    {previewReplies.length > 0 && (
                                        <button
                                            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
                                            onClick={(e) => {
                                                preventEventPropagation(
                                                    e as unknown as React.MouseEvent,
                                                );
                                                toggleCommentExpansion(c.id);
                                            }}
                                        >
                                            {expandedComments.has(c.id) ? (
                                                <Minus className="h-3 w-3" />
                                            ) : (
                                                <Plus className="h-3 w-3" />
                                            )}
                                            {expandedComments.has(c.id)
                                                ? 'Hide'
                                                : 'Show'}{' '}
                                            replies
                                        </button>
                                    )}
                                </div>
                                {/* Show "+" indicator when replies are collapsed */}
                                {previewReplies.length > 0 &&
                                    !expandedComments.has(c.id) && (
                                        <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                                            <Plus className="h-3 w-3" />+
                                            {previewReplies.length} replies
                                        </div>
                                    )}
                                {/* Reply editor for root comment */}
                                {replyingTo === c.id && (
                                    <div
                                        className="mt-2 space-y-2"
                                        onClick={preventEventPropagation}
                                    >
                                        <TipTapEditor
                                            content={replyContent}
                                            onChange={setReplyContent}
                                            placeholder={
                                                session
                                                    ? 'Write your reply…'
                                                    : 'Sign in to reply'
                                            }
                                            variant="compact"
                                            postId={post.id}
                                        />
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => {
                                                    preventEventPropagation(
                                                        e as unknown as React.MouseEvent,
                                                    );
                                                    setReplyingTo(null);
                                                    setReplyContent('');
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                size="sm"
                                                disabled={
                                                    !session ||
                                                    createComment.isPending ||
                                                    isHtmlContentEmpty(
                                                        replyContent,
                                                    )
                                                }
                                                onClick={(e) => {
                                                    preventEventPropagation(
                                                        e as unknown as React.MouseEvent,
                                                    );
                                                    handleSubmitReply(c.id);
                                                }}
                                            >
                                                {createComment.isPending
                                                    ? 'Posting…'
                                                    : 'Post Reply'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                {/* Replies preview */}
                                {previewReplies.length > 0 &&
                                    expandedComments.has(c.id) && (
                                        <div className="mt-2 space-y-2 border-l pl-2">
                                            {previewReplies.map((r) => {
                                                const subReplies: any[] =
                                                    Array.isArray(r.replies)
                                                        ? r.replies
                                                        : [];
                                                const previewSubReplies =
                                                    subReplies.slice(0, 2);

                                                return (
                                                    <div
                                                        key={r.id}
                                                        className="text-sm"
                                                    >
                                                        <div className="text-muted-foreground mb-0.5 flex items-center gap-2 text-xs">
                                                            <Avatar className="h-4 w-4">
                                                                <AvatarImage
                                                                    src={
                                                                        r.author
                                                                            ?.avatar ||
                                                                        undefined
                                                                    }
                                                                />
                                                                <AvatarFallback className="text-[8px]">
                                                                    {r.author
                                                                        ?.name
                                                                        ? r.author.name
                                                                              .substring(
                                                                                  0,
                                                                                  2,
                                                                              )
                                                                              .toUpperCase()
                                                                        : 'U'}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-foreground font-medium">
                                                                {r.author
                                                                    ?.name ||
                                                                    'Unknown'}
                                                            </span>
                                                            <span>•</span>
                                                            <span>
                                                                {new Date(
                                                                    r.createdAt,
                                                                ).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <SafeHtml
                                                            html={r.content}
                                                            className="prose prose-sm dark:prose-invert max-w-none"
                                                        />
                                                        <div className="mt-1 flex items-center gap-2">
                                                            <button
                                                                className="text-muted-foreground hover:text-foreground text-xs underline"
                                                                onClick={(
                                                                    e,
                                                                ) => {
                                                                    preventEventPropagation(
                                                                        e as unknown as React.MouseEvent,
                                                                    );
                                                                    setReplyingTo(
                                                                        r.id,
                                                                    );
                                                                }}
                                                                disabled={
                                                                    !session
                                                                }
                                                            >
                                                                Reply
                                                            </button>
                                                            {subReplies.length >
                                                                0 && (
                                                                <button
                                                                    className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
                                                                    onClick={(
                                                                        e,
                                                                    ) => {
                                                                        preventEventPropagation(
                                                                            e as unknown as React.MouseEvent,
                                                                        );
                                                                        toggleCommentExpansion(
                                                                            r.id,
                                                                        );
                                                                    }}
                                                                >
                                                                    {expandedComments.has(
                                                                        r.id,
                                                                    ) ? (
                                                                        <Minus className="h-3 w-3" />
                                                                    ) : (
                                                                        <Plus className="h-3 w-3" />
                                                                    )}
                                                                    {expandedComments.has(
                                                                        r.id,
                                                                    )
                                                                        ? 'Hide'
                                                                        : 'Show'}{' '}
                                                                    replies
                                                                </button>
                                                            )}
                                                        </div>
                                                        {/* Show "+" indicator when sub-replies are collapsed */}
                                                        {subReplies.length >
                                                            0 &&
                                                            !expandedComments.has(
                                                                r.id,
                                                            ) && (
                                                                <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                                                                    <Plus className="h-3 w-3" />
                                                                    +
                                                                    {
                                                                        subReplies.length
                                                                    }{' '}
                                                                    replies
                                                                </div>
                                                            )}
                                                        {replyingTo ===
                                                            r.id && (
                                                            <div
                                                                className="mt-2 space-y-2"
                                                                onClick={
                                                                    preventEventPropagation
                                                                }
                                                            >
                                                                <TipTapEditor
                                                                    content={
                                                                        replyContent
                                                                    }
                                                                    onChange={
                                                                        setReplyContent
                                                                    }
                                                                    placeholder={
                                                                        session
                                                                            ? 'Write your reply…'
                                                                            : 'Sign in to reply'
                                                                    }
                                                                    variant="compact"
                                                                    postId={
                                                                        post.id
                                                                    }
                                                                />
                                                                <div className="flex justify-end gap-2">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={(
                                                                            e,
                                                                        ) => {
                                                                            preventEventPropagation(
                                                                                e as unknown as React.MouseEvent,
                                                                            );
                                                                            setReplyingTo(
                                                                                null,
                                                                            );
                                                                            setReplyContent(
                                                                                '',
                                                                            );
                                                                        }}
                                                                    >
                                                                        Cancel
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        disabled={
                                                                            !session ||
                                                                            createComment.isPending ||
                                                                            isHtmlContentEmpty(
                                                                                replyContent,
                                                                            )
                                                                        }
                                                                        onClick={(
                                                                            e,
                                                                        ) => {
                                                                            preventEventPropagation(
                                                                                e as unknown as React.MouseEvent,
                                                                            );
                                                                            handleSubmitReply(
                                                                                r.id,
                                                                            );
                                                                        }}
                                                                    >
                                                                        {createComment.isPending
                                                                            ? 'Posting…'
                                                                            : 'Post Reply'}
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Sub-replies (2nd level) */}
                                                        {previewSubReplies.length >
                                                            0 &&
                                                            expandedComments.has(
                                                                r.id,
                                                            ) && (
                                                                <div className="mt-2 space-y-2 border-l pl-2">
                                                                    {previewSubReplies.map(
                                                                        (
                                                                            subReply,
                                                                        ) => {
                                                                            const deeperReplies: any[] =
                                                                                Array.isArray(
                                                                                    subReply.replies,
                                                                                )
                                                                                    ? subReply.replies
                                                                                    : [];
                                                                            const previewDeeperReplies =
                                                                                deeperReplies.slice(
                                                                                    0,
                                                                                    1,
                                                                                );

                                                                            return (
                                                                                <div
                                                                                    key={
                                                                                        subReply.id
                                                                                    }
                                                                                    className="text-sm"
                                                                                >
                                                                                    <div className="text-muted-foreground mb-0.5 flex items-center gap-2 text-xs">
                                                                                        <Avatar className="h-4 w-4">
                                                                                            <AvatarImage
                                                                                                src={
                                                                                                    subReply
                                                                                                        .author
                                                                                                        ?.avatar ||
                                                                                                    undefined
                                                                                                }
                                                                                            />
                                                                                            <AvatarFallback className="text-[8px]">
                                                                                                {subReply
                                                                                                    .author
                                                                                                    ?.name
                                                                                                    ? subReply.author.name
                                                                                                          .substring(
                                                                                                              0,
                                                                                                              2,
                                                                                                          )
                                                                                                          .toUpperCase()
                                                                                                    : 'U'}
                                                                                            </AvatarFallback>
                                                                                        </Avatar>
                                                                                        <span className="text-foreground font-medium">
                                                                                            {subReply
                                                                                                .author
                                                                                                ?.name ||
                                                                                                'Unknown'}
                                                                                        </span>
                                                                                        <span>
                                                                                            •
                                                                                        </span>
                                                                                        <span>
                                                                                            {new Date(
                                                                                                subReply.createdAt,
                                                                                            ).toLocaleString()}
                                                                                        </span>
                                                                                    </div>
                                                                                    <SafeHtml
                                                                                        html={
                                                                                            subReply.content
                                                                                        }
                                                                                        className="prose prose-sm dark:prose-invert max-w-none"
                                                                                    />
                                                                                    <div className="mt-1 flex items-center gap-2">
                                                                                        <button
                                                                                            className="text-muted-foreground hover:text-foreground text-xs underline"
                                                                                            onClick={(
                                                                                                e,
                                                                                            ) => {
                                                                                                preventEventPropagation(
                                                                                                    e as unknown as React.MouseEvent,
                                                                                                );
                                                                                                setReplyingTo(
                                                                                                    subReply.id,
                                                                                                );
                                                                                            }}
                                                                                            disabled={
                                                                                                !session
                                                                                            }
                                                                                        >
                                                                                            Reply
                                                                                        </button>
                                                                                        {deeperReplies.length >
                                                                                            0 && (
                                                                                            <button
                                                                                                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
                                                                                                onClick={(
                                                                                                    e,
                                                                                                ) => {
                                                                                                    preventEventPropagation(
                                                                                                        e as unknown as React.MouseEvent,
                                                                                                    );
                                                                                                    toggleCommentExpansion(
                                                                                                        subReply.id,
                                                                                                    );
                                                                                                }}
                                                                                            >
                                                                                                {expandedComments.has(
                                                                                                    subReply.id,
                                                                                                ) ? (
                                                                                                    <Minus className="h-3 w-3" />
                                                                                                ) : (
                                                                                                    <Plus className="h-3 w-3" />
                                                                                                )}
                                                                                                {expandedComments.has(
                                                                                                    subReply.id,
                                                                                                )
                                                                                                    ? 'Hide'
                                                                                                    : 'Show'}{' '}
                                                                                                replies
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                    {/* Show "+" indicator when deeper replies are collapsed */}
                                                                                    {deeperReplies.length >
                                                                                        0 &&
                                                                                        !expandedComments.has(
                                                                                            subReply.id,
                                                                                        ) && (
                                                                                            <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                                                                                                <Plus className="h-3 w-3" />

                                                                                                +
                                                                                                {
                                                                                                    deeperReplies.length
                                                                                                }{' '}
                                                                                                replies
                                                                                            </div>
                                                                                        )}
                                                                                    {replyingTo ===
                                                                                        subReply.id && (
                                                                                        <div
                                                                                            className="mt-2 space-y-2"
                                                                                            onClick={
                                                                                                preventEventPropagation
                                                                                            }
                                                                                        >
                                                                                            <TipTapEditor
                                                                                                content={
                                                                                                    replyContent
                                                                                                }
                                                                                                onChange={
                                                                                                    setReplyContent
                                                                                                }
                                                                                                placeholder={
                                                                                                    session
                                                                                                        ? 'Write your reply…'
                                                                                                        : 'Sign in to reply'
                                                                                                }
                                                                                                variant="compact"
                                                                                                postId={
                                                                                                    post.id
                                                                                                }
                                                                                            />
                                                                                            <div className="flex justify-end gap-2">
                                                                                                <Button
                                                                                                    variant="outline"
                                                                                                    size="sm"
                                                                                                    onClick={(
                                                                                                        e,
                                                                                                    ) => {
                                                                                                        preventEventPropagation(
                                                                                                            e as unknown as React.MouseEvent,
                                                                                                        );
                                                                                                        setReplyingTo(
                                                                                                            null,
                                                                                                        );
                                                                                                        setReplyContent(
                                                                                                            '',
                                                                                                        );
                                                                                                    }}
                                                                                                >
                                                                                                    Cancel
                                                                                                </Button>
                                                                                                <Button
                                                                                                    size="sm"
                                                                                                    disabled={
                                                                                                        !session ||
                                                                                                        createComment.isPending ||
                                                                                                        isHtmlContentEmpty(
                                                                                                            replyContent,
                                                                                                        )
                                                                                                    }
                                                                                                    onClick={(
                                                                                                        e,
                                                                                                    ) => {
                                                                                                        preventEventPropagation(
                                                                                                            e as unknown as React.MouseEvent,
                                                                                                        );
                                                                                                        handleSubmitReply(
                                                                                                            subReply.id,
                                                                                                        );
                                                                                                    }}
                                                                                                >
                                                                                                    {createComment.isPending
                                                                                                        ? 'Posting…'
                                                                                                        : 'Post Reply'}
                                                                                                </Button>
                                                                                            </div>
                                                                                        </div>
                                                                                    )}

                                                                                    {/* Deeper replies (3rd level) */}
                                                                                    {previewDeeperReplies.length >
                                                                                        0 &&
                                                                                        expandedComments.has(
                                                                                            subReply.id,
                                                                                        ) && (
                                                                                            <div className="mt-2 space-y-2 border-l pl-2">
                                                                                                {previewDeeperReplies.map(
                                                                                                    (
                                                                                                        deeperReply,
                                                                                                    ) => (
                                                                                                        <div
                                                                                                            key={
                                                                                                                deeperReply.id
                                                                                                            }
                                                                                                            className="text-sm"
                                                                                                        >
                                                                                                            <div className="text-muted-foreground mb-0.5 flex items-center gap-2 text-xs">
                                                                                                                <Avatar className="h-4 w-4">
                                                                                                                    <AvatarImage
                                                                                                                        src={
                                                                                                                            deeperReply
                                                                                                                                .author
                                                                                                                                ?.avatar ||
                                                                                                                            undefined
                                                                                                                        }
                                                                                                                    />
                                                                                                                    <AvatarFallback className="text-[8px]">
                                                                                                                        {deeperReply
                                                                                                                            .author
                                                                                                                            ?.name
                                                                                                                            ? deeperReply.author.name
                                                                                                                                  .substring(
                                                                                                                                      0,
                                                                                                                                      2,
                                                                                                                                  )
                                                                                                                                  .toUpperCase()
                                                                                                                            : 'U'}
                                                                                                                    </AvatarFallback>
                                                                                                                </Avatar>
                                                                                                                <span className="text-foreground font-medium">
                                                                                                                    {deeperReply
                                                                                                                        .author
                                                                                                                        ?.name ||
                                                                                                                        'Unknown'}
                                                                                                                </span>
                                                                                                                <span>
                                                                                                                    •
                                                                                                                </span>
                                                                                                                <span>
                                                                                                                    {new Date(
                                                                                                                        deeperReply.createdAt,
                                                                                                                    ).toLocaleString()}
                                                                                                                </span>
                                                                                                            </div>
                                                                                                            <SafeHtml
                                                                                                                html={
                                                                                                                    deeperReply.content
                                                                                                                }
                                                                                                                className="prose prose-sm dark:prose-invert max-w-none"
                                                                                                            />
                                                                                                            <div className="mt-1">
                                                                                                                <button
                                                                                                                    className="text-muted-foreground hover:text-foreground text-xs underline"
                                                                                                                    onClick={(
                                                                                                                        e,
                                                                                                                    ) => {
                                                                                                                        preventEventPropagation(
                                                                                                                            e as unknown as React.MouseEvent,
                                                                                                                        );
                                                                                                                        setReplyingTo(
                                                                                                                            deeperReply.id,
                                                                                                                        );
                                                                                                                    }}
                                                                                                                    disabled={
                                                                                                                        !session
                                                                                                                    }
                                                                                                                >
                                                                                                                    Reply
                                                                                                                </button>
                                                                                                                {replyingTo ===
                                                                                                                    deeperReply.id && (
                                                                                                                    <div
                                                                                                                        className="mt-2 space-y-2"
                                                                                                                        onClick={
                                                                                                                            preventEventPropagation
                                                                                                                        }
                                                                                                                    >
                                                                                                                        <TipTapEditor
                                                                                                                            content={
                                                                                                                                replyContent
                                                                                                                            }
                                                                                                                            onChange={
                                                                                                                                setReplyContent
                                                                                                                            }
                                                                                                                            placeholder={
                                                                                                                                session
                                                                                                                                    ? 'Write your reply…'
                                                                                                                                    : 'Sign in to reply'
                                                                                                                            }
                                                                                                                            variant="compact"
                                                                                                                            postId={
                                                                                                                                post.id
                                                                                                                            }
                                                                                                                        />
                                                                                                                        <div className="flex justify-end gap-2">
                                                                                                                            <Button
                                                                                                                                variant="outline"
                                                                                                                                size="sm"
                                                                                                                                onClick={(
                                                                                                                                    e,
                                                                                                                                ) => {
                                                                                                                                    preventEventPropagation(
                                                                                                                                        e as unknown as React.MouseEvent,
                                                                                                                                    );
                                                                                                                                    setReplyingTo(
                                                                                                                                        null,
                                                                                                                                    );
                                                                                                                                    setReplyContent(
                                                                                                                                        '',
                                                                                                                                    );
                                                                                                                                }}
                                                                                                                            >
                                                                                                                                Cancel
                                                                                                                            </Button>
                                                                                                                            <Button
                                                                                                                                size="sm"
                                                                                                                                disabled={
                                                                                                                                    !session ||
                                                                                                                                    createComment.isPending ||
                                                                                                                                    isHtmlContentEmpty(
                                                                                                                                        replyContent,
                                                                                                                                    )
                                                                                                                                }
                                                                                                                                onClick={(
                                                                                                                                    e,
                                                                                                                                ) => {
                                                                                                                                    preventEventPropagation(
                                                                                                                                        e as unknown as React.MouseEvent,
                                                                                                                                    );
                                                                                                                                    handleSubmitReply(
                                                                                                                                        deeperReply.id,
                                                                                                                                    );
                                                                                                                                }}
                                                                                                                            >
                                                                                                                                {createComment.isPending
                                                                                                                                    ? 'Posting…'
                                                                                                                                    : 'Post Reply'}
                                                                                                                            </Button>
                                                                                                                        </div>
                                                                                                                    </div>
                                                                                                                )}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    ),
                                                                                                )}
                                                                                                {deeperReplies.length >
                                                                                                    previewDeeperReplies.length && (
                                                                                                    <div className="text-muted-foreground flex items-center gap-1 text-xs">
                                                                                                        <Plus className="h-3 w-3" />

                                                                                                        +
                                                                                                        {deeperReplies.length -
                                                                                                            previewDeeperReplies.length}{' '}
                                                                                                        more
                                                                                                        replies
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        )}
                                                                                </div>
                                                                            );
                                                                        },
                                                                    )}
                                                                    {subReplies.length >
                                                                        previewSubReplies.length && (
                                                                        <div className="text-muted-foreground flex items-center gap-1 text-xs">
                                                                            <Plus className="h-3 w-3" />
                                                                            +
                                                                            {subReplies.length -
                                                                                previewSubReplies.length}{' '}
                                                                            more
                                                                            replies
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                    </div>
                                                );
                                            })}
                                            {replies.length >
                                                previewReplies.length && (
                                                <div className="text-muted-foreground flex items-center gap-1 text-xs">
                                                    <Plus className="h-3 w-3" />
                                                    +
                                                    {replies.length -
                                                        previewReplies.length}{' '}
                                                    more replies
                                                </div>
                                            )}
                                        </div>
                                    )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* View all */}
            <div className="mt-3 flex justify-end">
                <button
                    className="text-xs underline"
                    onClick={(e) => {
                        preventEventPropagation(
                            e as unknown as React.MouseEvent,
                        );
                        router.push(viewAllHref);
                    }}
                >
                    View all comments
                </button>
            </div>
        </div>
    );
}

// Utility function to prevent event propagation
const preventEventPropagation = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
};

export default function SavedPage() {
    const sessionData = useSession();
    const session = sessionData.data;
    const router = useRouter();

    // Use the custom hook for cross-page synchronization
    useSavedPostsSync();

    const [offset, setOffset] = useState(0);
    const [posts, setPosts] = useState<SavedPost[]>([]);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [expandedCommentPostIds, setExpandedCommentPostIds] = useState<
        Set<number>
    >(new Set());
    const utils = trpc.useUtils();
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Handle like changes from LikeButton
    const handleLikeChange = useCallback(
        (postId: number, isLiked: boolean, likeCount: number) => {
            setPosts((prev) =>
                prev.map((post) =>
                    post.id === postId ? { ...post, isLiked, likeCount } : post,
                ),
            );
        },
        [],
    );

    const savedQuery = trpc.community.getSavedPosts.useQuery(
        {
            limit: 10,
            offset: 0,
            sort: 'latest',
        },
        {
            // Enable background refetching without showing loading states
            refetchOnWindowFocus: true,
            refetchOnMount: true,
            staleTime: 0, // Always consider data stale to allow background updates
        },
    );

    useEffect(() => {
        if (savedQuery.data) {
            // Only update if this is the initial load or if the data has actually changed
            const newPosts = savedQuery.data.posts.map((p) => {
                const existing = posts.find((x) => x.id === p.id);
                return {
                    ...p,
                    isSaved: true,
                    // Preserve reaction state if already known to avoid flicker
                    likeCount: existing?.likeCount ?? 0,
                    isLiked: existing?.isLiked ?? false,
                };
            });

            // Check if posts have actually changed to avoid unnecessary updates
            const hasChanged =
                posts.length !== newPosts.length ||
                posts.some((post, index) => post.id !== newPosts[index]?.id);

            if (hasChanged || posts.length === 0) {
                setPosts(newPosts as any[]);
                setOffset(savedQuery.data.posts.length);
                setHasNextPage(savedQuery.data.hasNextPage);
                setTotalCount(savedQuery.data.totalCount);
            }

            // Immediately refresh like counts and reactions so likes show without manual refresh
            if (savedQuery.data.posts.length > 0) {
                utils.community.getPostLikeCounts.refetch();
                if (session) {
                    utils.community.getUserReactions.refetch();
                    utils.community.getUserSavedMap.refetch();
                }
            }
        }
    }, [savedQuery.data]);

    // Refetch reactions and counts on window focus or when tab becomes visible
    useEffect(() => {
        const refetchReactions = () => {
            if (posts.length === 0) return;
            utils.community.getPostLikeCounts.refetch();
            if (session) {
                utils.community.getUserReactions.refetch();
                utils.community.getUserSavedMap.refetch();
            }
        };

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                refetchReactions();
            }
        };

        window.addEventListener('focus', refetchReactions);
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            window.removeEventListener('focus', refetchReactions);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [
        posts.length,
        session,
        utils.community.getPostLikeCounts,
        utils.community.getUserReactions,
        utils.community.getUserSavedMap,
    ]);

    const postIds = useMemo(() => posts.map((p) => p.id), [posts]);

    const likeCountsQuery = trpc.community.getPostLikeCounts.useQuery(
        { postIds },
        {
            enabled: postIds.length > 0,
            staleTime: 0,
            refetchOnWindowFocus: true,
            // Remove polling to prevent race conditions with immediate refetches
            // refetchInterval: 5 * 1000,
            // refetchIntervalInBackground: true,
        },
    );
    const userReactionsQuery = trpc.community.getUserReactions.useQuery(
        { postIds },
        {
            enabled: postIds.length > 0 && !!session,
            staleTime: 0,
            refetchOnWindowFocus: true,
            // Remove polling to prevent race conditions with immediate refetches
            // refetchInterval: 5 * 1000,
            // refetchIntervalInBackground: true,
        },
    );
    const userSavedMapQuery = trpc.community.getUserSavedMap.useQuery(
        { postIds },
        {
            enabled: postIds.length > 0 && !!session,
            refetchOnWindowFocus: true,
        },
    );

    useEffect(() => {
        // Only update fields that are present in the query responses to avoid flicker
        setPosts((prev) =>
            prev.map((post) => {
                const next = { ...post } as any;
                if (likeCountsQuery.data && post.id in likeCountsQuery.data) {
                    next.likeCount = likeCountsQuery.data[post.id] ?? 0;
                }
                if (
                    userReactionsQuery.data &&
                    post.id in userReactionsQuery.data
                ) {
                    next.isLiked = userReactionsQuery.data[post.id] ?? false;
                }
                if (
                    userSavedMapQuery.data &&
                    post.id in userSavedMapQuery.data
                ) {
                    next.isSaved = userSavedMapQuery.data[post.id] ?? true;
                }
                return next;
            }),
        );
    }, [likeCountsQuery.data, userReactionsQuery.data, userSavedMapQuery.data]);

    const savePostMutation = trpc.community.savePost.useMutation({
        onSuccess: (_data, variables) => {
            setPosts((prev) =>
                prev.map((p) =>
                    p.id === variables.postId ? { ...p, isSaved: true } : p,
                ),
            );
            // Invalidate to ensure consistency across pages
            utils.community.getSavedPosts.invalidate();
            toast.success('Saved');
        },
        onError: () => toast.error('Failed to save'),
    });
    const unsavePostMutation = trpc.community.unsavePost.useMutation({
        onSuccess: (_data, variables) => {
            setPosts((prev) => prev.filter((p) => p.id !== variables.postId));
            // Invalidate to ensure consistency across pages
            utils.community.getSavedPosts.invalidate();
            toast.success('Removed from saved');
        },
        onError: () => toast.error('Failed to unsave'),
    });

    const fetchNextPage = useCallback(async () => {
        if (!hasNextPage || isFetchingNextPage) return;
        setIsFetchingNextPage(true);
        try {
            const data = await utils.community.getSavedPosts.fetch({
                limit: 10,
                offset,
                sort: 'latest',
            });
            const withSaved = data.posts.map((p) => ({ ...p, isSaved: true }));
            setPosts((prev) => [...prev, ...withSaved]);
            setOffset((prev) => prev + data.posts.length);
            setHasNextPage(data.hasNextPage);
            setTotalCount(data.totalCount);
        } finally {
            setIsFetchingNextPage(false);
        }
    }, [
        hasNextPage,
        isFetchingNextPage,
        offset,
        utils.community.getSavedPosts,
    ]);

    // Setup intersection observer for infinite scrolling (like feed)
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (
                    entries[0]?.isIntersecting &&
                    hasNextPage &&
                    !isFetchingNextPage
                ) {
                    fetchNextPage();
                }
            },
            {
                rootMargin: '0px 0px 300px 0px',
                threshold: 0.1,
            },
        );
        observerRef.current = observer;
        return () => {
            if (observerRef.current) observerRef.current.disconnect();
        };
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    // Observe/unobserve the sentinel element
    useEffect(() => {
        const currentObserver = observerRef.current;
        const currentLoadMoreRef = loadMoreRef.current;
        if (currentObserver && currentLoadMoreRef) {
            currentObserver.observe(currentLoadMoreRef);
            return () => {
                if (currentLoadMoreRef)
                    currentObserver.unobserve(currentLoadMoreRef);
            };
        }
    }, [posts]);

    function formatRelativeTime(dateInput: string | number | Date): string {
        const date = new Date(dateInput);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const seconds = Math.floor(diffMs / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60)
            return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
        const days = Math.floor(hours / 24);
        if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
        const months = Math.floor(days / 30);
        if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
        const years = Math.floor(months / 12);
        return `${years} year${years === 1 ? '' : 's'} ago`;
    }

    return (
        <div className="py-4">
            <div className="mb-6 flex items-center gap-2">
                <Bookmark className="h-5 w-5" />
                <h1 className="text-2xl font-bold">Saved Posts</h1>
            </div>

            {savedQuery.isLoading ? (
                <div className="py-8 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </div>
            ) : posts.length === 0 ? (
                <div className="py-8 text-center">
                    <p className="text-muted-foreground mb-4">
                        You haven’t saved any posts yet.
                    </p>
                    <Button asChild>
                        <Link href="/posts">Browse posts</Link>
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    {posts.map((post) => (
                        <Link
                            key={post.id}
                            href={
                                post.community
                                    ? `/communities/${post.community.slug}/posts/${post.id}`
                                    : `/posts/${post.id}`
                            }
                            className="block"
                            style={{ textDecoration: 'none' }}
                        >
                            <Card className="relative gap-2 overflow-hidden p-0 transition-shadow hover:shadow-md">
                                <div className="border-b px-4 py-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            {post.community ? (
                                                <Avatar className="mr-2 h-6 w-6">
                                                    <AvatarImage
                                                        src={
                                                            post.community
                                                                .avatar ||
                                                            undefined
                                                        }
                                                    />
                                                    <AvatarFallback className="text-[10px]">
                                                        {post.community.name
                                                            ?.substring(0, 2)
                                                            .toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                            ) : (
                                                <Avatar className="mr-2 h-6 w-6">
                                                    <AvatarFallback className="text-[10px]">
                                                        OR
                                                    </AvatarFallback>
                                                </Avatar>
                                            )}
                                            <div className="flex flex-col leading-tight">
                                                <span className="text-sm font-medium">
                                                    {post.author?.name ||
                                                        'Unknown'}
                                                </span>
                                                <span className="text-muted-foreground text-xs">
                                                    {post.community?.name ||
                                                        post.author
                                                            ?.organization
                                                            ?.name ||
                                                        'Organization'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground text-xs">
                                                {formatRelativeTime(
                                                    post.createdAt,
                                                )}
                                            </span>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-full"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                        }}
                                                    >
                                                        <Ellipsis className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent
                                                    align="end"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                    }}
                                                >
                                                    {post.author?.id && (
                                                        <DropdownMenuItem
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                router.push(
                                                                    `/userProfile-details/${post.author!.id}`,
                                                                );
                                                            }}
                                                        >
                                                            Author details
                                                        </DropdownMenuItem>
                                                    )}
                                                    {post.community?.slug && (
                                                        <DropdownMenuItem
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                router.push(
                                                                    `/communities/${post.community!.slug}`,
                                                                );
                                                            }}
                                                        >
                                                            View community
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            if (!session)
                                                                return;
                                                            if (post.isSaved) {
                                                                unsavePostMutation.mutate(
                                                                    {
                                                                        postId: post.id,
                                                                    },
                                                                );
                                                            } else {
                                                                savePostMutation.mutate(
                                                                    {
                                                                        postId: post.id,
                                                                    },
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        {post.isSaved
                                                            ? 'Unsave'
                                                            : 'Save'}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </div>

                                <div className="px-4 py-0">
                                    <h3 className="mt-0 mb-2 text-base font-medium">
                                        {post.isDeleted
                                            ? '[Deleted]'
                                            : post.title}
                                    </h3>
                                    {post.isDeleted ? (
                                        <div className="space-y-1">
                                            <span className="text-muted-foreground text-sm italic">
                                                [Content deleted]
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="text-muted-foreground text-sm">
                                                {(post.attachments &&
                                                    post.attachments.length >
                                                        0) ||
                                                post.content.includes(
                                                    '<img',
                                                ) ? (
                                                    <SafeHtmlWithoutImages
                                                        html={post.content}
                                                        className="line-clamp-2 overflow-hidden leading-5 text-ellipsis"
                                                    />
                                                ) : (
                                                    <SafeHtml
                                                        html={post.content}
                                                        className="line-clamp-2 overflow-hidden leading-5 text-ellipsis"
                                                    />
                                                )}
                                            </div>

                                            {post.attachments &&
                                            post.attachments.length > 0 ? (
                                                <MixedMediaCarousel
                                                    media={post.attachments}
                                                    className="w-full"
                                                />
                                            ) : post.content.includes(
                                                  '<img',
                                              ) ? (
                                                <HtmlImageCarousel
                                                    htmlContent={post.content}
                                                    className="w-full"
                                                />
                                            ) : null}
                                        </div>
                                    )}

                                    <div className="mt-2 flex items-center justify-between">
                                        <span className="text-muted-foreground text-xs">
                                            {(() => {
                                                const likeCountNum =
                                                    post.likeCount ?? 0;
                                                const isLiked =
                                                    post.isLiked ?? false;
                                                return likeCountNum > 0
                                                    ? isLiked
                                                        ? likeCountNum === 1
                                                            ? 'You liked this'
                                                            : `You and ${likeCountNum - 1} ${likeCountNum - 1 === 1 ? 'other' : 'others'} liked this`
                                                        : `${likeCountNum} ${likeCountNum === 1 ? 'person' : 'people'} liked this`
                                                    : '';
                                            })()}
                                        </span>
                                        <span className="text-muted-foreground text-xs">
                                            {Array.isArray(post.comments)
                                                ? post.comments.length
                                                : 0}{' '}
                                            Comments
                                        </span>
                                    </div>

                                    <Separator className="my-1" />
                                    <div className="mb-1 grid grid-cols-4">
                                        <div
                                            className="col-span-1 flex items-center justify-center gap-0 md:gap-2"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                            }}
                                        >
                                            <LikeButton
                                                key={`${post.id}-${post.isLiked}-${post.likeCount}`}
                                                postId={post.id}
                                                initialLikeCount={
                                                    post.likeCount ?? 0
                                                }
                                                initialIsLiked={
                                                    post.isLiked ?? false
                                                }
                                                size="sm"
                                                variant="ghost"
                                                disabled={!session}
                                                showCount={false}
                                                onLikeChange={handleLikeChange}
                                            />
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="col-span-1 justify-center"
                                            aria-expanded={expandedCommentPostIds.has(
                                                post.id,
                                            )}
                                            onClick={(e) => {
                                                preventEventPropagation(e);
                                                setExpandedCommentPostIds(
                                                    (prev) => {
                                                        const next = new Set(
                                                            prev,
                                                        );
                                                        if (next.has(post.id)) {
                                                            next.delete(
                                                                post.id,
                                                            );
                                                        } else {
                                                            next.add(post.id);
                                                        }
                                                        return next;
                                                    },
                                                );
                                            }}
                                        >
                                            <MessageSquare className="h-4 w-4 md:mr-2" />
                                            <span className="hidden md:inline">
                                                Comment
                                            </span>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="col-span-1 justify-center"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (!session) return;
                                                if (post.isSaved) {
                                                    unsavePostMutation.mutate({
                                                        postId: post.id,
                                                    });
                                                } else {
                                                    savePostMutation.mutate({
                                                        postId: post.id,
                                                    });
                                                }
                                            }}
                                        >
                                            <Bookmark
                                                className={`h-4 w-4 md:mr-2 ${post.isSaved ? 'fill-current' : ''}`}
                                            />
                                            <span className="hidden md:inline">
                                                {post.isSaved
                                                    ? 'Saved'
                                                    : 'Save'}
                                            </span>
                                        </Button>
                                        <div
                                            className="col-span-1 flex items-center justify-center"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                            }}
                                        >
                                            <ShareButton
                                                title={post.title}
                                                text={`Check out this post: ${post.title}`}
                                                url={`${typeof window !== 'undefined' ? window.location.origin : ''}${
                                                    post.community
                                                        ? `/communities/${post.community.slug}/posts/${post.id}`
                                                        : `/posts/${post.id}`
                                                }`}
                                                variant="ghost"
                                                size="sm"
                                            />
                                        </div>
                                        {/* Inline comments preview */}
                                        {expandedCommentPostIds.has(
                                            post.id,
                                        ) && (
                                            <div className="col-span-4 px-2 pt-1 pb-2">
                                                <InlineCommentsPreview
                                                    post={post}
                                                    session={session}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        </Link>
                    ))}

                    <div ref={loadMoreRef} className="py-4 text-center">
                        {isFetchingNextPage ? (
                            <div className="flex items-center justify-center space-x-2">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span className="text-muted-foreground text-sm">
                                    Loading more posts...
                                </span>
                            </div>
                        ) : hasNextPage ? (
                            <div className="flex flex-col items-center">
                                <span className="text-muted-foreground text-sm">
                                    Showing {posts.length} of {totalCount} posts
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2"
                                    onClick={() => fetchNextPage()}
                                >
                                    <ChevronDown className="mr-1 h-4 w-4" />{' '}
                                    Load more
                                </Button>
                            </div>
                        ) : (
                            <span className="text-muted-foreground text-sm"></span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
