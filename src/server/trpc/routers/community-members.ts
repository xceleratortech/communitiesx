import { z } from 'zod';
import { authProcedure } from '../trpc';
import { db } from '@/server/db';
import { TRPCError } from '@trpc/server';
import {
    communityMembers,
    communityMemberRequests,
    communities,
} from '@/server/db/schema';
import { and, desc, eq } from 'drizzle-orm';

export const memberProcedures = {
    getPendingRequests: authProcedure
        .input(z.object({ communityId: z.number() }))
        .query(async ({ input, ctx }) => {
            const pendingRequests =
                await db.query.communityMemberRequests.findMany({
                    where: and(
                        eq(
                            communityMemberRequests.communityId,
                            input.communityId,
                        ),
                        eq(communityMemberRequests.status, 'pending'),
                    ),
                    with: {
                        user: {
                            columns: {
                                id: true,
                                name: true,
                                email: true,
                                image: true,
                            },
                        },
                    },
                    orderBy: desc(communityMemberRequests.requestedAt),
                });
            return pendingRequests;
        }),

    approveRequest: authProcedure
        .input(z.object({ requestId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const request = await db.query.communityMemberRequests.findFirst({
                where: eq(communityMemberRequests.id, input.requestId),
            });
            if (!request) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Request not found',
                });
            }
            if (request.status !== 'pending') {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'This request has already been processed',
                });
            }

            await db
                .update(communityMemberRequests)
                .set({
                    status: 'approved',
                    reviewedAt: new Date(),
                    reviewedBy: ctx.session.user.id,
                })
                .where(eq(communityMemberRequests.id, input.requestId));

            const existingMembership =
                await db.query.communityMembers.findFirst({
                    where: and(
                        eq(communityMembers.userId, request.userId),
                        eq(communityMembers.communityId, request.communityId),
                    ),
                });
            if (!existingMembership) {
                await db.insert(communityMembers).values({
                    userId: request.userId,
                    communityId: request.communityId,
                    role: 'member',
                    membershipType: 'member',
                    status: 'active',
                    joinedAt: new Date(),
                    updatedAt: new Date(),
                });
            }
            return { success: true, requestId: input.requestId } as const;
        }),

    rejectRequest: authProcedure
        .input(z.object({ requestId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const request = await db.query.communityMemberRequests.findFirst({
                where: eq(communityMemberRequests.id, input.requestId),
            });
            if (!request) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Request not found',
                });
            }
            if (request.status !== 'pending') {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'This request has already been processed',
                });
            }
            await db
                .update(communityMemberRequests)
                .set({
                    status: 'rejected',
                    reviewedAt: new Date(),
                    reviewedBy: ctx.session.user.id,
                })
                .where(eq(communityMemberRequests.id, input.requestId));
            return { success: true, requestId: input.requestId } as const;
        }),

    removeUserFromCommunity: authProcedure
        .input(z.object({ communityId: z.number(), userId: z.string() }))
        .mutation(async ({ input }) => {
            const community = await db.query.communities.findFirst({
                where: eq(communities.id, input.communityId),
                with: { members: true },
            });
            if (!community) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Community not found',
                });
            }
            const targetUserMembership = community.members.find(
                (m) => m.userId === input.userId,
            );
            if (!targetUserMembership) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'User is not a member of this community',
                });
            }
            await db
                .delete(communityMembers)
                .where(
                    and(
                        eq(communityMembers.communityId, input.communityId),
                        eq(communityMembers.userId, input.userId),
                    ),
                );
            await db
                .delete(communityMemberRequests)
                .where(
                    and(
                        eq(
                            communityMemberRequests.communityId,
                            input.communityId,
                        ),
                        eq(communityMemberRequests.userId, input.userId),
                    ),
                );
            return { success: true } as const;
        }),
};
