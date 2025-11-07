import { z } from 'zod';
import { authProcedure, publicProcedure } from '../trpc';
import { db } from '@/server/db';
import { TRPCError } from '@trpc/server';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import {
    posts,
    users,
    communities,
    communityMembers,
    qaQuestions,
    qaAnswers,
    qaAnswerHelpful,
    qaAnswerSaves,
    qaAnswerComments,
} from '@/server/db/schema';
import { isOrgAdminForCommunity } from '@/lib/utils';
import { sanitizeHtml } from '@/lib/sanitize-server';

function now() {
    return new Date();
}

function canSeeAllPreDeadline(user: any, post: any) {
    if (!user || !post) return false;
    if (user.appRole === 'admin') return true; // super admin
    if (post.authorId === user.id) return true; // question creator
    if (
        post.community?.orgId &&
        isOrgAdminForCommunity(user, post.community.orgId)
    )
        return true; // org admin
    // community moderators/admins
    if (post.communityId && user.id) {
        // handled in query where needed; this is a hint helper
    }
    return false;
}

export const qaProcedures = {
    getQuestion: publicProcedure
        .input(z.object({ postId: z.number() }))
        .query(async ({ input }) => {
            const question = await db.query.qaQuestions.findFirst({
                where: eq(qaQuestions.postId, input.postId),
            });
            if (!question) return null;
            const answersCount = await db
                .select({ c: sql<number>`count(*)` })
                .from(qaAnswers)
                .where(
                    and(
                        eq(qaAnswers.postId, input.postId),
                        eq(qaAnswers.isDeleted, false),
                    ),
                );
            return { question, answersCount: Number(answersCount[0]?.c || 0) };
        }),

    submitAnswer: authProcedure
        .input(z.object({ postId: z.number(), content: z.string().min(1) }))
        .mutation(async ({ input, ctx }) => {
            const userId = ctx.session.user.id;
            const post = await db.query.posts.findFirst({
                where: eq(posts.id, input.postId),
                with: { community: true },
            });
            if (!post)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Post not found',
                });

            const q = await db.query.qaQuestions.findFirst({
                where: eq(qaQuestions.postId, input.postId),
            });
            if (!q)
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'This post is not a Q&A',
                });

            const editDeadline = q.allowEditsUntil
                ? new Date(q.allowEditsUntil)
                : undefined;
            const isBeforeDeadline = !editDeadline || now() < editDeadline;
            if (!isBeforeDeadline) {
                // If user already has an answer, do not allow edits after deadline
                const existing = await db.query.qaAnswers.findFirst({
                    where: and(
                        eq(qaAnswers.postId, input.postId),
                        eq(qaAnswers.authorId, userId),
                    ),
                });
                if (existing) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'Editing period is over',
                    });
                }
            }

            // Upsert single answer per user
            const existing = await db.query.qaAnswers.findFirst({
                where: and(
                    eq(qaAnswers.postId, input.postId),
                    eq(qaAnswers.authorId, userId),
                ),
            });
            if (existing) {
                if (!isBeforeDeadline) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'Editing period is over',
                    });
                }
                await db
                    .update(qaAnswers)
                    .set({
                        content: sanitizeHtml(input.content),
                        updatedAt: now(),
                    })
                    .where(eq(qaAnswers.id, existing.id));
                return { id: existing.id };
            }
            const [created] = await db
                .insert(qaAnswers)
                .values({
                    postId: input.postId,
                    authorId: userId,
                    content: sanitizeHtml(input.content),
                    createdAt: now(),
                    updatedAt: now(),
                })
                .returning();
            return created;
        }),

    listAnswers: authProcedure
        .input(
            z.object({
                postId: z.number(),
                limit: z.number().min(1).max(50).optional().default(3),
                offset: z.number().min(0).optional().default(0),
            }),
        )
        .query(async ({ input, ctx }) => {
            const userId = ctx.session.user.id;
            const post = await db.query.posts.findFirst({
                where: eq(posts.id, input.postId),
                with: { community: true },
            });
            if (!post)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Post not found',
                });
            const q = await db.query.qaQuestions.findFirst({
                where: eq(qaQuestions.postId, input.postId),
            });
            if (!q) return { answers: [] };

            const visibleAt = q.answersVisibleAt
                ? new Date(q.answersVisibleAt)
                : null;
            const reveal = !visibleAt || now() >= visibleAt;
            if (reveal) {
                const totalCount = await db
                    .select({ c: sql<number>`count(*)` })
                    .from(qaAnswers)
                    .where(
                        and(
                            eq(qaAnswers.postId, input.postId),
                            eq(qaAnswers.isDeleted, false),
                        ),
                    );
                const answers = await db.query.qaAnswers.findMany({
                    where: and(
                        eq(qaAnswers.postId, input.postId),
                        eq(qaAnswers.isDeleted, false),
                    ),
                    with: { author: true },
                    orderBy: [desc(qaAnswers.createdAt)],
                    limit: input.limit,
                    offset: input.offset,
                });
                const count = Number(totalCount[0]?.c || 0);
                return {
                    answers,
                    reveal: true,
                    totalCount: count,
                    hasNextPage: input.offset + answers.length < count,
                };
            }

            // Pre-deadline visibility: own answer always visible
            const own = await db.query.qaAnswers.findMany({
                where: and(
                    eq(qaAnswers.postId, input.postId),
                    eq(qaAnswers.authorId, userId),
                    eq(qaAnswers.isDeleted, false),
                ),
                with: { author: true },
            });

            // Administrative viewers can see all
            let canSeeAll = false;
            if (
                post.authorId === userId ||
                ctx.session.user.appRole === 'admin'
            ) {
                canSeeAll = true;
            } else if (post.communityId) {
                const membership = await db.query.communityMembers.findFirst({
                    where: and(
                        eq(communityMembers.userId, userId),
                        eq(communityMembers.communityId, post.communityId),
                        eq(communityMembers.membershipType, 'member'),
                        eq(communityMembers.status, 'active'),
                    ),
                });
                if (
                    membership &&
                    ['admin', 'moderator'].includes(membership.role)
                ) {
                    canSeeAll = true;
                }
                if (
                    post.community?.orgId &&
                    isOrgAdminForCommunity(
                        ctx.session.user,
                        post.community.orgId,
                    )
                ) {
                    canSeeAll = true;
                }
            }

            if (canSeeAll) {
                const totalCount = await db
                    .select({ c: sql<number>`count(*)` })
                    .from(qaAnswers)
                    .where(
                        and(
                            eq(qaAnswers.postId, input.postId),
                            eq(qaAnswers.isDeleted, false),
                        ),
                    );
                const answers = await db.query.qaAnswers.findMany({
                    where: and(
                        eq(qaAnswers.postId, input.postId),
                        eq(qaAnswers.isDeleted, false),
                    ),
                    with: { author: true },
                    orderBy: [desc(qaAnswers.createdAt)],
                    limit: input.limit,
                    offset: input.offset,
                });
                const count = Number(totalCount[0]?.c || 0);
                return {
                    answers,
                    reveal: false,
                    totalCount: count,
                    hasNextPage: input.offset + answers.length < count,
                };
            }

            return {
                answers: own,
                reveal: false,
                totalCount: own.length,
                hasNextPage: false,
            };
        }),

    markHelpful: authProcedure
        .input(z.object({ answerId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const userId = ctx.session.user.id;
            try {
                await db.insert(qaAnswerHelpful).values({
                    answerId: input.answerId,
                    userId,
                    createdAt: now(),
                });
            } catch {}
            return { success: true };
        }),

    unmarkHelpful: authProcedure
        .input(z.object({ answerId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const userId = ctx.session.user.id;
            await db
                .delete(qaAnswerHelpful)
                .where(
                    and(
                        eq(qaAnswerHelpful.answerId, input.answerId),
                        eq(qaAnswerHelpful.userId, userId),
                    ),
                );
            return { success: true };
        }),

    getHelpfulCounts: authProcedure
        .input(z.object({ answerIds: z.array(z.number()).min(1) }))
        .query(async ({ input }) => {
            const rows = await db
                .select({
                    id: qaAnswerHelpful.answerId,
                    c: sql<number>`count(*)`,
                })
                .from(qaAnswerHelpful)
                .where(inArray(qaAnswerHelpful.answerId, input.answerIds))
                .groupBy(qaAnswerHelpful.answerId);
            const map: Record<number, number> = {};
            for (const r of rows) map[r.id] = Number(r.c || 0);
            return map;
        }),

    saveAnswer: authProcedure
        .input(z.object({ answerId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const userId = ctx.session.user.id;
            try {
                await db.insert(qaAnswerSaves).values({
                    answerId: input.answerId,
                    userId,
                    createdAt: now(),
                });
            } catch {}
            return { success: true };
        }),

    unsaveAnswer: authProcedure
        .input(z.object({ answerId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const userId = ctx.session.user.id;
            await db
                .delete(qaAnswerSaves)
                .where(
                    and(
                        eq(qaAnswerSaves.answerId, input.answerId),
                        eq(qaAnswerSaves.userId, userId),
                    ),
                );
            return { success: true };
        }),

    getUserSavedAnswersMap: authProcedure
        .input(z.object({ answerIds: z.array(z.number()).min(1) }))
        .query(async ({ input, ctx }) => {
            const userId = ctx.session.user.id;
            const rows = await db
                .select({ id: qaAnswerSaves.answerId })
                .from(qaAnswerSaves)
                .where(
                    and(
                        inArray(qaAnswerSaves.answerId, input.answerIds),
                        eq(qaAnswerSaves.userId, userId),
                    ),
                );
            const map: Record<number, boolean> = {};
            for (const r of rows) map[r.id] = true;
            return map;
        }),

    getUserHelpfulAnswersMap: authProcedure
        .input(z.object({ answerIds: z.array(z.number()).min(1) }))
        .query(async ({ input, ctx }) => {
            const userId = ctx.session.user.id;
            const rows = await db
                .select({ id: qaAnswerHelpful.answerId })
                .from(qaAnswerHelpful)
                .where(
                    and(
                        inArray(qaAnswerHelpful.answerId, input.answerIds),
                        eq(qaAnswerHelpful.userId, userId),
                    ),
                );
            const map: Record<number, boolean> = {};
            for (const r of rows) map[r.id] = true;
            return map;
        }),

    // Answer comments
    listAnswerComments: authProcedure
        .input(z.object({ answerId: z.number() }))
        .query(async ({ input }) => {
            const rows = await db.query.qaAnswerComments.findMany({
                where: eq(qaAnswerComments.answerId, input.answerId),
                with: { author: true },
                orderBy: [desc(qaAnswerComments.createdAt)],
            });
            return rows;
        }),

    createAnswerComment: authProcedure
        .input(
            z.object({
                answerId: z.number(),
                content: z.string().min(1),
                parentId: z.number().optional(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            const [c] = await db
                .insert(qaAnswerComments)
                .values({
                    answerId: input.answerId,
                    authorId: ctx.session.user.id,
                    content: sanitizeHtml(input.content),
                    parentId: input.parentId || null,
                    createdAt: now(),
                    updatedAt: now(),
                })
                .returning();
            return c;
        }),

    updateAnswerComment: authProcedure
        .input(z.object({ commentId: z.number(), content: z.string().min(1) }))
        .mutation(async ({ input, ctx }) => {
            // ensure author owns the comment
            const owned = await db.query.qaAnswerComments.findFirst({
                where: eq(qaAnswerComments.id, input.commentId),
            });
            if (!owned || owned.authorId !== ctx.session.user.id)
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Not allowed',
                });
            await db
                .update(qaAnswerComments)
                .set({ content: sanitizeHtml(input.content), updatedAt: now() })
                .where(eq(qaAnswerComments.id, input.commentId));
            return { success: true };
        }),

    deleteAnswerComment: authProcedure
        .input(z.object({ commentId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const owned = await db.query.qaAnswerComments.findFirst({
                where: eq(qaAnswerComments.id, input.commentId),
            });
            if (!owned || owned.authorId !== ctx.session.user.id)
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Not allowed',
                });
            await db
                .update(qaAnswerComments)
                .set({ isDeleted: true, updatedAt: now() })
                .where(eq(qaAnswerComments.id, input.commentId));
            return { success: true };
        }),
};
