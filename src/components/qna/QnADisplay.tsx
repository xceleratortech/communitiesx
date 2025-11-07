'use client';

import React from 'react';
import { trpc } from '@/providers/trpc-provider';
import { Button } from '@/components/ui/button';
import TipTapEditor from '@/components/TipTapEditor';
import { SafeHtml } from '@/lib/sanitize';
import { useSession } from '@/server/auth/client';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Bookmark, BadgeCheck, MessageSquare, Share2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { ShareButton } from '@/components/ui/share-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserProfilePopover } from '@/components/ui/user-profile-popover';
import { formatRelativeTime } from '@/lib/utils';
import { isHtmlContentEmpty } from '@/lib/utils';

type Props = {
    postId: number;
    postTitle?: string;
    communitySlug?: string | null;
};

// AnswerCard component to handle hooks properly
function AnswerCard({
    answer,
    postId,
    postTitle,
    communitySlug,
    isSaved,
    isHighlighted,
    isHelpful,
    helpfulCount,
    isCommentsExpanded,
    onToggleComments,
    onMarkHelpful,
    onSave,
    session,
    buildAnswerShareUrl,
    createAnswerComment,
    updateAnswerComment,
    deleteAnswerComment,
}: {
    answer: any;
    postId: number;
    postTitle?: string;
    communitySlug?: string | null;
    isSaved: boolean;
    isHighlighted: boolean;
    isHelpful: boolean;
    helpfulCount: number;
    isCommentsExpanded: boolean;
    onToggleComments: () => void;
    onMarkHelpful: () => void;
    onSave: () => void;
    session: any;
    buildAnswerShareUrl: (answerId: number) => string;
    createAnswerComment: any;
    updateAnswerComment: any;
    deleteAnswerComment: any;
}) {
    const [replyingToAnswerId, setReplyingToAnswerId] = React.useState<
        number | null
    >(null);
    const [replyContent, setReplyContent] = React.useState('');
    const [editingCommentId, setEditingCommentId] = React.useState<
        number | null
    >(null);
    const [editedCommentContent, setEditedCommentContent] = React.useState('');
    const [hasAutoExpanded, setHasAutoExpanded] = React.useState(false);
    const [visibleCommentsCount, setVisibleCommentsCount] = React.useState(2);

    // Comment query - always enabled to show accurate count, but only display when expanded
    const answerCommentsQuery = trpc.community.listAnswerComments.useQuery(
        { answerId: answer.id },
        {
            enabled: true,
        },
    );
    const allComments = answerCommentsQuery.data || [];
    const comments = isCommentsExpanded
        ? allComments.slice(0, visibleCommentsCount)
        : [];
    const hasMoreComments = allComments.length > visibleCommentsCount;

    // Auto-expand comments for highlighted answer (only once)
    React.useEffect(() => {
        if (isHighlighted && !isCommentsExpanded && !hasAutoExpanded) {
            onToggleComments();
            setHasAutoExpanded(true);
        }
    }, [isHighlighted, isCommentsExpanded, hasAutoExpanded, onToggleComments]);

    // Reset visible comments count when comments are collapsed
    React.useEffect(() => {
        if (!isCommentsExpanded) {
            setVisibleCommentsCount(2);
        }
    }, [isCommentsExpanded]);

    return (
        <Card
            id={`answer-${answer.id}`}
            className={`p-3 ${
                isSaved ? 'border-primary bg-primary/5 border-2' : ''
            } ${isHighlighted ? 'ring-primary ring-2' : ''}`}
        >
            <div className="mb-1 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                    <UserProfilePopover userId={answer.author?.id || ''}>
                        <div className="flex cursor-pointer items-center gap-2">
                            <Avatar className="h-5 w-5">
                                <AvatarImage
                                    src={
                                        answer.author?.avatar ||
                                        answer.author?.image ||
                                        undefined
                                    }
                                />
                                <AvatarFallback className="text-[10px]">
                                    {(answer.author?.name || 'U')
                                        .substring(0, 2)
                                        .toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-foreground font-medium hover:underline">
                                {answer.author?.name || 'Unknown'}
                            </span>
                        </div>
                    </UserProfilePopover>
                </div>
                <span className="text-muted-foreground whitespace-nowrap">
                    {formatRelativeTime(answer.createdAt)}
                </span>
            </div>
            <SafeHtml
                html={answer.content}
                className="prose prose-sm dark:prose-invert max-w-none"
            />

            {/* Stats row */}
            <div className="text-muted-foreground mt-2 flex items-center justify-between text-xs">
                <span>
                    {helpfulCount} {helpfulCount === 1 ? 'person' : 'people'}{' '}
                    found this helpful
                </span>
                <span
                    className="cursor-pointer hover:underline"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleComments();
                    }}
                >
                    {allComments.length}{' '}
                    {allComments.length === 1 ? 'Comment' : 'Comments'}
                </span>
            </div>

            <div className="bg-border my-2 h-px w-full" />

            {/* Action row */}
            <div className="mt-1 flex items-center gap-3 text-xs">
                {session && (
                    <Button
                        variant="ghost"
                        className="hover:text-foreground inline-flex items-center gap-1"
                        onClick={onMarkHelpful}
                        aria-label="Mark helpful"
                    >
                        <BadgeCheck
                            className={`h-4 w-4 ${isHelpful ? 'fill-current' : ''}`}
                        />
                        <span>Helpful</span>
                    </Button>
                )}
                <Button
                    variant="ghost"
                    className="hover:text-foreground inline-flex items-center gap-1"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleComments();
                    }}
                    aria-label="Toggle comments"
                >
                    <MessageSquare className="h-4 w-4" />
                    <span>Comment</span>
                </Button>
                {session && (
                    <Button
                        variant="ghost"
                        className="hover:text-foreground inline-flex items-center gap-1"
                        onClick={onSave}
                        aria-label="Save answer"
                    >
                        <Bookmark
                            className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`}
                        />
                        <span>{isSaved ? 'Saved' : 'Save'}</span>
                    </Button>
                )}
                <ShareButton
                    title={postTitle || 'Check out this answer'}
                    text={`Answer to: ${postTitle || 'the question'}`}
                    url={buildAnswerShareUrl(answer.id)}
                    variant="ghost"
                    size="sm"
                    showLabel={true}
                />
            </div>

            {/* Comments section */}
            {isCommentsExpanded && (
                <div className="mt-4 space-y-3 border-t pt-3">
                    {/* Comment Editor - shown immediately when expanded */}
                    {session && (
                        <div className="space-y-2">
                            <TipTapEditor
                                content={replyContent}
                                onChange={setReplyContent}
                                placeholder="Write a comment..."
                                variant="compact"
                                postId={postId}
                            />
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setReplyContent('');
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        createAnswerComment.mutate(
                                            {
                                                answerId: answer.id,
                                                content: replyContent,
                                            },
                                            {
                                                onSuccess: () => {
                                                    setReplyContent('');
                                                    // Increase visible count to show the new comment
                                                    setVisibleCommentsCount(
                                                        (prev) => prev + 1,
                                                    );
                                                    answerCommentsQuery.refetch();
                                                },
                                            },
                                        );
                                    }}
                                    disabled={
                                        createAnswerComment.isPending ||
                                        isHtmlContentEmpty(replyContent)
                                    }
                                >
                                    {createAnswerComment.isPending
                                        ? 'Posting...'
                                        : 'Post Comment'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Comments List */}
                    {answerCommentsQuery.isLoading ? (
                        <div className="text-muted-foreground text-xs">
                            Loading comments...
                        </div>
                    ) : comments.length > 0 ? (
                        <div className="space-y-2">
                            {comments
                                .filter((c: any) => !c.isDeleted)
                                .map((comment: any) => (
                                    <div
                                        key={comment.id}
                                        className="rounded-md border p-2"
                                    >
                                        <div className="mb-1 flex items-center gap-2">
                                            <UserProfilePopover
                                                userId={
                                                    comment.author?.id || ''
                                                }
                                            >
                                                <span className="text-xs font-medium hover:underline">
                                                    {comment.author?.name ||
                                                        'Unknown'}
                                                </span>
                                            </UserProfilePopover>
                                            <span className="text-muted-foreground text-xs">
                                                {formatRelativeTime(
                                                    comment.createdAt,
                                                )}
                                            </span>
                                            {session?.user?.id ===
                                                comment.authorId && (
                                                <>
                                                    <button
                                                        className="text-muted-foreground hover:text-foreground text-xs underline"
                                                        onClick={() => {
                                                            setEditingCommentId(
                                                                comment.id,
                                                            );
                                                            setEditedCommentContent(
                                                                comment.content,
                                                            );
                                                        }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className="text-muted-foreground hover:text-destructive text-xs underline"
                                                        onClick={() => {
                                                            if (
                                                                confirm(
                                                                    'Delete this comment?',
                                                                )
                                                            ) {
                                                                deleteAnswerComment.mutate(
                                                                    {
                                                                        commentId:
                                                                            comment.id,
                                                                    },
                                                                    {
                                                                        onSuccess:
                                                                            () => {
                                                                                answerCommentsQuery.refetch();
                                                                            },
                                                                    },
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        Delete
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                        {editingCommentId === comment.id ? (
                                            <div className="space-y-2">
                                                <TipTapEditor
                                                    content={
                                                        editedCommentContent
                                                    }
                                                    onChange={
                                                        setEditedCommentContent
                                                    }
                                                    placeholder="Edit comment..."
                                                    variant="compact"
                                                    postId={postId}
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setEditingCommentId(
                                                                null,
                                                            );
                                                            setEditedCommentContent(
                                                                '',
                                                            );
                                                        }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => {
                                                            updateAnswerComment.mutate(
                                                                {
                                                                    commentId:
                                                                        comment.id,
                                                                    content:
                                                                        editedCommentContent,
                                                                },
                                                                {
                                                                    onSuccess:
                                                                        () => {
                                                                            answerCommentsQuery.refetch();
                                                                        },
                                                                },
                                                            );
                                                        }}
                                                        disabled={
                                                            updateAnswerComment.isPending ||
                                                            isHtmlContentEmpty(
                                                                editedCommentContent,
                                                            )
                                                        }
                                                    >
                                                        {updateAnswerComment.isPending
                                                            ? 'Saving...'
                                                            : 'Save'}
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <SafeHtml
                                                html={comment.content}
                                                className="prose prose-sm dark:prose-invert max-w-none text-xs"
                                            />
                                        )}
                                    </div>
                                ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-xs">
                            No comments yet.
                        </p>
                    )}

                    {/* Load more comments button */}
                    {hasMoreComments && (
                        <div className="text-center">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setVisibleCommentsCount((prev) => prev + 2);
                                }}
                            >
                                Load more comments
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
}

export function QnADisplay({ postId, postTitle, communitySlug }: Props) {
    const { data: session } = useSession();
    const [answer, setAnswer] = React.useState('');
    const [isEditing, setIsEditing] = React.useState(false);
    const [expandedAnswerComments, setExpandedAnswerComments] = React.useState<
        Set<number>
    >(new Set());

    const questionQuery = trpc.community.getQuestion.useQuery({ postId });
    const answersQuery = trpc.community.listAnswers.useQuery(
        { postId },
        { enabled: !!session },
    );
    const submitAnswer = trpc.community.submitAnswer.useMutation({
        onSuccess: () => {
            setIsEditing(false);
            setAnswer('');
            answersQuery.refetch();
        },
    });
    const params = useSearchParams();
    const highlightId = params?.get('answerId');

    // Helpful & Save maps
    const answerIds = (answersQuery.data?.answers || []).map((a: any) => a.id);
    const helpfulMapQuery = trpc.community.getAnswerHelpfulCounts.useQuery(
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
    const markHelpful = trpc.community.markHelpfulAnswer.useMutation({
        onSuccess: () => {
            helpfulMapQuery.refetch();
            userHelpfulMapQuery.refetch();
        },
    });
    const unmarkHelpful = trpc.community.unmarkHelpfulAnswer.useMutation({
        onSuccess: () => {
            helpfulMapQuery.refetch();
            userHelpfulMapQuery.refetch();
        },
    });
    const saveAns = trpc.community.saveAnswer.useMutation({
        onSuccess: () => savedMapQuery.refetch(),
    });
    const unsaveAns = trpc.community.unsaveAnswer.useMutation({
        onSuccess: () => savedMapQuery.refetch(),
    });

    // Comment mutations - refetch handled in AnswerCard component
    const createAnswerComment =
        trpc.community.createAnswerComment.useMutation();
    const updateAnswerComment =
        trpc.community.updateAnswerComment.useMutation();
    const deleteAnswerComment =
        trpc.community.deleteAnswerComment.useMutation();

    // Helper to build share URL
    const buildAnswerShareUrl = (answerId: number) => {
        const baseUrl =
            typeof window !== 'undefined' ? window.location.origin : '';
        const postPath = communitySlug
            ? `/communities/${communitySlug}/posts/${postId}`
            : `/posts/${postId}`;
        return `${baseUrl}${postPath}?answerId=${answerId}`;
    };

    const revealAt = questionQuery.data?.question?.answersVisibleAt
        ? new Date(questionQuery.data.question.answersVisibleAt)
        : null;
    const canEditUntil = questionQuery.data?.question?.allowEditsUntil
        ? new Date(questionQuery.data.question.allowEditsUntil)
        : null;
    const now = new Date();
    const canEdit = !canEditUntil || now < canEditUntil;

    // Scroll/highlight if deep-linked and auto-expand comments
    React.useEffect(() => {
        if (!highlightId) return;
        const answerId = parseInt(highlightId);
        if (isNaN(answerId)) return;

        // Auto-expand comments for highlighted answer
        setExpandedAnswerComments((prev) => new Set([...prev, answerId]));

        const el = document.getElementById(`answer-${highlightId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-primary');
            setTimeout(
                () => el.classList.remove('ring-2', 'ring-primary'),
                2000,
            );
        }
    }, [highlightId, answersQuery.data]);

    return (
        <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Q&A</h3>
                {session && canEdit && (
                    <Button size="sm" onClick={() => setIsEditing((v) => !v)}>
                        {isEditing ? 'Cancel' : 'Answer'}
                    </Button>
                )}
            </div>
            {questionQuery.data?.question &&
                questionQuery.data.answersCount !== undefined && (
                    <div className="text-muted-foreground text-sm">
                        {questionQuery.data.answersCount} Answers
                    </div>
                )}

            {isEditing && session && (
                <div>
                    <TipTapEditor
                        content={answer}
                        onChange={setAnswer}
                        placeholder="Write your answer..."
                        variant="compact"
                    />
                    <div className="mt-2">
                        <Button
                            size="sm"
                            onClick={() =>
                                submitAnswer.mutate({ postId, content: answer })
                            }
                            disabled={submitAnswer.isPending || !answer.trim()}
                        >
                            {submitAnswer.isPending
                                ? 'Submitting...'
                                : 'Submit'}
                        </Button>
                    </div>
                </div>
            )}

            <Separator />

            {answersQuery.data && (
                <div className="space-y-3">
                    {!answersQuery.data.reveal && (
                        <p className="text-muted-foreground text-sm">
                            Answers are hidden until{' '}
                            {revealAt ? revealAt.toLocaleString() : 'deadline'}.
                            You can see your own answer and admins/moderators
                            can preview all answers.
                        </p>
                    )}
                    {answersQuery.data.answers.map((a: any) => (
                        <AnswerCard
                            key={a.id}
                            answer={a}
                            postId={postId}
                            postTitle={postTitle}
                            communitySlug={communitySlug}
                            isSaved={savedMapQuery.data?.[a.id] || false}
                            isHighlighted={highlightId === a.id.toString()}
                            isHelpful={
                                userHelpfulMapQuery.data?.[a.id] || false
                            }
                            helpfulCount={helpfulMapQuery.data?.[a.id] ?? 0}
                            isCommentsExpanded={expandedAnswerComments.has(
                                a.id,
                            )}
                            onToggleComments={() => {
                                setExpandedAnswerComments((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(a.id)) {
                                        next.delete(a.id);
                                    } else {
                                        next.add(a.id);
                                    }
                                    return next;
                                });
                            }}
                            onMarkHelpful={() =>
                                userHelpfulMapQuery.data?.[a.id]
                                    ? unmarkHelpful.mutate({
                                          answerId: a.id,
                                      })
                                    : markHelpful.mutate({
                                          answerId: a.id,
                                      })
                            }
                            onSave={() =>
                                savedMapQuery.data?.[a.id]
                                    ? unsaveAns.mutate({
                                          answerId: a.id,
                                      })
                                    : saveAns.mutate({
                                          answerId: a.id,
                                      })
                            }
                            session={session}
                            buildAnswerShareUrl={buildAnswerShareUrl}
                            createAnswerComment={createAnswerComment}
                            updateAnswerComment={updateAnswerComment}
                            deleteAnswerComment={deleteAnswerComment}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default QnADisplay;
