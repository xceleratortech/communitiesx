import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { db } from '@/server/db';
import { TRPCError } from '@trpc/server';
import { eq, count, and } from 'drizzle-orm';
import { users, orgs, posts, comments } from '@/server/db/schema';

export const organizationsRouter = router({
    // Get organization details by ID
    getOrgDetails: publicProcedure
        .input(
            z.object({
                orgId: z.string(),
            }),
        )
        .query(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message:
                        'You must be logged in to view organization details',
                });
            }

            try {
                // Get organization details
                const organization = await db.query.orgs.findFirst({
                    where: eq(orgs.id, input.orgId),
                });

                if (!organization) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Organization not found',
                    });
                }

                // Count members in this organization
                const membersCount = await db
                    .select({ count: count() })
                    .from(users)
                    .where(eq(users.orgId, input.orgId));

                // Count posts from this organization
                const postsCount = await db
                    .select({ count: count() })
                    .from(posts)
                    .where(eq(posts.orgId, input.orgId));

                // Count comments from users in this organization
                const commentsCount = await db
                    .select({ count: count() })
                    .from(comments)
                    .innerJoin(users, eq(comments.authorId, users.id))
                    .where(eq(users.orgId, input.orgId));

                // Get admin users for this organization
                const adminUsers = await db.query.users.findMany({
                    where: and(
                        eq(users.orgId, input.orgId),
                        eq(users.role, 'admin'),
                    ),
                    columns: {
                        id: true,
                        name: true,
                        email: true,
                    },
                    orderBy: [users.name],
                });

                return {
                    id: organization.id,
                    name: organization.name,
                    membersCount: membersCount[0]?.count || 0,
                    postsCount: postsCount[0]?.count || 0,
                    commentsCount: commentsCount[0]?.count || 0,
                    admins: adminUsers,
                };
            } catch (error) {
                console.error('Error fetching organization details:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch organization details',
                });
            }
        }),
});
