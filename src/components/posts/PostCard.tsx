'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { HtmlImageCarousel } from '@/components/ui/html-image-carousel';
import { HtmlVideoCarousel } from '@/components/ui/html-video-carousel';
import { MixedMediaCarousel } from '@/components/ui/mixed-media-carousel';
import { SafeHtml } from '@/lib/sanitize';
import { SafeHtmlWithoutImages } from '@/components/ui/safe-html-without-images';
import InlineCommentsPreview from '@/components/posts/InlineCommentsPreview';
import PostHeader from '@/components/posts/PostHeader';
import PostActionBar from '@/components/posts/PostActionBar';
import type { PostDisplay } from '@/app/posts/page';
import { PollDisplay } from '@/components/polls';
import { trpc } from '@/providers/trpc-provider';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { ChevronDown, NotebookPen } from 'lucide-react';
import { Button } from '../ui/button';
import { ShareButton } from '@/components/ui/share-button';
import TipTapEditor from '@/components/TipTapEditor';
import { isHtmlContentEmpty } from '@/lib/utils';
import { AnswerInline } from '@/components/qna/AnswerInline';
import { qaAnswers, users } from '@/server/db/schema';

type SessionLike = { user?: { id: string } | null } | null;

type AnswerWithAuthor = typeof qaAnswers.$inferSelect & {
    author: typeof users.$inferSelect | null;
};

export default function PostCard({
    post,
    session,
    canEdit,
    canDelete,
    canInteract,
    onEdit,
    onDelete,
    onAuthorClick,
    onCommunityClick,
    isCommentsExpanded,
    onToggleComments,
    onToggleSave,
    shareUrl,
    formatRelativeTime,
    joiningCommunityId,
    isJoinPending,
    onJoinCommunity,
    onLikeChange,
}: {
    post: PostDisplay;
    session: SessionLike;
    canEdit: boolean;
    canDelete: boolean;
    canInteract: boolean;
    onEdit: () => void;
    onDelete: (e: React.MouseEvent) => void;
    onAuthorClick?: () => void;
    onCommunityClick?: () => void;
    isCommentsExpanded: boolean;
    onToggleComments: () => void;
    onToggleSave: () => void;
    shareUrl: string;
    formatRelativeTime: (date: Date | string) => string;
    joiningCommunityId: number | null;
    isJoinPending: boolean;
    onJoinCommunity?: (communityId: number) => void;
    onLikeChange?: (
        postId: number,
        isLiked: boolean,
        likeCount: number,
    ) => void;
}) {
    const utils = trpc.useUtils();
    const router = useRouter();
    const [ansOffset, setAnsOffset] = React.useState(0);
    const [answers, setAnswers] = React.useState<AnswerWithAuthor[]>([]);
    const [hasNext, setHasNext] = React.useState(false);
    const [showEditor, setShowEditor] = React.useState(false);
    const [answerContent, setAnswerContent] = React.useState('');
    const [expandedAnswerComments, setExpandedAnswerComments] = React.useState<
        Set<number>
    >(new Set());
    const ansLimit = 2;
    const answersQuery = trpc.community.listAnswers.useQuery(
        { postId: post.id, limit: ansLimit, offset: ansOffset },
        { enabled: !!post.qa },
    );

    React.useEffect(() => {
        if (!answersQuery.data) return;
        if (ansOffset === 0) {
            setAnswers(answersQuery.data.answers);
        } else {
            setAnswers((prev) => {
                const seen = new Set(prev.map((a) => a.id));
                const next = answersQuery.data.answers.filter(
                    (a) => !seen.has(a.id),
                );
                return [...prev, ...next];
            });
        }
        setHasNext(!!answersQuery.data.hasNextPage);
    }, [answersQuery.data, ansOffset]);

    const submitAnswer = trpc.community.submitAnswer.useMutation({
        onSuccess: async () => {
            setShowEditor(false);
            setAnswerContent('');
            setAnsOffset(0);
            await answersQuery.refetch();
        },
    });

    // Helpful / Saved maps for visible answers
    const answerIds = React.useMemo(() => answers.map((a) => a.id), [answers]);
    const helpfulCountsQuery = trpc.community.getAnswerHelpfulCounts.useQuery(
        { answerIds },
        { enabled: answerIds.length > 0 },
    );
    const userHelpfulMapQuery =
        trpc.community.getUserHelpfulAnswersMap.useQuery(
            { answerIds },
            { enabled: !!session && answerIds.length > 0 },
        );
    const savedMapQuery = trpc.community.getUserSavedAnswersMap.useQuery(
        { answerIds },
        { enabled: !!session && answerIds.length > 0 },
    );

    const markHelpfulMutation = trpc.community.markHelpfulAnswer.useMutation({
        onSuccess: () => {
            helpfulCountsQuery.refetch();
            userHelpfulMapQuery.refetch();
        },
    });
    const unmarkHelpfulMutation =
        trpc.community.unmarkHelpfulAnswer.useMutation({
            onSuccess: () => {
                helpfulCountsQuery.refetch();
                userHelpfulMapQuery.refetch();
            },
        });
    const saveAnswerMutation = trpc.community.saveAnswer.useMutation({
        onSuccess: () => savedMapQuery.refetch(),
    });
    const unsaveAnswerMutation = trpc.community.unsaveAnswer.useMutation({
        onSuccess: () => savedMapQuery.refetch(),
    });

    // Answer comment mutations
    const createAnswerComment = trpc.community.createAnswerComment.useMutation({
        onSuccess: (_, variables) => {
            // Refetch comments for the specific answer
            utils.community.listAnswerComments.invalidate({
                answerId: variables.answerId,
            });
        },
    });

    // Get poll results if post has a poll
    const pollResultsQuery = trpc.community.getPollResults.useQuery(
        { pollId: post.poll?.id! },
        { enabled: !!post.poll?.id },
    );

    // Vote on poll mutation
    const votePollMutation = trpc.community.votePoll.useMutation({
        onSuccess: () => {
            // Refetch poll results after voting
            pollResultsQuery.refetch();
        },
    });

    const handlePollVote = (optionIds: number[]) => {
        if (post.poll?.id) {
            votePollMutation.mutate({
                pollId: post.poll.id,
                optionIds,
            });
        } else {
            console.log('No poll ID found');
        }
    };

    const handleJoinCommunity = () => {
        if (post.community?.id && onJoinCommunity) {
            onJoinCommunity(post.community.id);
        }
    };

    return (
        <Link
            href={
                post.community
                    ? `/communities/${post.community.slug}/posts/${post.id}`
                    : `/posts/${post.id}`
            }
            className="block"
            style={{ textDecoration: 'none' }}
        >
            <Card className="relative gap-2 overflow-hidden p-0 transition-shadow hover:shadow-md">
                {post.source?.reason === 'Based on your interests' && (
                    <div className="text-muted-foreground border-b px-4 pt-1 pb-1 text-[11px]">
                        Based on your interests
                    </div>
                )}

                <PostHeader
                    post={post}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onAuthorClick={onAuthorClick}
                    onCommunityClick={onCommunityClick}
                    formatRelativeTime={formatRelativeTime}
                />

                <div className="px-4 py-0">
                    {/* Q&A chip */}
                    {post.qa && (
                        <div className="mb-1">
                            <Badge variant="secondary">Q&A</Badge>
                        </div>
                    )}
                    <h3 className="mt-0 mb-2 text-base font-medium">
                        {post.isDeleted ? '[Deleted]' : post.title}
                    </h3>

                    {post.isDeleted ? (
                        <div className="space-y-1">
                            <span className="text-muted-foreground text-sm italic">
                                [Content deleted]
                            </span>
                            <span className="text-muted-foreground block text-xs">
                                Removed on{' '}
                                {new Date(post.updatedAt).toLocaleString()}
                            </span>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="text-muted-foreground text-sm">
                                {(post.attachments &&
                                    post.attachments.length > 0) ||
                                post.content.includes('<img') ? (
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

                            {post.attachments && post.attachments.length > 0 ? (
                                <MixedMediaCarousel
                                    media={post.attachments}
                                    className="w-full"
                                />
                            ) : (
                                <>
                                    {/* Images from HTML content */}
                                    {post.content.includes('<img') && (
                                        <HtmlImageCarousel
                                            htmlContent={post.content}
                                            className="w-full"
                                        />
                                    )}
                                    {/* Videos from HTML content */}
                                    {post.content.includes('[VIDEO:') && (
                                        <HtmlVideoCarousel
                                            htmlContent={post.content}
                                            className="w-full"
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {post.tags && post.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {post.tags.slice(0, 3).map((tag) => (
                                <span
                                    key={tag.id}
                                    className="bg-secondary inline-flex items-center rounded-full px-2 py-1 text-xs font-medium"
                                    style={{
                                        backgroundColor: tag.color
                                            ? `${tag.color}20`
                                            : undefined,
                                        color: tag.color || undefined,
                                    }}
                                >
                                    {tag.name}
                                </span>
                            ))}
                            {post.tags.length > 3 && (
                                <span className="bg-secondary text-muted-foreground inline-flex items-center rounded-full px-2 py-1 text-xs font-medium">
                                    +{post.tags.length - 3} more
                                </span>
                            )}
                        </div>
                    )}

                    <div className="mt-2 flex items-center justify-between">
                        {post.source?.reason === 'Based on your interests' ? (
                            (post.likeCount ?? 0) > 0 ? (
                                <span className="text-muted-foreground text-xs">
                                    {post.likeCount ?? 0}{' '}
                                    {(post.likeCount ?? 0) === 1
                                        ? 'person'
                                        : 'people'}{' '}
                                    liked this
                                </span>
                            ) : (
                                <span className="text-muted-foreground text-xs" />
                            )
                        ) : (
                            (() => {
                                const likeCountNum = post.likeCount ?? 0;
                                const isLiked = post.isLiked ?? false;
                                return (
                                    <span className="text-muted-foreground text-xs">
                                        {likeCountNum > 0
                                            ? isLiked
                                                ? likeCountNum === 1
                                                    ? 'You liked this'
                                                    : `You and ${likeCountNum - 1} ${likeCountNum - 1 === 1 ? 'other' : 'others'} liked this`
                                                : `${likeCountNum} ${likeCountNum === 1 ? 'person' : 'people'} liked this`
                                            : ''}
                                    </span>
                                );
                            })()
                        )}
                    </div>

                    {/* Q&A summary row */}
                    {post.qa && (
                        <div
                            className="mt-2"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                        >
                            <div className="flex items-center justify-between rounded-md bg-gray-100 px-3 py-2 dark:bg-gray-800">
                                <span className="text-sm underline">
                                    {answersQuery.data?.reveal
                                        ? `${answersQuery.data?.totalCount ?? 0} Answers`
                                        : 'Answers are hidden until deadline'}
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        className="text-sm"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setShowEditor((v) => !v);
                                        }}
                                    >
                                        <NotebookPen className="size-4" />
                                        Answer
                                    </Button>
                                </div>
                            </div>

                            {/* Inline Answer editor */}
                            {showEditor && (
                                <div
                                    className="mt-2"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                >
                                    <TipTapEditor
                                        content={answerContent}
                                        onChange={setAnswerContent}
                                        placeholder="Write your answer..."
                                        variant="compact"
                                        postId={post.id}
                                        communityId={
                                            post.community?.id || undefined
                                        }
                                    />
                                    <div className="mt-2 flex justify-end">
                                        <Button
                                            size="sm"
                                            disabled={
                                                submitAnswer.isPending ||
                                                isHtmlContentEmpty(
                                                    answerContent,
                                                )
                                            }
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                submitAnswer.mutate({
                                                    postId: post.id,
                                                    content: answerContent,
                                                });
                                            }}
                                        >
                                            {submitAnswer.isPending
                                                ? 'Submitting...'
                                                : 'Submit Answer'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {answersQuery.data && answers.length > 0 && (
                                <div className="mt-2 space-y-2">
                                    {answers.map((a) => {
                                        const isHelpful =
                                            !!userHelpfulMapQuery.data?.[a.id];
                                        const helpfulCount =
                                            helpfulCountsQuery.data?.[a.id] ??
                                            0;
                                        const isSaved =
                                            !!savedMapQuery.data?.[a.id];
                                        const isCommentsExpanded =
                                            expandedAnswerComments.has(a.id);

                                        return (
                                            <AnswerInline
                                                key={a.id}
                                                answer={a}
                                                postId={post.id}
                                                postTitle={post.title}
                                                postCommunity={post.community}
                                                session={session}
                                                formatRelativeTime={
                                                    formatRelativeTime
                                                }
                                                isCommentsExpanded={
                                                    isCommentsExpanded
                                                }
                                                onToggleComments={() => {
                                                    setExpandedAnswerComments(
                                                        (prev) => {
                                                            const next =
                                                                new Set(prev);
                                                            if (
                                                                next.has(a.id)
                                                            ) {
                                                                next.delete(
                                                                    a.id,
                                                                );
                                                            } else {
                                                                next.add(a.id);
                                                            }
                                                            return next;
                                                        },
                                                    );
                                                }}
                                                isHelpful={isHelpful}
                                                helpfulCount={helpfulCount}
                                                isSaved={isSaved}
                                                onMarkHelpful={() => {
                                                    if (isHelpful) {
                                                        unmarkHelpfulMutation.mutate(
                                                            {
                                                                answerId: a.id,
                                                            },
                                                        );
                                                    } else {
                                                        markHelpfulMutation.mutate(
                                                            {
                                                                answerId: a.id,
                                                            },
                                                        );
                                                    }
                                                }}
                                                onSave={() => {
                                                    if (isSaved) {
                                                        unsaveAnswerMutation.mutate(
                                                            {
                                                                answerId: a.id,
                                                            },
                                                        );
                                                    } else {
                                                        saveAnswerMutation.mutate(
                                                            {
                                                                answerId: a.id,
                                                            },
                                                        );
                                                    }
                                                }}
                                                markHelpfulMutation={
                                                    markHelpfulMutation
                                                }
                                                unmarkHelpfulMutation={
                                                    unmarkHelpfulMutation
                                                }
                                                saveAnswerMutation={
                                                    saveAnswerMutation
                                                }
                                                unsaveAnswerMutation={
                                                    unsaveAnswerMutation
                                                }
                                                createAnswerComment={
                                                    createAnswerComment
                                                }
                                            />
                                        );
                                    })}
                                    {hasNext && (
                                        <div className="text-center">
                                            <button
                                                type="button"
                                                className="text-sm underline"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    const nextOffset =
                                                        ansOffset + ansLimit;
                                                    setAnsOffset(nextOffset);
                                                    utils.community.listAnswers.prefetch(
                                                        {
                                                            postId: post.id,
                                                            limit: ansLimit,
                                                            offset: nextOffset,
                                                        },
                                                    );
                                                }}
                                            >
                                                Load more answers
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Poll Display - Before PostActionBar */}
                    {post.poll && (
                        <div
                            className="mt-4"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                        >
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
                                results={pollResultsQuery.data?.results}
                                userVotes={pollResultsQuery.data?.userVotes}
                                canVote={
                                    pollResultsQuery.data?.canVote || false
                                }
                                hasUserVoted={
                                    pollResultsQuery.data?.hasUserVoted || false
                                }
                                totalVotes={
                                    pollResultsQuery.data?.totalVotes || 0
                                }
                                onVote={handlePollVote}
                                onJoinCommunity={handleJoinCommunity}
                                isVoting={votePollMutation.isPending}
                            />
                        </div>
                    )}

                    {/* Comments Count - After Poll Display */}
                    <div className="mt-2 flex items-center justify-between">
                        {post.source?.reason === 'Based on your interests' ? (
                            (post.likeCount ?? 0) > 0 ? (
                                (() => {
                                    const likeCountNum = post.likeCount ?? 0;
                                    return (
                                        <span className="text-muted-foreground text-xs">
                                            {likeCountNum === 1
                                                ? 'You liked this'
                                                : likeCountNum === 2
                                                  ? `You and ${likeCountNum - 1} ${likeCountNum - 1 === 1 ? 'other' : 'others'} liked this`
                                                  : `${likeCountNum} ${likeCountNum === 1 ? 'person' : 'people'} liked this`}
                                        </span>
                                    );
                                })()
                            ) : (
                                <span className="text-muted-foreground text-xs">
                                    {Array.isArray(post.comments)
                                        ? post.comments.length
                                        : 0}{' '}
                                    Comments
                                </span>
                            )
                        ) : (
                            (() => {
                                const likeCountNum = post.likeCount ?? 0;
                                return (
                                    <span className="text-muted-foreground text-xs">
                                        {likeCountNum > 0
                                            ? likeCountNum === 1
                                                ? '1 person liked this'
                                                : likeCountNum === 2
                                                  ? `You and ${likeCountNum - 1} ${likeCountNum - 1 === 1 ? 'other' : 'others'} liked this`
                                                  : `${likeCountNum} ${likeCountNum === 1 ? 'person' : 'people'} liked this`
                                            : ''}
                                    </span>
                                );
                            })()
                        )}
                        <span className="text-muted-foreground text-xs">
                            {Array.isArray(post.comments)
                                ? post.comments.length
                                : 0}{' '}
                            Comments
                        </span>
                    </div>

                    <PostActionBar
                        post={post}
                        canInteract={canInteract}
                        isCommentsExpanded={isCommentsExpanded}
                        onToggleComments={onToggleComments}
                        onToggleSave={onToggleSave}
                        shareUrl={shareUrl}
                        sessionExists={!!session}
                        onLikeChange={onLikeChange}
                    />

                    {isCommentsExpanded && (
                        <div className="col-span-4 px-2 pt-1 pb-2">
                            <InlineCommentsPreview
                                postId={post.id}
                                communitySlug={post.community?.slug ?? null}
                                session={session}
                            />
                        </div>
                    )}
                </div>

                {post.community &&
                    post.source?.reason === 'Based on your interests' && (
                        <div className="border-t">
                            <button
                                className="bg-secondary h-10 w-full rounded-none border-0 text-sm"
                                disabled={
                                    joiningCommunityId === post.community.id ||
                                    isJoinPending
                                }
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (post.community?.id && onJoinCommunity) {
                                        onJoinCommunity(post.community.id);
                                    }
                                }}
                            >
                                Join Community
                            </button>
                        </div>
                    )}
            </Card>
        </Link>
    );
}
