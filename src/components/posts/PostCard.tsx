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

type SessionLike = { user?: { id: string } | null } | null;

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
    formatRelativeTime: (date: any) => string;
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
