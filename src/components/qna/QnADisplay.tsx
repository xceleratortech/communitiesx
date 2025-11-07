'use client';

import React from 'react';
import { trpc } from '@/providers/trpc-provider';
import { Button } from '@/components/ui/button';
import TipTapEditor from '@/components/TipTapEditor';
import { SafeHtml } from '@/lib/sanitize';
import { useSession } from '@/server/auth/client';
import { Separator } from '@/components/ui/separator';
import { useSearchParams } from 'next/navigation';
import { formatRelativeTime } from '@/lib/utils';
import { isHtmlContentEmpty } from '@/lib/utils';
import { AnswerCard } from '@/components/qna/AnswerCard';
import { qaAnswers, users } from '@/server/db/schema';

type Props = {
    postId: number;
    postTitle?: string;
    communitySlug?: string | null;
};

type AnswerWithAuthor = typeof qaAnswers.$inferSelect & {
    author: typeof users.$inferSelect | null;
};

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
    const answerIds = (answersQuery.data?.answers || []).map(
        (a: AnswerWithAuthor) => a.id,
    );
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
                    {answersQuery.data.answers.map((a: AnswerWithAuthor) => (
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
