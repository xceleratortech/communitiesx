'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/providers/trpc-provider';
import { Button } from '@/components/ui/button';
import { SafeHtml } from '@/lib/sanitize';
import TipTapEditor from '@/components/TipTapEditor';
import { isHtmlContentEmpty } from '@/lib/utils';
import { Minus, Plus } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

type SessionLike = {
    user?: { id: string } | null;
} | null;

function preventEventPropagation(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
}

export default function InlineCommentsPreview({
    postId,
    communitySlug,
    session,
}: {
    postId: number;
    communitySlug?: string | null;
    session: SessionLike;
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
        { postId },
        { enabled: !!session },
    );

    const createComment = trpc.community.createComment.useMutation({
        onSuccess: () => {
            setCommentContent('');
            setReplyingTo(null);
            setReplyContent('');
            utils.community.getPost.invalidate({ postId });
        },
    });

    const handleSubmit = async () => {
        if (!session) return;
        if (isHtmlContentEmpty(commentContent)) return;
        await createComment.mutate({
            postId,
            content: commentContent,
            parentId: replyingTo ?? undefined,
        });
    };

    const handleSubmitReply = async (parentId: number) => {
        if (!session) return;
        if (isHtmlContentEmpty(replyContent)) return;
        await createComment.mutate({
            postId,
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

    const viewAllHref = communitySlug
        ? `/communities/${communitySlug}/posts/${postId}#comments`
        : `/posts/${postId}#comments`;

    const commentsList = (fullPost?.comments as any[]) || [];
    const rootComments = commentsList.filter((c) => !c.parentId);
    const previewRoots = rootComments.slice(0, 2);

    return (
        <div className="bg-muted/20 rounded-md border p-2">
            <div className="space-y-2" onClick={preventEventPropagation}>
                <TipTapEditor
                    content={commentContent}
                    onChange={setCommentContent}
                    placeholder={
                        session ? 'Add a comment' : 'Sign in to comment'
                    }
                    variant="compact"
                    postId={postId}
                />
                <div className="flex justify-end gap-2">
                    <Button
                        size="sm"
                        disabled={
                            !session ||
                            createComment.isPending ||
                            isHtmlContentEmpty(commentContent)
                        }
                        onClick={(e) => {
                            preventEventPropagation(
                                e as unknown as React.MouseEvent,
                            );
                            handleSubmit();
                        }}
                    >
                        {createComment.isPending
                            ? 'Posting...'
                            : 'Post Comment'}
                    </Button>
                </div>
            </div>

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
                                {previewReplies.length > 0 &&
                                    !expandedComments.has(c.id) && (
                                        <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                                            <Plus className="h-3 w-3" />+
                                            {previewReplies.length} replies
                                        </div>
                                    )}
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
                                            postId={postId}
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
                                                                        postId
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
                                                                                                    postId
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
                                                                                                                                postId
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
