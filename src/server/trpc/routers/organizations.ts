import { eq, count, and, like, or } from 'drizzle-orm';
import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { db } from '@/server/db';
import { TRPCError } from '@trpc/server';
import {
    users,
    orgs,
    posts,
    comments,
    communities,
    communityAllowedOrgs,
} from '@/server/db/schema';
import type { Org, OrgMember } from '@/types/models';

export const organizationsRouter = router({
    // Get organization details by ID
    getOrgDetails: publicProcedure
        .input(
            z.object({
                orgId: z.string(),
                allowCrossOrgDM: z.boolean().optional(), // Add allowCrossOrgDM
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
                const [membersResult] = await db
                    .select({ count: count() })
                    .from(users)
                    .where(eq(users.orgId, input.orgId));

                // Count posts from this organization
                const [postsResult] = await db
                    .select({ count: count() })
                    .from(posts)
                    .where(eq(posts.orgId, input.orgId));

                // Count comments from users in this organization
                const [commentsResult] = await db
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
                    slug: organization.slug,
                    createdAt: organization.createdAt,
                    membersCount: membersResult?.count || 0,
                    postsCount: postsResult?.count || 0,
                    commentsCount: commentsResult?.count || 0,
                    admins: adminUsers,
                };
            } catch (error) {
                console.error('Error fetching organization details:', error);
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch organization details',
                });
            }
        }),

    getOrganizationByUserId: publicProcedure
        .input(z.object({ userId: z.string() }))
        .query(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to view organizations',
                });
            }

            try {
                // Get the user and their orgId
                const user = await db.query.users.findFirst({
                    where: eq(users.id, input.userId),
                    columns: { orgId: true },
                });

                if (!user?.orgId) {
                    return [];
                }

                // Get the organization
                const organization = await db.query.orgs.findFirst({
                    where: eq(orgs.id, user.orgId),
                });

                if (!organization) {
                    return [];
                }

                // Count members in this organization
                const [membersResult] = await db
                    .select({ count: count() })
                    .from(users)
                    .where(eq(users.orgId, user.orgId));

                return [
                    {
                        id: organization.id,
                        name: organization.name,
                        slug: organization.slug,
                        createdAt: organization.createdAt,
                        memberCount: membersResult?.count || 0,
                    },
                ];
            } catch (error) {
                console.error('Error fetching user organizations:', error);
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch organizations',
                });
            }
        }),

    searchOrganizations: publicProcedure
        .input(
            z.object({
                userId: z.string(),
                searchTerm: z.string().min(1),
            }),
        )
        .query(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to search organizations',
                });
            }

            try {
                // Get the user and their orgId
                const user = await db.query.users.findFirst({
                    where: eq(users.id, input.userId),
                    columns: { orgId: true },
                });

                if (!user?.orgId) {
                    return [];
                }

                // Get the organization and check if it matches the search term
                const organization = await db.query.orgs.findFirst({
                    where: and(
                        eq(orgs.id, user.orgId),
                        or(
                            like(orgs.name, `%${input.searchTerm}%`),
                            like(orgs.slug, `%${input.searchTerm}%`),
                        ),
                    ),
                });

                if (!organization) {
                    return [];
                }

                // Count members in this organization
                const [membersResult] = await db
                    .select({ count: count() })
                    .from(users)
                    .where(eq(users.orgId, user.orgId));

                return [
                    {
                        id: organization.id,
                        name: organization.name,
                        slug: organization.slug,
                        createdAt: organization.createdAt,
                        memberCount: membersResult?.count || 0,
                    },
                ];
            } catch (error) {
                console.error('Error searching user organizations:', error);
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to search organizations',
                });
            }
        }),

    getOrganizationWithCommunities: publicProcedure
        .input(z.object({ slug: z.string() }))
        .query(async ({ input, ctx }) => {
            const org = await db.query.orgs.findFirst({
                where: eq(orgs.slug, input.slug),
            });
            if (!org)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Organization not found',
                });

            const orgCommunities = await db.query.communities.findMany({
                where: (communities, { inArray }) =>
                    inArray(
                        communities.id,
                        db
                            .select({
                                communityId: communityAllowedOrgs.communityId,
                            })
                            .from(communityAllowedOrgs)
                            .where(eq(communityAllowedOrgs.orgId, org.id)),
                    ),
            });

            const members = await db.query.users.findMany({
                where: eq(users.orgId, org.id),
                columns: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdAt: true,
                },
                orderBy: [users.createdAt],
            });

            return { ...org, communities: orgCommunities, members };
        }),

    deleteCommunity: publicProcedure
        .input(z.object({ communityId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            // Optionally: check permissions here
            await db
                .delete(communities)
                .where(eq(communities.id, input.communityId));
            return { success: true };
        }),

    getOrganizationsForCommunityCreate: publicProcedure
        .input(z.object({ userId: z.string() }))
        .query(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to view organizations',
                });
            }
            // Only return orgs where the user is admin
            const adminOrgs = await db.query.orgs.findMany({
                where: (orgs, { eq }) =>
                    eq(
                        orgs.id,
                        db
                            .select({ orgId: users.orgId })
                            .from(users)
                            .where(eq(users.id, input.userId)),
                    ),
            });
            // Filter by admin role
            const user = await db.query.users.findFirst({
                where: eq(users.id, input.userId),
            });
            // if (!user || user.role !== 'admin') return [];
            return adminOrgs.map((org) => ({ id: org.id, name: org.name }));
        }),

    makeOrgAdmin: publicProcedure
        .input(z.object({ orgId: z.string(), userId: z.string() }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to perform this action',
                });
            }

            // Check if the user is already an admin
            const user = await db.query.users.findFirst({
                where: and(
                    eq(users.id, input.userId),
                    eq(users.orgId, input.orgId),
                ),
            });

            if (!user) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'User not found in this organization',
                });
            }

            // Update user role to admin
            await db
                .update(users)
                .set({ role: 'admin' })
                .where(eq(users.id, input.userId));
            return { success: true, message: 'User has been made an admin' };
        }),

    removeOrgMember: publicProcedure
        .input(z.object({ orgId: z.string(), userId: z.string() }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to perform this action',
                });
            }

            // Check if the user exists in the organization
            const user = await db.query.users.findFirst({
                where: and(
                    eq(users.id, input.userId),
                    eq(users.orgId, input.orgId),
                ),
            });

            if (!user) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'User not found in this organization',
                });
            }

            // Remove the user from the organization
            await db
                .update(users)
                .set({ orgId: undefined, role: undefined })
                .where(eq(users.id, input.userId));
            return {
                success: true,
                message: 'User has been removed from the organization',
            };
        }),
});
