import { z } from 'zod';
import { authProcedure, publicProcedure } from '../trpc';
import { db } from '@/server/db';
import { TRPCError } from '@trpc/server';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import {
    polls,
    pollOptions,
    pollVotes,
    posts,
    users,
    communities,
    communityMembers,
} from '@/server/db/schema';
import { isOrgAdminForCommunity } from '@/lib/utils';

export const pollProcedures = {
    // Create a poll for a post
    createPoll: authProcedure
        .input(
            z.object({
                postId: z.number(),
                question: z.string().min(1).max(200),
                pollType: z.enum(['single', 'multiple']),
                options: z.array(z.string().min(1).max(100)).min(2).max(10),
                expiresAt: z.date().optional(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            const userId = ctx.session.user.id;

            // Verify post exists and user has permission to add poll
            const post = await db.query.posts.findFirst({
                where: eq(posts.id, input.postId),
                with: {
                    community: true,
                },
            });

            if (!post) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Post not found',
                });
            }

            // Check if user is the post author or has community permissions
            const isAuthor = post.authorId === userId;
            const isSuperAdmin = ctx.session.user.appRole === 'admin';
            const isOrgAdmin = post.community?.orgId
                ? isOrgAdminForCommunity(ctx.session.user, post.community.orgId)
                : false;

            if (!isAuthor && !isSuperAdmin && !isOrgAdmin) {
                // Check community permissions
                if (post.communityId) {
                    const membership =
                        await db.query.communityMembers.findFirst({
                            where: and(
                                eq(communityMembers.userId, userId),
                                eq(
                                    communityMembers.communityId,
                                    post.communityId,
                                ),
                                eq(communityMembers.membershipType, 'member'),
                                eq(communityMembers.status, 'active'),
                            ),
                        });

                    if (
                        !membership ||
                        !['admin', 'moderator'].includes(membership.role)
                    ) {
                        throw new TRPCError({
                            code: 'FORBIDDEN',
                            message:
                                'You do not have permission to create polls for this post',
                        });
                    }
                } else {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You do not have permission to create polls for this post',
                    });
                }
            }

            // Check if poll already exists for this post
            const existingPoll = await db.query.polls.findFirst({
                where: eq(polls.postId, input.postId),
            });

            if (existingPoll) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'A poll already exists for this post',
                });
            }

            // Create poll and options in a transaction
            const result = await db.transaction(async (tx) => {
                // Create the poll
                const [poll] = await tx
                    .insert(polls)
                    .values({
                        postId: input.postId,
                        question: input.question,
                        pollType: input.pollType,
                        expiresAt: input.expiresAt || null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    })
                    .returning();

                // Create poll options
                const options = input.options.map((text, index) => ({
                    pollId: poll.id,
                    text,
                    orderIndex: index,
                    createdAt: new Date(),
                }));

                const createdOptions = await tx
                    .insert(pollOptions)
                    .values(options)
                    .returning();

                return { poll, options: createdOptions };
            });

            return result;
        }),

    // Vote on a poll
    votePoll: authProcedure
        .input(
            z.object({
                pollId: z.number(),
                optionIds: z.array(z.number()).min(1),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            const userId = ctx.session.user.id;

            // Get poll with post and community info
            const poll = await db.query.polls.findFirst({
                where: eq(polls.id, input.pollId),
                with: {
                    options: true,
                    post: {
                        with: {
                            community: true,
                        },
                    },
                },
            });

            if (!poll) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Poll not found',
                });
            }

            // Check if poll is closed or expired
            const now = new Date();
            const isExpired = poll.expiresAt && new Date(poll.expiresAt) < now;

            if (poll.isClosed || isExpired) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'This poll is closed',
                });
            }

            // Validate option IDs belong to this poll
            const validOptionIds = poll.options.map((opt) => opt.id);
            const invalidOptions = input.optionIds.filter(
                (id) => !validOptionIds.includes(id),
            );

            if (invalidOptions.length > 0) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Invalid poll options',
                });
            }

            // For single choice polls, only allow one option
            if (poll.pollType === 'single' && input.optionIds.length > 1) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Single choice polls only allow one option',
                });
            }

            // Check if user has already voted
            const existingVotes = await db.query.pollVotes.findMany({
                where: and(
                    eq(pollVotes.pollId, input.pollId),
                    eq(pollVotes.userId, userId),
                ),
            });

            if (existingVotes.length > 0) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'You have already voted on this poll',
                });
            }

            // Check voting permissions
            const canVote = await checkPollVotingPermission(
                poll.post,
                userId,
                ctx.session.user,
            );

            if (!canVote) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to vote on this poll',
                });
            }

            // Create votes in a transaction
            const votes = input.optionIds.map((optionId) => ({
                pollId: input.pollId,
                pollOptionId: optionId,
                userId,
                createdAt: new Date(),
            }));

            await db.insert(pollVotes).values(votes);

            return { success: true };
        }),

    // Get poll results
    getPollResults: publicProcedure
        .input(z.object({ pollId: z.number() }))
        .query(async ({ input, ctx }) => {
            const poll = await db.query.polls.findFirst({
                where: eq(polls.id, input.pollId),
                with: {
                    options: {
                        orderBy: [pollOptions.orderIndex],
                    },
                    post: {
                        with: {
                            community: true,
                        },
                    },
                },
            });

            if (!poll) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Poll not found',
                });
            }

            // Get vote counts for each option
            const voteCounts = await db
                .select({
                    optionId: pollOptions.id,
                    voteCount: count(pollVotes.id),
                })
                .from(pollOptions)
                .leftJoin(pollVotes, eq(pollOptions.id, pollVotes.pollOptionId))
                .where(eq(pollOptions.pollId, input.pollId))
                .groupBy(pollOptions.id);

            // Get user's votes if authenticated
            let userVotes: number[] = [];
            if (ctx.session?.user?.id) {
                const votes = await db.query.pollVotes.findMany({
                    where: and(
                        eq(pollVotes.pollId, input.pollId),
                        eq(pollVotes.userId, ctx.session.user.id),
                    ),
                });
                userVotes = votes.map((vote) => vote.pollOptionId);
            }

            // Calculate total votes and percentages
            const totalVotes = voteCounts.reduce(
                (sum, item) => sum + item.voteCount,
                0,
            );

            const results = poll.options.map((option) => {
                const voteData = voteCounts.find(
                    (vc) => vc.optionId === option.id,
                );
                const voteCount = voteData?.voteCount || 0;
                const percentage =
                    totalVotes > 0
                        ? Math.round((voteCount / totalVotes) * 100)
                        : 0;

                return {
                    optionId: option.id,
                    optionText: option.text,
                    voteCount,
                    percentage,
                    isUserVoted: userVotes.includes(option.id),
                };
            });

            // Check if user can vote
            const canVote = ctx.session?.user?.id
                ? await checkPollVotingPermission(
                      poll.post,
                      ctx.session.user.id,
                      ctx.session.user,
                  )
                : false;

            return {
                poll,
                results,
                totalVotes,
                userVotes,
                canVote,
                hasUserVoted: userVotes.length > 0,
            };
        }),

    // Close a poll (admin/creator only)
    closePoll: authProcedure
        .input(z.object({ pollId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const userId = ctx.session.user.id;

            const poll = await db.query.polls.findFirst({
                where: eq(polls.id, input.pollId),
                with: {
                    post: {
                        with: {
                            community: true,
                        },
                    },
                },
            });

            if (!poll) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Poll not found',
                });
            }

            // Check permissions
            const isAuthor = poll.post.authorId === userId;
            const isSuperAdmin = ctx.session.user.appRole === 'admin';
            const isOrgAdmin = poll.post.community?.orgId
                ? isOrgAdminForCommunity(
                      ctx.session.user,
                      poll.post.community.orgId,
                  )
                : false;

            if (!isAuthor && !isSuperAdmin && !isOrgAdmin) {
                // Check community permissions
                if (poll.post.communityId) {
                    const membership =
                        await db.query.communityMembers.findFirst({
                            where: and(
                                eq(communityMembers.userId, userId),
                                eq(
                                    communityMembers.communityId,
                                    poll.post.communityId,
                                ),
                                eq(communityMembers.membershipType, 'member'),
                                eq(communityMembers.status, 'active'),
                            ),
                        });

                    if (
                        !membership ||
                        !['admin', 'moderator'].includes(membership.role)
                    ) {
                        throw new TRPCError({
                            code: 'FORBIDDEN',
                            message:
                                'You do not have permission to close this poll',
                        });
                    }
                } else {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You do not have permission to close this poll',
                    });
                }
            }

            // Close the poll
            await db
                .update(polls)
                .set({
                    isClosed: true,
                    updatedAt: new Date(),
                })
                .where(eq(polls.id, input.pollId));

            return { success: true };
        }),
};

// Helper function to check poll voting permissions
async function checkPollVotingPermission(
    post: any,
    userId: string,
    user: any,
): Promise<boolean> {
    // Super admin can always vote
    if (user.appRole === 'admin') return true;

    // Org admin can vote in their org's communities
    if (
        post.community?.orgId &&
        isOrgAdminForCommunity(user, post.community.orgId)
    ) {
        return true;
    }

    // For community posts, user must be a member
    if (post.communityId) {
        const membership = await db.query.communityMembers.findFirst({
            where: and(
                eq(communityMembers.userId, userId),
                eq(communityMembers.communityId, post.communityId),
                eq(communityMembers.membershipType, 'member'),
                eq(communityMembers.status, 'active'),
            ),
        });

        return !!membership;
    }

    // For org posts, user must be in the same org
    if (post.orgId) {
        return user.orgId === post.orgId;
    }

    return false;
}
