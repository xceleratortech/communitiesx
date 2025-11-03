'use client';

import React from 'react';
import { trpc } from '@/providers/trpc-provider';
import { Button } from '@/components/ui/button';
import TipTapEditor from '@/components/TipTapEditor';
import { SafeHtml } from '@/lib/sanitize';
import { useSession } from '@/server/auth/client';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Bookmark, ThumbsUp } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

type Props = {
    postId: number;
};

export function QnADisplay({ postId }: Props) {
    const { data: session } = useSession();
    const [answer, setAnswer] = React.useState('');
    const [isEditing, setIsEditing] = React.useState(false);

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
    const savedMapQuery = trpc.community.getUserSavedAnswersMap.useQuery(
        { answerIds },
        { enabled: !!session && answerIds.length > 0 },
    );
    const markHelpful = trpc.community.markHelpfulAnswer.useMutation({
        onSuccess: () => helpfulMapQuery.refetch(),
    });
    const unmarkHelpful = trpc.community.unmarkHelpfulAnswer.useMutation({
        onSuccess: () => helpfulMapQuery.refetch(),
    });
    const saveAns = trpc.community.saveAnswer.useMutation({
        onSuccess: () => savedMapQuery.refetch(),
    });
    const unsaveAns = trpc.community.unsaveAnswer.useMutation({
        onSuccess: () => savedMapQuery.refetch(),
    });

    const revealAt = questionQuery.data?.question?.answersVisibleAt
        ? new Date(questionQuery.data.question.answersVisibleAt)
        : null;
    const canEditUntil = questionQuery.data?.question?.allowEditsUntil
        ? new Date(questionQuery.data.question.allowEditsUntil)
        : null;
    const now = new Date();
    const canEdit = !canEditUntil || now < canEditUntil;

    // Scroll/highlight if deep-linked
    React.useEffect(() => {
        if (!highlightId) return;
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
                        <Card key={a.id} id={`answer-${a.id}`} className="p-3">
                            <div className="mb-1 text-sm font-medium">
                                {a.author?.name || 'Unknown'}
                            </div>
                            <SafeHtml html={a.content} />
                            <div className="mt-2 flex items-center gap-3 text-xs">
                                <button
                                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                                    onClick={() =>
                                        markHelpful.mutate({ answerId: a.id })
                                    }
                                    aria-label="Mark helpful"
                                >
                                    <ThumbsUp className="h-4 w-4" />
                                    <span>
                                        {helpfulMapQuery.data?.[a.id] ?? 0}
                                    </span>
                                </button>
                                {session && (
                                    <button
                                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                                        onClick={() =>
                                            savedMapQuery.data?.[a.id]
                                                ? unsaveAns.mutate({
                                                      answerId: a.id,
                                                  })
                                                : saveAns.mutate({
                                                      answerId: a.id,
                                                  })
                                        }
                                        aria-label="Save answer"
                                    >
                                        <Bookmark
                                            className={`h-4 w-4 ${savedMapQuery.data?.[a.id] ? 'fill-current' : ''}`}
                                        />
                                        <span>
                                            {savedMapQuery.data?.[a.id]
                                                ? 'Saved'
                                                : 'Save'}
                                        </span>
                                    </button>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

export default QnADisplay;
