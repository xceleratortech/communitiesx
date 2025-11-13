import { z } from 'zod';
import { authProcedure, publicProcedure } from '../trpc';
import { db } from '@/server/db';
import { TRPCError } from '@trpc/server';
import { communities, communityInvites } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export const inviteProcedures = {
    createInviteLink: authProcedure
        .input(
            z.object({
                communityId: z.number(),
                role: z
                    .enum(['member', 'moderator', 'admin'])
                    .default('member'),
                expiresInDays: z.number().min(1).max(30).default(7),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            const code = crypto.randomUUID();
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

            const [invite] = await db
                .insert(communityInvites)
                .values({
                    communityId: input.communityId,
                    code,
                    role: input.role,
                    createdBy: ctx.session.user.id,
                    createdAt: new Date(),
                    expiresAt,
                })
                .returning();

            return { ...invite, inviteLink: `/communities/join/${code}` };
        }),

    getInviteInfo: publicProcedure
        .input(z.object({ inviteCode: z.string() }))
        .query(async ({ input }) => {
            const invite = await db.query.communityInvites.findFirst({
                where: eq(communityInvites.code, input.inviteCode),
                with: { community: true, organization: true },
            });
            if (!invite) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Invalid invite code',
                });
            }
            if (invite.expiresAt < new Date()) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'This invite has expired',
                });
            }
            if (invite.usedAt) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'This invite has already been used',
                });
            }
            return {
                email: invite.email || null,
                role: invite.role,
                communityName: invite.community.name,
                orgId: invite.orgId || null,
            } as const;
        }),

    joinViaInvite: authProcedure
        .input(
            z.object({
                inviteCode: z.string(),
                registration: z
                    .object({
                        name: z.string().min(1),
                        password: z.string().min(8),
                    })
                    .optional(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            const invite = await db.query.communityInvites.findFirst({
                where: eq(communityInvites.code, input.inviteCode),
                with: { community: true },
            });
            if (!invite) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Invalid invite code',
                });
            }
            if (invite.expiresAt < new Date()) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'This invite has expired',
                });
            }
            if (invite.usedAt) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'This invite has already been used',
                });
            }

            // Membership handling is done in communities router; keep minimal here
            await db
                .update(communityInvites)
                .set({ usedAt: new Date(), usedBy: ctx.session.user.id })
                .where(eq(communityInvites.id, invite.id));

            return { inviteUsed: true, community: invite.community } as const;
        }),
};
