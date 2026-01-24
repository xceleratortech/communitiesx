import { z } from 'zod';
import { authProcedure, publicProcedure } from '../trpc';
import { db } from '@/server/db';
import { TRPCError } from '@trpc/server';
import {
    communities,
    communityInvites,
    communityMembers,
    users,
    orgs,
} from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
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

            const community = await db.query.communities.findFirst({
                where: eq(communities.id, input.communityId),
                columns: { orgId: true },
            });

            if (!community) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Community not found',
                });
            }

            const [invite] = await db
                .insert(communityInvites)
                .values({
                    communityId: input.communityId,
                    code,
                    role: input.role,
                    orgId: community.orgId,
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
            return await db.transaction(async (tx) => {
                const invite = await tx.query.communityInvites.findFirst({
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

                const dbUser = await tx.query.users.findFirst({
                    where: eq(users.id, ctx.session.user.id),
                });
                const userOrgId = dbUser?.orgId ?? null;
                const targetOrgId = invite.community.orgId || null;

                if (userOrgId && targetOrgId && userOrgId !== targetOrgId) {
                    const userOrg = userOrgId
                        ? await tx.query.orgs.findFirst({
                              where: eq(orgs.id, userOrgId),
                              columns: { name: true },
                          })
                        : null;
                    const userOrgName =
                        userOrg?.name || 'your current organization';

                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: `You are already a member of ${userOrgName}. You cannot accept invitations from communities belonging to a different organization.`,
                    });
                }

                // Check if user is already a member
                const existingMembership =
                    await tx.query.communityMembers.findFirst({
                        where: and(
                            eq(communityMembers.userId, ctx.session.user.id),
                            eq(
                                communityMembers.communityId,
                                invite.communityId,
                            ),
                        ),
                    });

                // If not already a member, add them to the community
                if (!existingMembership) {
                    await tx.insert(communityMembers).values({
                        userId: ctx.session.user.id,
                        communityId: invite.communityId,
                        role: invite.role as 'member' | 'moderator' | 'admin',
                        membershipType: 'member', // Invites are for joining, not following
                        status: 'active', // Invites bypass approval process
                        joinedAt: new Date(),
                        updatedAt: new Date(),
                    });
                } else {
                    // If user is already a member but with a different role, update the role if invite role is higher
                    // Or if they're a follower, upgrade them to member
                    if (
                        existingMembership.membershipType === 'follower' ||
                        (existingMembership.role === 'member' &&
                            (invite.role === 'moderator' ||
                                invite.role === 'admin')) ||
                        (existingMembership.role === 'moderator' &&
                            invite.role === 'admin')
                    ) {
                        await tx
                            .update(communityMembers)
                            .set({
                                role: invite.role as
                                    | 'member'
                                    | 'moderator'
                                    | 'admin',
                                membershipType: 'member',
                                status: 'active',
                                updatedAt: new Date(),
                            })
                            .where(
                                and(
                                    eq(
                                        communityMembers.userId,
                                        ctx.session.user.id,
                                    ),
                                    eq(
                                        communityMembers.communityId,
                                        invite.communityId,
                                    ),
                                ),
                            );
                    }
                }

                // Mark the invite as used
                await tx
                    .update(communityInvites)
                    .set({ usedAt: new Date(), usedBy: ctx.session.user.id })
                    .where(eq(communityInvites.id, invite.id));

                return {
                    inviteUsed: true,
                    community: invite.community,
                } as const;
            });
        }),
};
