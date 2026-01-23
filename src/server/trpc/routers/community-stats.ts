import { z } from 'zod';
import { authProcedure, publicProcedure } from '../trpc';
import { db } from '@/server/db';
import { TRPCError } from '@trpc/server';
import {
    posts,
    users,
    communities,
    communityMembers,
    communityAllowedOrgs,
    communityInvites,
} from '@/server/db/schema';
import {
    and,
    eq,
    desc,
    count,
    isNull,
    inArray,
    or,
    ilike,
    sql,
    asc,
    gte,
    lte,
} from 'drizzle-orm';
import { isOrgAdminForCommunity } from '@/lib/utils';
import { ServerPermissions } from '@/server/utils/permission';
import { PERMISSIONS } from '@/lib/permissions/permission-const';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email';
import { createCommunityInvitationEmail } from '@/lib/email-templates';

// Helper function to check if user is SuperAdmin
function isSuperAdmin(session: any): boolean {
    return session?.user?.appRole === 'admin';
}

// Reusable helper to fetch community IDs for an organization
async function getCommunityIdsForOrg(orgId: string): Promise<number[]> {
    const orgCommunities = await db.query.communities.findMany({
        where: eq(communities.orgId, orgId),
        columns: { id: true },
    });
    return orgCommunities.map((community) => community.id);
}

export const statsProcedures = {
    // Get statistics for the community
    getStats: authProcedure.query(async ({ ctx }) => {
        try {
            // Get the user's organization
            const user = await db.query.users.findFirst({
                where: eq(users.id, ctx.session.user.id),
            });

            const orgId = user?.orgId;
            if (!orgId) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'User does not have an organization.',
                });
            }

            // Count total users in the organization
            const usersResult = await db
                .select({ count: count() })
                .from(users)
                .where(eq(users.orgId, orgId));

            const totalUsers = usersResult[0]?.count || 0;

            // Count total posts in the organization
            const postsResult = await db
                .select({ count: count() })
                .from(posts)
                .where(eq(posts.orgId, orgId));

            const totalPosts = postsResult[0]?.count || 0;

            // Count total communities in the database (global)
            const communitiesResult = await db
                .select({ count: count() })
                .from(communities);

            const totalCommunities = communitiesResult[0]?.count || 0;

            // Count communities associated with the user's organization
            // 1. Communities where orgId matches
            const orgCreatedCommunitiesResult = await db
                .select({ id: communities.id })
                .from(communities)
                .where(eq(communities.orgId, orgId));
            const orgCreatedCommunityIds = orgCreatedCommunitiesResult.map(
                (c) => c.id,
            );

            // 2. Communities where org is in communityAllowedOrgs
            const allowedCommunitiesResult = await db
                .select({ communityId: communityAllowedOrgs.communityId })
                .from(communityAllowedOrgs)
                .where(eq(communityAllowedOrgs.orgId, orgId));
            const allowedCommunityIds = allowedCommunitiesResult.map(
                (c) => c.communityId,
            );

            // Combine and dedupe
            const orgCommunityIdSet = new Set([
                ...orgCreatedCommunityIds,
                ...allowedCommunityIds,
            ]);
            const orgCommunityCount = orgCommunityIdSet.size;

            return {
                totalUsers,
                totalPosts,
                totalCommunities: orgCommunityCount,
                // totalCommunities, // global
                orgCommunityCount, // org-specific
            };
        } catch (error) {
            console.error('Error fetching statistics:', error);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch statistics',
            });
        }
    }),

    // Search relevant posts
    searchRelevantPost: authProcedure
        .input(
            z.object({
                search: z.string().min(1),
                limit: z.number().min(1).max(100).default(10),
                offset: z.number().default(0),
                sort: z
                    .enum(['latest', 'oldest', 'most-commented'])
                    .default('latest'),
                dateFilter: z
                    .object({
                        type: z
                            .enum(['all', 'today', 'week', 'month', 'custom'])
                            .default('all'),
                        startDate: z.date().optional(),
                        endDate: z.date().optional(),
                    })
                    .optional()
                    .default({ type: 'all' }),
                communityId: z.number().optional(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const { search, limit, offset, sort, dateFilter, communityId } =
                input;
            const userId = ctx.session.user.id;

            // Helper function to create date filter conditions
            const createDateFilter = () => {
                if (dateFilter.type === 'all') {
                    return undefined;
                }

                const now = new Date();
                let startDate: Date;
                let endDate: Date = now;

                switch (dateFilter.type) {
                    case 'today':
                        startDate = new Date(
                            now.getFullYear(),
                            now.getMonth(),
                            now.getDate(),
                        );
                        endDate = new Date(
                            now.getFullYear(),
                            now.getMonth(),
                            now.getDate(),
                            23,
                            59,
                            59,
                            999,
                        );
                        break;
                    case 'week':
                        startDate = new Date(
                            now.getTime() - 7 * 24 * 60 * 60 * 1000,
                        );
                        break;
                    case 'month':
                        startDate = new Date(
                            now.getTime() - 30 * 24 * 60 * 60 * 1000,
                        );
                        break;
                    case 'custom':
                        if (dateFilter.startDate && dateFilter.endDate) {
                            startDate = dateFilter.startDate;
                            endDate = dateFilter.endDate;
                        } else {
                            return undefined;
                        }
                        break;
                    default:
                        return undefined;
                }

                return and(
                    gte(posts.createdAt, startDate),
                    lte(posts.createdAt, endDate),
                );
            };

            const dateFilterCondition = createDateFilter();

            // Get user's org and communities
            const user = await db.query.users.findFirst({
                where: eq(users.id, userId),
                with: { organization: true },
            });
            const orgId = user?.orgId;
            if (!orgId) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'User does not have an organization.',
                });
            }

            const memberships = await db.query.communityMembers.findMany({
                where: and(
                    eq(communityMembers.userId, userId),
                    eq(communityMembers.status, 'active'),
                ),
            });
            const communityIds = memberships.map((m) => m.communityId);

            // --- ORG ADMIN OVERRIDE ---
            // If the user is an org admin, include all communities in their org
            let orgAdminCommunityIds: number[] = [];
            if (user?.role === 'admin' && ctx.session.user.orgId) {
                orgAdminCommunityIds = await getCommunityIdsForOrg(
                    ctx.session.user.orgId,
                );
            }

            const accessibleCommunityIds = [
                ...new Set([...communityIds, ...orgAdminCommunityIds]),
            ];

            // Build search conditions using database-level filtering
            const searchTerm = `%${search.toLowerCase()}%`;

            // If communityId is specified, filter to that community only
            let baseConditions;
            if (communityId) {
                // Verify user has access to this community
                const hasAccess =
                    accessibleCommunityIds.includes(communityId) ||
                    (user?.orgId &&
                        (await db.query.communities.findFirst({
                            where: and(
                                eq(communities.id, communityId),
                                eq(communities.orgId, user.orgId),
                            ),
                        })));
                if (!hasAccess) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'You do not have access to this community',
                    });
                }
                baseConditions = and(
                    eq(posts.isDeleted, false),
                    eq(posts.communityId, communityId),
                );
            } else {
                // Create base conditions for posts the user can see
                baseConditions = and(
                    eq(posts.isDeleted, false),
                    or(
                        // User's org posts (where community is null)
                        and(eq(posts.orgId, orgId), isNull(posts.communityId)),
                        // Community posts user has access to
                        accessibleCommunityIds.length > 0
                            ? inArray(posts.communityId, accessibleCommunityIds)
                            : sql`false`,
                    ),
                );
            }

            // Add search conditions - use database-level text search for better performance
            const searchConditions = dateFilterCondition
                ? and(
                      baseConditions,
                      or(
                          ilike(posts.title, searchTerm),
                          ilike(posts.content, searchTerm),
                      ),
                      dateFilterCondition,
                  )
                : and(
                      baseConditions,
                      or(
                          ilike(posts.title, searchTerm),
                          ilike(posts.content, searchTerm),
                      ),
                  );

            // Get total count for pagination
            const totalCountResult = await db
                .select({ count: sql<number>`count(*)` })
                .from(posts)
                .where(searchConditions);

            const totalCount = totalCountResult[0]?.count || 0;

            // Determine order by clause based on sort option
            let orderByClause;
            if (sort === 'most-commented') {
                // For comment count sorting, we need to use a subquery
                orderByClause = sql`(
                    SELECT COUNT(*) FROM comments c 
                    WHERE c.post_id = posts.id AND c.is_deleted = false
                ) DESC`;
            } else {
                orderByClause =
                    sort === 'latest'
                        ? desc(posts.createdAt)
                        : asc(posts.createdAt);
            }

            // Fetch paginated results with all necessary relations
            const searchResults = await db.query.posts.findMany({
                where: searchConditions,
                with: {
                    author: {
                        with: {
                            organization: true,
                        },
                    },
                    community: true,
                    postTags: {
                        with: {
                            tag: true,
                        },
                    },
                    attachments: true,
                    comments: true, // Include comments for count
                },
                orderBy: orderByClause,
                limit: limit,
                offset: offset,
            });

            // Transform the results to match your PostDisplay type
            const transformedPosts = searchResults.map((post) => ({
                ...post,
                // Add source information based on post type
                source: post.communityId
                    ? {
                          type: 'community' as const,
                          communityId: post.communityId,
                          reason: `from ${post.community?.name || 'your community'}`,
                      }
                    : {
                          type: 'org' as const,
                          orgId: post.orgId,
                          reason: `from ${(post.author as any)?.organization?.name || 'your organization'}`,
                      },
                // Transform tags to match PostTag type
                tags:
                    post.postTags?.map((pt) => ({
                        id: pt.tag.id,
                        name: pt.tag.name,
                        color: undefined, // Add color if you have it in your tag schema
                    })) || [],
            }));

            return {
                posts: transformedPosts,
                totalCount,
                hasNextPage: offset + limit < totalCount,
                nextOffset: offset + limit < totalCount ? offset + limit : null,
            };
        }),

    // Send email invites to users for a community (admin and moderator)
    inviteUsersByEmail: publicProcedure
        .input(
            z.object({
                communityId: z.number(),
                emails: z.array(z.string().email()),
                role: z
                    .enum(['member', 'moderator', 'admin'])
                    .default('member'),
                senderName: z.string().optional(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to send invites',
                });
            }

            // Check if user is super admin (appRole='admin')
            const isSuperAdmin = ctx.session.user.appRole === 'admin';

            // Check if the current user is an admin or moderator of the community
            const membership = await db.query.communityMembers.findFirst({
                where: and(
                    eq(communityMembers.userId, ctx.session.user.id),
                    eq(communityMembers.communityId, input.communityId),
                    or(
                        eq(communityMembers.role, 'admin'),
                        eq(communityMembers.role, 'moderator'),
                    ),
                ),
            });

            // Get community details to check org admin override
            const community = await db.query.communities.findFirst({
                where: eq(communities.id, input.communityId),
            });

            if (!community) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Community not found',
                });
            }

            // Check if user is org admin for this community
            const isOrgAdminForCommunityCheck = isOrgAdminForCommunity(
                ctx.session.user,
                community.orgId,
            );

            if (!membership && !isOrgAdminForCommunityCheck && !isSuperAdmin) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message:
                        'Only community admins, moderators, organization admins, or super admins can send invites',
                });
            }

            // Only admins can create moderator invites
            if (
                input.role === 'moderator' &&
                membership?.role !== 'admin' &&
                !isOrgAdminForCommunityCheck &&
                !isSuperAdmin
            ) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message:
                        'Only community admins, organization admins, or super admins can invite moderators',
                });
            }

            // Only users with admin management permissions can create admin invites
            if (input.role === 'admin') {
                // Super admins and org admins can always invite admin users
                if (!isOrgAdminForCommunityCheck && !isSuperAdmin) {
                    const permission = await ServerPermissions.fromUserId(
                        ctx.session.user.id,
                    );
                    const canAssignAdmin =
                        await permission.checkCommunityPermission(
                            input.communityId.toString(),
                            PERMISSIONS.ASSIGN_COMMUNITY_ADMIN,
                        );

                    if (!canAssignAdmin) {
                        throw new TRPCError({
                            code: 'FORBIDDEN',
                            message:
                                'You do not have permission to invite admin users',
                        });
                    }
                }
            }

            // Community details are already fetched above for org admin check

            // Get the current user's organization
            const currentUser = await db.query.users.findFirst({
                where: eq(users.id, ctx.session.user.id),
            });

            // Super admins can send invites without orgId, but regular users need an organization
            if (!isSuperAdmin && !currentUser?.orgId) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'User does not have an organization',
                });
            }

            try {
                const results: Array<{
                    email: string;
                    invite: typeof communityInvites.$inferSelect;
                    emailSent: boolean;
                }> = [];

                for (const email of input.emails) {
                    // Generate a unique code for this invite
                    const code = crypto.randomUUID();

                    // Calculate expiration date (7 days)
                    const expiresAt = new Date();
                    expiresAt.setDate(expiresAt.getDate() + 7);

                    // Create the invite record
                    const [invite] = await db
                        .insert(communityInvites)
                        .values({
                            communityId: input.communityId,
                            email,
                            code,
                            role: input.role,
                            orgId: currentUser?.orgId || community.orgId, // Use user's orgId or community's orgId for super admins
                            createdBy: ctx.session.user.id,
                            createdAt: new Date(),
                            expiresAt,
                        })
                        .returning();

                    // Generate the invite link
                    const inviteLink = `/communities/join/${code}`;

                    // build the request origin/host, fall back to env or localhost
                    const originHeader =
                        ctx.headers.get('origin') ||
                        (() => {
                            const proto =
                                ctx.headers.get('x-forwarded-proto') || 'https';
                            const host =
                                ctx.headers.get('x-forwarded-host') ||
                                ctx.headers.get('host');
                            return host ? `${proto}://${host}` : null;
                        })();

                    const baseUrl =
                        (originHeader && originHeader.replace(/\/$/, '')) ||
                        process.env.NEXT_PUBLIC_APP_URL ||
                        'http://localhost:3000';

                    const fullInviteLink = `${baseUrl}${inviteLink}`;

                    // Determine the sender name to use
                    const senderName = input.senderName || community.name;

                    // Use the DEFAULT_EMAIL_FROM environment variable instead of SMTP_USER
                    const defaultFrom =
                        process.env.DEFAULT_EMAIL_FROM ||
                        'noreply@communities.app';

                    // Send the email directly to the recipient
                    const invitationEmail = createCommunityInvitationEmail(
                        community.name,
                        fullInviteLink,
                        input.role,
                    );

                    const emailResult = await sendEmail({
                        to: email,
                        subject: invitationEmail.subject,
                        from: senderName
                            ? `${senderName} <${defaultFrom}>`
                            : defaultFrom,
                        html: invitationEmail.html,
                    });

                    results.push({
                        email,
                        invite,
                        emailSent: emailResult.success,
                    });
                }

                return {
                    success: true,
                    count: results.length,
                    results,
                };
            } catch (error) {
                console.error('Error sending invites:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to send invites',
                });
            }
        }),
};
