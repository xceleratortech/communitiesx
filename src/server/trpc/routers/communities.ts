import { z } from 'zod';
import { authProcedure, publicProcedure, router } from '../trpc';
import { db } from '@/server/db';
import {
    communities,
    communityMembers,
    posts,
    communityMemberRequests,
    tags,
    communityAllowedOrgs,
    notificationPreferences,
    orgMembers,
    users,
} from '@/server/db/schema';
import {
    eq,
    and,
    desc,
    or,
    lt,
    inArray,
    sql,
    ilike,
    asc,
    gte,
    lte,
} from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { ServerPermissions } from '@/server/utils/permission';
import { PERMISSIONS } from '@/lib/permissions/permission-const';

// Helper function to check if user is SuperAdmin
function isSuperAdmin(session: any): boolean {
    return session?.user?.appRole === 'admin';
}

// Helper function to check if user has access to modify notification preferences for a community
async function hasNotificationPreferenceAccess(
    userId: string,
    communityId: number,
): Promise<boolean> {
    // Check if user is a member of the community
    const membership = await db.query.communityMembers.findFirst({
        where: and(
            eq(communityMembers.userId, userId),
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.status, 'active'),
        ),
    });

    if (membership) {
        return true;
    }

    // Check if user is org admin for this community
    const community = await db.query.communities.findFirst({
        where: eq(communities.id, communityId),
    });

    if (community?.orgId) {
        const orgAdminCheck = await db.query.orgMembers.findFirst({
            where: and(
                eq(orgMembers.userId, userId),
                eq(orgMembers.orgId, community.orgId),
                eq(orgMembers.role, 'admin'),
                eq(orgMembers.status, 'active'),
            ),
        });
        return !!orgAdminCheck;
    }

    return false;
}

export const communitiesRouter = router({
    // Search communities by name
    search: publicProcedure
        .input(
            z.object({
                search: z.string().min(1),
                limit: z.number().min(1).max(100).default(20),
                offset: z.number().default(0),
            }),
        )
        .query(async ({ ctx, input }) => {
            const { search, limit, offset } = input;

            // Check if user is SuperAdmin
            const isSuperAdminUser = isSuperAdmin(ctx.session);

            // orgId is included in the user object via selectUserFields and customSession in better-auth config
            const orgId = (ctx.session?.user as { orgId?: string })?.orgId;

            // This includes public communities and communities from their org
            let baseFilter: any;

            if (isSuperAdminUser) {
                // SuperAdmin can see ALL communities
                baseFilter = undefined; // No filter needed
            } else if (orgId) {
                // Get all community IDs where this org is allowed
                const allowedCommunityRows = await db
                    .select({ communityId: communityAllowedOrgs.communityId })
                    .from(communityAllowedOrgs)
                    .where(eq(communityAllowedOrgs.orgId, orgId));
                const allowedCommunityIds = allowedCommunityRows.map(
                    (row) => row.communityId,
                );

                // Show communities that are: public OR belong to user's org OR are explicitly allowed for user's org
                baseFilter = or(
                    eq(communities.type, 'public'), // Public communities
                    eq(communities.orgId, orgId), // User's org communities
                    allowedCommunityIds.length > 0
                        ? inArray(communities.id, allowedCommunityIds)
                        : sql`false`, // Explicitly allowed communities
                );
            } else {
                // If no orgId, only show public communities
                baseFilter = eq(communities.type, 'public');
            }

            const searchTerm = `%${search.toLowerCase()}%`;
            const searchFilter = ilike(communities.name, searchTerm);

            // Get total count for pagination
            const totalCountResult = await db
                .select({ count: sql<number>`count(*)` })
                .from(communities)
                .where(
                    isSuperAdminUser
                        ? searchFilter
                        : and(baseFilter, searchFilter),
                );

            const totalCount = totalCountResult[0]?.count || 0;

            // Fetch paginated results
            const searchResults = await db.query.communities.findMany({
                where: isSuperAdminUser
                    ? searchFilter
                    : and(baseFilter, searchFilter),
                with: {
                    members: true,
                    posts: {
                        where: eq(posts.isDeleted, false),
                    },
                    creator: {
                        columns: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy: desc(communities.id),
                limit: limit,
                offset: offset,
            });

            // Check if there are more results
            const hasNextPage = offset + limit < totalCount;

            return {
                items: searchResults,
                totalCount,
                hasNextPage,
            };
        }),

    getAll: publicProcedure
        .input(
            z
                .object({
                    limit: z.number().min(1).max(100).default(6),
                    cursor: z.number().optional(), // ID of the last item
                })
                .optional(),
        )
        .query(async ({ ctx, input }) => {
            const limit = input?.limit ?? 6;
            const cursor = input?.cursor;

            // Check if user is SuperAdmin
            const isSuperAdminUser = isSuperAdmin(ctx.session);

            // orgId is included in the user object via selectUserFields and customSession in better-auth config
            const orgId = (ctx.session?.user as { orgId?: string })?.orgId;

            // If not SuperAdmin and no orgId, return empty
            if (!isSuperAdmin && !orgId) {
                return { items: [], nextCursor: undefined };
            }

            let filter: any;

            if (isSuperAdminUser) {
                // SuperAdmin can see ALL communities
                filter = undefined; // No filter needed
            } else if (orgId) {
                // Get all community IDs where this org is allowed
                const allowedCommunityRows = await db
                    .select({ communityId: communityAllowedOrgs.communityId })
                    .from(communityAllowedOrgs)
                    .where(eq(communityAllowedOrgs.orgId, orgId));
                const allowedCommunityIds = allowedCommunityRows.map(
                    (row) => row.communityId,
                );

                // Compose filter: orgId match OR allowed orgs
                filter = or(
                    eq(communities.orgId, orgId),
                    allowedCommunityIds.length > 0
                        ? inArray(communities.id, allowedCommunityIds)
                        : sql`false`,
                );
            } else {
                // This should never happen due to the check above, but TypeScript needs this
                return { items: [], nextCursor: undefined };
            }

            let query = db.query.communities;

            // If cursor is provided, fetch items after the cursor
            if (cursor) {
                const allCommunities = await query.findMany({
                    where: isSuperAdminUser
                        ? lt(communities.id, cursor)
                        : and(filter, lt(communities.id, cursor)),
                    with: {
                        members: true,
                        posts: {
                            where: eq(posts.isDeleted, false),
                        },
                        creator: {
                            columns: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                    orderBy: desc(communities.id),
                    limit,
                });

                const nextCursor =
                    allCommunities.length === limit
                        ? allCommunities[allCommunities.length - 1]?.id
                        : undefined;

                return {
                    items: allCommunities,
                    nextCursor,
                };
            } else {
                // First page
                const allCommunities = await query.findMany({
                    where: isSuperAdminUser ? undefined : filter,
                    with: {
                        posts: {
                            where: eq(posts.isDeleted, false),
                        },
                        members: true,
                        creator: {
                            columns: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                    orderBy: desc(communities.id),
                    limit,
                });

                const nextCursor =
                    allCommunities.length === limit
                        ? allCommunities[allCommunities.length - 1]?.id
                        : undefined;

                return {
                    items: allCommunities,
                    nextCursor,
                };
            }
        }),

    getById: publicProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input, ctx }) => {
            try {
                const community = await db.query.communities.findFirst({
                    where: eq(communities.id, input.id),
                    with: {
                        members: {
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
                        },
                        posts: {
                            where: eq(posts.isDeleted, false),
                        },
                        creator: {
                            columns: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                        allowedOrgs: {
                            with: {
                                organization: true,
                            },
                        },
                        tags: true,
                    },
                });

                if (!community) {
                    return null;
                }

                // If the community is private, check if the user has access
                if (community.type === 'private' && ctx.session?.user) {
                    const userId = ctx.session.user.id;

                    // Check if user is a member
                    const membership = community.members.find(
                        (m) => m.userId === userId && m.status === 'active',
                    );

                    // If user is not a member, return the community without posts
                    if (!membership) {
                        return {
                            ...community,
                            posts: [],
                        };
                    }
                } else if (community.type === 'private' && !ctx.session?.user) {
                    // If community is private and user is not logged in, hide posts
                    return {
                        ...community,
                        posts: [],
                    };
                }

                // For public communities: restrict posts to the viewer's org
                if (community.type === 'public') {
                    const viewerOrgId = (ctx.session?.user as any)?.orgId;
                    if (!viewerOrgId) {
                        // If user is not logged in or has no org, do not show any posts
                        return {
                            ...community,
                            posts: [],
                        };
                    }
                }

                // Load posts with authors and tags (include org filter for public communities)
                const viewerOrgId = (ctx.session?.user as any)?.orgId;
                const orgFilter =
                    community.type === 'public' && viewerOrgId
                        ? [eq(posts.orgId, viewerOrgId)]
                        : [];

                const postsWithAuthors = await db.query.posts.findMany({
                    where: and(
                        eq(posts.communityId, community.id),
                        eq(posts.isDeleted, false),
                        ...orgFilter,
                    ),
                    with: {
                        author: true,
                        postTags: {
                            with: {
                                tag: true,
                            },
                        },
                        attachments: true,
                    },
                    orderBy: desc(posts.createdAt),
                });

                // Transform posts to include tags array
                const postsWithTags = postsWithAuthors.map((post) => ({
                    ...post,
                    tags: post.postTags.map((pt) => pt.tag),
                }));

                //Load the tags associated with the community
                const communityTags = await db.query.tags.findMany({
                    where: eq(tags.communityId, community.id),
                    orderBy: desc(tags.createdAt),
                });

                // Return the community with posts that include author information and tags
                return {
                    ...community,
                    posts: postsWithTags,
                    tags: communityTags,
                };
            } catch (error) {
                console.error(
                    `Error fetching community with ID ${input.id}:`,
                    error,
                );
                return null;
            }
        }),

    getBySlug: publicProcedure
        .input(
            z.object({
                slug: z.string(),
                sort: z
                    .enum(['latest', 'oldest', 'most-commented'])
                    .default('latest'),
                dateFilter: z
                    .object({
                        type: z.enum([
                            'all',
                            'today',
                            'week',
                            'month',
                            'custom',
                        ]),
                        startDate: z.date().optional(),
                        endDate: z.date().optional(),
                    })
                    .optional(),
            }),
        )
        .query(async ({ input, ctx }) => {
            try {
                const { slug, sort, dateFilter } = input;
                const community = await db.query.communities.findFirst({
                    where: eq(communities.slug, slug),
                    with: {
                        members: {
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
                        },
                        posts: {
                            where: eq(posts.isDeleted, false),
                        },
                        creator: {
                            columns: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                        allowedOrgs: {
                            with: {
                                organization: true,
                            },
                        },
                        tags: true,
                    },
                });

                if (!community) {
                    return null;
                }

                // If the community is private, check if the user has access
                if (community.type === 'private' && ctx.session?.user) {
                    const userId = ctx.session.user.id;
                    const userOrgId = (ctx.session.user as any).orgId;

                    // Check if user is SuperAdmin first
                    const user = await db.query.users.findFirst({
                        where: eq(users.id, userId),
                        columns: {
                            appRole: true,
                            role: true,
                        },
                    });

                    // SuperAdmin can access all communities
                    if (user?.appRole === 'admin') {
                        // Continue to load posts normally
                    } else {
                        // Check if user is a member
                        const membership = community.members.find(
                            (m) => m.userId === userId && m.status === 'active',
                        );

                        // --- ORG ADMIN OVERRIDE ---
                        // Check if user is org admin for this community
                        let isOrgAdminForCommunity = false;
                        if (
                            userOrgId &&
                            community.orgId &&
                            userOrgId === community.orgId
                        ) {
                            isOrgAdminForCommunity = user?.role === 'admin';
                        }

                        // If user is not a member and not org admin, hide posts
                        if (!membership && !isOrgAdminForCommunity) {
                            return {
                                ...community,
                                posts: [],
                            };
                        }
                    }
                } else if (community.type === 'private' && !ctx.session?.user) {
                    // If community is private and user is not logged in, hide posts
                    return {
                        ...community,
                        posts: [],
                    };
                }

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

                // Build date filter conditions
                let dateFilterConditions = [];
                if (dateFilter && dateFilter.type !== 'all') {
                    const now = new Date();
                    let startDate: Date | undefined;
                    let endDate: Date | undefined;

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
                            endDate = now;
                            break;
                        case 'month':
                            startDate = new Date(
                                now.getTime() - 30 * 24 * 60 * 60 * 1000,
                            );
                            endDate = now;
                            break;
                        case 'custom':
                            startDate = dateFilter.startDate;
                            endDate = dateFilter.endDate;
                            // Ensure start date is at the beginning of the day
                            if (startDate) {
                                startDate = new Date(
                                    startDate.getFullYear(),
                                    startDate.getMonth(),
                                    startDate.getDate(),
                                    0,
                                    0,
                                    0,
                                    0,
                                );
                            }
                            // Ensure end date includes the full day
                            if (endDate) {
                                endDate = new Date(
                                    endDate.getFullYear(),
                                    endDate.getMonth(),
                                    endDate.getDate(),
                                    23,
                                    59,
                                    59,
                                    999,
                                );
                            }
                            break;
                    }

                    if (startDate) {
                        dateFilterConditions.push(
                            gte(posts.createdAt, startDate),
                        );
                    }
                    if (endDate) {
                        dateFilterConditions.push(
                            lte(posts.createdAt, endDate),
                        );
                    }
                }

                // For public communities: restrict posts to the viewer's org
                if (community.type === 'public') {
                    const viewerOrgId = (ctx.session?.user as any)?.orgId;
                    if (!viewerOrgId) {
                        // If user is not logged in or has no org, do not show any posts
                        return {
                            ...community,
                            orgId: community.orgId,
                            posts: [],
                        };
                    }
                }

                const viewerOrgId = (ctx.session?.user as any)?.orgId;
                const orgFilter =
                    community.type === 'public' && viewerOrgId
                        ? [eq(posts.orgId, viewerOrgId)]
                        : [];

                // Load posts with authors, tags, and comments (include org filter for public communities)
                const postsWithAuthors = await db.query.posts.findMany({
                    where: and(
                        eq(posts.communityId, community.id),
                        eq(posts.isDeleted, false),
                        ...dateFilterConditions,
                        ...orgFilter,
                    ),
                    with: {
                        author: true,
                        postTags: {
                            with: {
                                tag: true,
                            },
                        },
                        comments: true, // <-- include comments
                        attachments: true,
                    },
                    orderBy: orderByClause,
                });

                // Transform posts to include tags array and comments array
                const postsWithTags = postsWithAuthors.map((post) => ({
                    ...post,
                    tags: post.postTags.map((pt) => pt.tag),
                    comments: post.comments?.filter((c) => !c.isDeleted) || [],
                }));

                // Return the community with posts that include author information and tags
                return {
                    ...community,
                    orgId: community.orgId, // <-- add this line
                    posts: postsWithTags,
                };
            } catch (error) {
                console.error(
                    `Error fetching community with slug ${input.slug}:`,
                    error,
                );
                return null;
            }
        }),

    joinCommunity: authProcedure
        .input(z.object({ communityId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            try {
                // Check if the community exists
                const community = await db.query.communities.findFirst({
                    where: eq(communities.id, input.communityId),
                });

                if (!community) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Community not found',
                    });
                }

                // Check if the user is already a member
                const existingMembership =
                    await db.query.communityMembers.findFirst({
                        where: and(
                            eq(communityMembers.userId, ctx.session.user.id),
                            eq(communityMembers.communityId, input.communityId),
                        ),
                    });

                if (existingMembership) {
                    if (existingMembership.membershipType === 'member') {
                        throw new TRPCError({
                            code: 'BAD_REQUEST',
                            message:
                                'You are already a member of this community',
                        });
                    }

                    // Not a member: ensure a join request exists (no follower upgrade)
                    const existingRequest =
                        await db.query.communityMemberRequests.findFirst({
                            where: and(
                                eq(
                                    communityMemberRequests.userId,
                                    ctx.session.user.id,
                                ),
                                eq(
                                    communityMemberRequests.communityId,
                                    input.communityId,
                                ),
                                eq(communityMemberRequests.requestType, 'join'),
                                eq(communityMemberRequests.status, 'pending'),
                            ),
                        });

                    if (existingRequest) {
                        throw new TRPCError({
                            code: 'BAD_REQUEST',
                            message:
                                'You already have a pending request to join this community',
                        });
                    }

                    const [newRequest] = await db
                        .insert(communityMemberRequests)
                        .values({
                            userId: ctx.session.user.id,
                            communityId: input.communityId,
                            requestType: 'join',
                            status: 'pending',
                            requestedAt: new Date(),
                        })
                        .returning();

                    return {
                        status: 'pending',
                        request: newRequest,
                    };
                }

                // For public communities, create a new membership directly
                if (community.type === 'public') {
                    const [newMembership] = await db
                        .insert(communityMembers)
                        .values({
                            userId: ctx.session.user.id,
                            communityId: input.communityId,
                            role: 'member',
                            membershipType: 'member',
                            status: 'active',
                            joinedAt: new Date(),
                            updatedAt: new Date(),
                        })
                        .returning();

                    return {
                        status: 'approved',
                        membership: newMembership,
                    };
                } else {
                    // For private communities, check if there's already a pending request
                    const existingRequest =
                        await db.query.communityMemberRequests.findFirst({
                            where: and(
                                eq(
                                    communityMemberRequests.userId,
                                    ctx.session.user.id,
                                ),
                                eq(
                                    communityMemberRequests.communityId,
                                    input.communityId,
                                ),
                                eq(communityMemberRequests.requestType, 'join'),
                                eq(communityMemberRequests.status, 'pending'),
                            ),
                        });

                    if (existingRequest) {
                        throw new TRPCError({
                            code: 'BAD_REQUEST',
                            message:
                                'You already have a pending request to join this community',
                        });
                    }

                    // Create a new join request
                    const [newRequest] = await db
                        .insert(communityMemberRequests)
                        .values({
                            userId: ctx.session.user.id,
                            communityId: input.communityId,
                            requestType: 'join',
                            status: 'pending',
                            requestedAt: new Date(),
                        })
                        .returning();

                    return {
                        status: 'pending',
                        request: newRequest,
                    };
                }
            } catch (error) {
                if (error instanceof TRPCError) {
                    throw error;
                }
                console.error('Error joining community:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to join community',
                });
            }
        }),

    leaveCommunity: authProcedure
        .input(z.object({ communityId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            try {
                // Check if the user is a member of the community
                const membership = await db.query.communityMembers.findFirst({
                    where: and(
                        eq(communityMembers.userId, ctx.session.user.id),
                        eq(communityMembers.communityId, input.communityId),
                        eq(communityMembers.membershipType, 'member'),
                    ),
                });

                if (!membership) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'You are not a member of this community',
                    });
                }

                // Check if the user is the admin (creator) of the community
                const community = await db.query.communities.findFirst({
                    where: eq(communities.id, input.communityId),
                });

                if (community && community.createdBy === ctx.session.user.id) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'Community creators cannot leave their own community',
                    });
                }

                // Delete the membership
                await db
                    .delete(communityMembers)
                    .where(
                        and(
                            eq(communityMembers.userId, ctx.session.user.id),
                            eq(communityMembers.communityId, input.communityId),
                        ),
                    );

                return { success: true };
            } catch (error) {
                if (error instanceof TRPCError) {
                    throw error;
                }
                console.error('Error leaving community:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to leave community',
                });
            }
        }),

    // Get pending membership requests for a community (admin/moderator only)
    getPendingRequests: authProcedure
        .input(z.object({ communityId: z.number() }))
        .query(async ({ input, ctx }) => {
            try {
                // Check if user is an admin or moderator of the community
                const permission = await ServerPermissions.fromUserId(
                    ctx.session.user.id,
                );
                const canManageMembers =
                    await permission.checkCommunityPermission(
                        input.communityId.toString(),
                        PERMISSIONS.MANAGE_COMMUNITY_MEMBERS,
                    );

                if (!canManageMembers) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You dont have access to view pending requests',
                    });
                }
                // Get all pending requests for the community
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
            } catch (error) {
                console.error('Error fetching pending requests:', error);
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch pending requests',
                });
            }
        }),

    // Approve a membership request (admin/moderator only)
    approveRequest: authProcedure
        .input(z.object({ requestId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            try {
                // Get the request details
                const request =
                    await db.query.communityMemberRequests.findFirst({
                        where: eq(communityMemberRequests.id, input.requestId),
                    });

                if (!request) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Request not found',
                    });
                }

                const permission = await ServerPermissions.fromUserId(
                    ctx.session.user.id,
                );
                const canManageMembers =
                    await permission.checkCommunityPermission(
                        request.communityId.toString(),
                        PERMISSIONS.MANAGE_COMMUNITY_MEMBERS,
                    );

                if (!canManageMembers) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'You dont have access to approve requests',
                    });
                }

                // Check if the request is still pending
                if (request.status !== 'pending') {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'This request has already been processed',
                    });
                }

                // Update the request status
                await db
                    .update(communityMemberRequests)
                    .set({
                        status: 'approved',
                        reviewedAt: new Date(),
                        reviewedBy: ctx.session.user.id,
                    })
                    .where(eq(communityMemberRequests.id, input.requestId));

                // Check if the user already has a relationship with this community
                const existingMembership =
                    await db.query.communityMembers.findFirst({
                        where: and(
                            eq(communityMembers.userId, request.userId),
                            eq(
                                communityMembers.communityId,
                                request.communityId,
                            ),
                        ),
                    });

                if (!existingMembership) {
                    // Create a new membership
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

                return { success: true, requestId: input.requestId };
            } catch (error) {
                console.error('Error approving request:', error);
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to approve request',
                });
            }
        }),

    // Reject a membership request (admin/moderator only)
    rejectRequest: authProcedure
        .input(z.object({ requestId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            try {
                // Get the request details
                const request =
                    await db.query.communityMemberRequests.findFirst({
                        where: eq(communityMemberRequests.id, input.requestId),
                    });

                if (!request) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Request not found',
                    });
                }

                const permission = await ServerPermissions.fromUserId(
                    ctx.session.user.id,
                );
                const canManageMembers =
                    await permission.checkCommunityPermission(
                        request.communityId.toString(),
                        PERMISSIONS.MANAGE_COMMUNITY_MEMBERS,
                    );

                if (!canManageMembers) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'You dont have access to reject requests',
                    });
                }

                // Check if the request is still pending
                if (request.status !== 'pending') {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'This request has already been processed',
                    });
                }

                // Update the request status
                await db
                    .update(communityMemberRequests)
                    .set({
                        status: 'rejected',
                        reviewedAt: new Date(),
                        reviewedBy: ctx.session.user.id,
                    })
                    .where(eq(communityMemberRequests.id, input.requestId));

                return { success: true, requestId: input.requestId };
            } catch (error) {
                console.error('Error rejecting request:', error);
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to reject request',
                });
            }
        }),

    // Assign moderator role to a community member (admin only)
    assignModerator: authProcedure
        .input(
            z.object({
                communityId: z.number(),
                userId: z.string(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const permission = await ServerPermissions.fromUserId(
                    ctx.session.user.id,
                );
                const canManageMembers =
                    await permission.checkCommunityPermission(
                        input.communityId.toString(),
                        PERMISSIONS.MANAGE_COMMUNITY_MEMBERS,
                    );

                if (!canManageMembers) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'You dont have access to assign moderator',
                    });
                }

                // Check if the target user is a member of the community
                const targetMembership =
                    await db.query.communityMembers.findFirst({
                        where: and(
                            eq(communityMembers.userId, input.userId),
                            eq(communityMembers.communityId, input.communityId),
                            eq(communityMembers.membershipType, 'member'),
                        ),
                    });

                if (!targetMembership) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message:
                            'The user must be a member of the community to be assigned as moderator',
                    });
                }

                // Check if the user is already a moderator or admin
                if (targetMembership.role === 'moderator') {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'This user is already a moderator',
                    });
                }

                if (targetMembership.role === 'admin') {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message:
                            'This user is the community admin and cannot be assigned as moderator',
                    });
                }

                // Update the user's role to moderator
                const [updatedMembership] = await db
                    .update(communityMembers)
                    .set({
                        role: 'moderator',
                        updatedAt: new Date(),
                    })
                    .where(
                        and(
                            eq(communityMembers.userId, input.userId),
                            eq(communityMembers.communityId, input.communityId),
                        ),
                    )
                    .returning();

                return updatedMembership;
            } catch (error) {
                console.error('Error assigning moderator:', error);
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to assign moderator role',
                });
            }
        }),

    // Assign admin role to a community member (super admin, org admin, or community admin only)
    assignAdmin: authProcedure
        .input(
            z.object({
                communityId: z.number(),
                userId: z.string(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            try {
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
                        message: 'You dont have access to assign admin role',
                    });
                }

                // Check if the target user is a member of the community
                const targetMembership =
                    await db.query.communityMembers.findFirst({
                        where: and(
                            eq(communityMembers.userId, input.userId),
                            eq(communityMembers.communityId, input.communityId),
                            eq(communityMembers.membershipType, 'member'),
                        ),
                    });

                if (!targetMembership) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message:
                            'The user must be a member of the community to be assigned as admin',
                    });
                }

                // Check if the user is already an admin
                if (targetMembership.role === 'admin') {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'This user is already a community admin',
                    });
                }

                // Update the user's role to admin
                const [updatedMembership] = await db
                    .update(communityMembers)
                    .set({
                        role: 'admin',
                        updatedAt: new Date(),
                    })
                    .where(
                        and(
                            eq(communityMembers.userId, input.userId),
                            eq(communityMembers.communityId, input.communityId),
                        ),
                    )
                    .returning();

                return updatedMembership;
            } catch (error) {
                console.error('Error assigning admin:', error);
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to assign admin role',
                });
            }
        }),

    // Remove moderator role from a community member (admin only)
    removeModerator: authProcedure
        .input(
            z.object({
                communityId: z.number(),
                userId: z.string(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const permission = await ServerPermissions.fromUserId(
                    ctx.session.user.id,
                );
                const canManageMembers =
                    await permission.checkCommunityPermission(
                        input.communityId.toString(),
                        PERMISSIONS.MANAGE_COMMUNITY_MEMBERS,
                    );

                if (!canManageMembers) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'You dont have access to remove moderator',
                    });
                }

                // Check if the target user is a moderator of the community
                const targetMembership =
                    await db.query.communityMembers.findFirst({
                        where: and(
                            eq(communityMembers.userId, input.userId),
                            eq(communityMembers.communityId, input.communityId),
                            eq(communityMembers.role, 'moderator'),
                        ),
                    });

                if (!targetMembership) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message:
                            'This user is not a moderator of the community',
                    });
                }

                // Update the user's role to member
                const [updatedMembership] = await db
                    .update(communityMembers)
                    .set({
                        role: 'member',
                        updatedAt: new Date(),
                    })
                    .where(
                        and(
                            eq(communityMembers.userId, input.userId),
                            eq(communityMembers.communityId, input.communityId),
                        ),
                    )
                    .returning();

                return updatedMembership;
            } catch (error) {
                console.error('Error removing moderator:', error);
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to remove moderator role',
                });
            }
        }),

    // Remove admin role from a community member (super admin, org admin, or community admin only - requires REMOVE_COMMUNITY_ADMIN permission)
    removeAdmin: authProcedure
        .input(
            z.object({
                communityId: z.number(),
                userId: z.string(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const permission = await ServerPermissions.fromUserId(
                    ctx.session.user.id,
                );
                const canRemoveAdmin =
                    await permission.checkCommunityPermission(
                        input.communityId.toString(),
                        PERMISSIONS.REMOVE_COMMUNITY_ADMIN,
                    );

                if (!canRemoveAdmin) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'You dont have access to remove admin role',
                    });
                }

                // Check if the target user is an admin of the community
                const targetMembership =
                    await db.query.communityMembers.findFirst({
                        where: and(
                            eq(communityMembers.userId, input.userId),
                            eq(communityMembers.communityId, input.communityId),
                            eq(communityMembers.role, 'admin'),
                        ),
                    });

                if (!targetMembership) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'This user is not an admin of the community',
                    });
                }

                // Don't allow removing the community creator's admin role
                const community = await db.query.communities.findFirst({
                    where: eq(communities.id, input.communityId),
                    columns: { createdBy: true },
                });

                if (community?.createdBy === input.userId) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'Cannot remove admin role from the community creator',
                    });
                }

                // Update the user's role to member
                const [updatedMembership] = await db
                    .update(communityMembers)
                    .set({
                        role: 'member',
                        updatedAt: new Date(),
                    })
                    .where(
                        and(
                            eq(communityMembers.userId, input.userId),
                            eq(communityMembers.communityId, input.communityId),
                        ),
                    )
                    .returning();

                return updatedMembership;
            } catch (error) {
                console.error('Error removing admin:', error);
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to remove admin role',
                });
            }
        }),

    // Get user's pending requests for a community
    getUserPendingRequests: authProcedure
        .input(z.object({ communityId: z.number() }))
        .query(async ({ input, ctx }) => {
            try {
                // Get all pending requests for the user in this community
                const pendingRequests =
                    await db.query.communityMemberRequests.findMany({
                        where: and(
                            eq(
                                communityMemberRequests.communityId,
                                input.communityId,
                            ),
                            eq(
                                communityMemberRequests.userId,
                                ctx.session.user.id,
                            ),
                            eq(communityMemberRequests.status, 'pending'),
                        ),
                    });

                return pendingRequests;
            } catch (error) {
                console.error('Error fetching user pending requests:', error);
                return [];
            }
        }),

    // Cancel user's own pending request
    cancelPendingRequest: authProcedure
        .input(z.object({ requestId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            try {
                // Get the request details
                const request =
                    await db.query.communityMemberRequests.findFirst({
                        where: eq(communityMemberRequests.id, input.requestId),
                    });

                if (!request) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Request not found',
                    });
                }

                // Check if the request belongs to the current user
                if (request.userId !== ctx.session.user.id) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'You can only cancel your own requests',
                    });
                }

                // Check if the request is still pending
                if (request.status !== 'pending') {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'This request has already been processed',
                    });
                }

                // Delete the request
                await db
                    .delete(communityMemberRequests)
                    .where(eq(communityMemberRequests.id, input.requestId));

                return { success: true };
            } catch (error) {
                if (error instanceof TRPCError) {
                    throw error;
                }
                console.error('Error canceling pending request:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to cancel request',
                });
            }
        }),

    getUserCommunities: authProcedure.query(async ({ ctx }) => {
        try {
            // Get all communities where the user is a member or follower
            const userMemberships = await db.query.communityMembers.findMany({
                where: and(
                    eq(communityMembers.userId, ctx.session.user.id),
                    eq(communityMembers.status, 'active'),
                ),
                with: {
                    community: true,
                },
            });

            // Return communities with role information
            const userCommunities = userMemberships.map((membership) => ({
                ...membership.community,
                userRole: membership.role,
            }));

            return userCommunities;
        } catch (error) {
            console.error('Error fetching user communities:', error);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch user communities',
            });
        }
    }),

    // Get communities where user can post (member, org admin, or super admin)
    getUserPostableCommunities: authProcedure.query(async ({ ctx }) => {
        try {
            const userId = ctx.session.user.id;
            const user = await db.query.users.findFirst({
                where: eq(users.id, userId),
            });

            if (!user) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'User not found',
                });
            }

            // Get communities where user is a member with posting permissions
            const userMemberships = await db.query.communityMembers.findMany({
                where: and(
                    eq(communityMembers.userId, userId),
                    eq(communityMembers.status, 'active'),
                    eq(communityMembers.membershipType, 'member'), // Only members can post
                ),
                with: {
                    community: true,
                },
            });

            // Get communities from user's organization (if user is org admin)
            let orgCommunities: (typeof communities.$inferSelect)[] = [];
            if (user.orgId && user.role === 'admin') {
                orgCommunities = await db.query.communities.findMany({
                    where: eq(communities.orgId, user.orgId),
                });
            }

            // Get all communities (if user is super admin)
            let allCommunities: (typeof communities.$inferSelect)[] = [];
            if (user.role === 'admin' && !user.orgId) {
                // This is a super admin
                allCommunities = await db.query.communities.findMany();
            }

            // Get organization data for all communities
            const orgIds = new Set<string>();
            userMemberships.forEach(
                (m) => m.community.orgId && orgIds.add(m.community.orgId),
            );
            orgCommunities.forEach((c) => c.orgId && orgIds.add(c.orgId));
            allCommunities.forEach((c) => c.orgId && orgIds.add(c.orgId));

            const orgs =
                orgIds.size > 0
                    ? await db.query.orgs.findMany({
                          where: (orgs, { inArray }) =>
                              inArray(orgs.id, Array.from(orgIds)),
                      })
                    : [];

            const orgMap = new Map(orgs.map((org) => [org.id, org]));

            // Combine and deduplicate communities
            const memberCommunities = userMemberships.map((membership) => ({
                ...membership.community,
                userRole: membership.role,
                canPost: true,
                reason: 'member' as const,
                organization: membership.community.orgId
                    ? orgMap.get(membership.community.orgId)
                    : null,
            }));

            const orgAdminCommunities = orgCommunities
                .filter(
                    (community) =>
                        !memberCommunities.some(
                            (member) => member.id === community.id,
                        ),
                )
                .map((community) => ({
                    ...community,
                    userRole: 'admin',
                    canPost: true,
                    reason: 'org_admin' as const,
                    organization: community.orgId
                        ? orgMap.get(community.orgId)
                        : null,
                }));

            const superAdminCommunities = allCommunities
                .filter(
                    (community) =>
                        !memberCommunities.some(
                            (member) => member.id === community.id,
                        ) &&
                        !orgAdminCommunities.some(
                            (orgCommunity) => orgCommunity.id === community.id,
                        ),
                )
                .map((community) => ({
                    ...community,
                    userRole: 'admin',
                    canPost: true,
                    reason: 'super_admin' as const,
                    organization: community.orgId
                        ? orgMap.get(community.orgId)
                        : null,
                }));

            return [
                ...memberCommunities,
                ...orgAdminCommunities,
                ...superAdminCommunities,
            ];
        } catch (error) {
            console.error('Error fetching postable communities:', error);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch postable communities',
            });
        }
    }),

    // Remove a user from a community (with role-based security checks)
    removeUserFromCommunity: authProcedure
        .input(
            z.object({
                communityId: z.number(),
                userId: z.string(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            try {
                // Check if community exists
                const community = await db.query.communities.findFirst({
                    where: eq(communities.id, input.communityId),
                    with: {
                        members: true,
                    },
                });

                if (!community) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Community not found',
                    });
                }

                const permission = await ServerPermissions.fromUserId(
                    ctx.session.user.id,
                );
                const canManageMembers =
                    await permission.checkCommunityPermission(
                        input.communityId.toString(),
                        PERMISSIONS.MANAGE_COMMUNITY_MEMBERS,
                    );

                if (!canManageMembers) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You dont have access to remove user from community',
                    });
                }

                // Check if the target user is a member of the community
                const targetUserMembership = community.members.find(
                    (m) => m.userId === input.userId,
                );

                if (!targetUserMembership) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'User is not a member of this community',
                    });
                }

                // Check if user is trying to remove the community creator
                const isRemovingCreator = community.createdBy === input.userId;

                if (isRemovingCreator) {
                    // Check if user has permission to remove community creator
                    const canRemoveCreator =
                        await permission.checkCommunityPermission(
                            input.communityId.toString(),
                            PERMISSIONS.REMOVE_COMMUNITY_CREATOR,
                        );

                    if (!canRemoveCreator) {
                        throw new TRPCError({
                            code: 'FORBIDDEN',
                            message:
                                'Cannot remove the community creator. Only super admins, organization admins, or community admins can perform this action.',
                        });
                    }
                }

                // Check if user is trying to remove an admin (role-based protection)
                if (targetUserMembership.role === 'admin') {
                    // Only super admins, org admins, and community admins can remove other admins
                    const canRemoveAdmin =
                        await permission.checkCommunityPermission(
                            input.communityId.toString(),
                            PERMISSIONS.REMOVE_COMMUNITY_ADMIN,
                        );

                    if (!canRemoveAdmin) {
                        throw new TRPCError({
                            code: 'FORBIDDEN',
                            message:
                                'Cannot remove admin users. Only super admins, organization admins, or community admins can perform this action.',
                        });
                    }
                }

                // Check if user is trying to remove a moderator (role-based protection)
                if (targetUserMembership.role === 'moderator') {
                    // Get current user's membership to check their role
                    const currentUserMembership = community.members.find(
                        (m) => m.userId === ctx.session.user.id,
                    );

                    // Only admins can remove moderators
                    if (currentUserMembership?.role !== 'admin') {
                        throw new TRPCError({
                            code: 'FORBIDDEN',
                            message:
                                'Cannot remove moderator users. Only community admins can perform this action.',
                        });
                    }
                }

                // Remove the user from the community
                await db
                    .delete(communityMembers)
                    .where(
                        and(
                            eq(communityMembers.communityId, input.communityId),
                            eq(communityMembers.userId, input.userId),
                        ),
                    );

                // Also delete any pending requests from this user
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

                return { success: true };
            } catch (error) {
                if (error instanceof TRPCError) throw error;
                console.error('Error removing user from community:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to remove user from community',
                });
            }
        }),

    createTag: authProcedure
        .input(
            z.object({
                communityId: z.number(),
                name: z.string().min(1, 'Tag name is required'),
                description: z.string().optional(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const permission = await ServerPermissions.fromUserId(
                    ctx.session.user.id,
                );
                const canCreateTag = await permission.checkCommunityPermission(
                    input.communityId.toString(),
                    PERMISSIONS.CREATE_TAG,
                );

                if (!canCreateTag) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You dont have access to create tags in this community',
                    });
                }

                // Create the tag
                const [newTag] = await db
                    .insert(tags)
                    .values({
                        name: input.name,
                        description: input.description || '',
                        communityId: input.communityId,
                        createdAt: new Date(),
                    })
                    .returning();

                return newTag;
            } catch (error) {
                console.error('Error creating tag:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create tag',
                });
            }
        }),

    editTag: authProcedure
        .input(
            z.object({
                tagId: z.number(),
                name: z.string().min(1, 'Tag name is required'),
                description: z.string().optional(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            try {
                // Check if the tag exists
                const tag = await db.query.tags.findFirst({
                    where: eq(tags.id, input.tagId),
                });

                if (!tag) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Tag not found',
                    });
                }

                const permission = await ServerPermissions.fromUserId(
                    ctx.session.user.id,
                );
                const canEditTag = await permission.checkCommunityPermission(
                    tag.communityId.toString(),
                    PERMISSIONS.EDIT_TAG,
                );

                if (!canEditTag) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You dont have access to edit tags in this community',
                    });
                }

                // Update the tag
                const [updatedTag] = await db
                    .update(tags)
                    .set({
                        name: input.name,
                        description: input.description || '',
                        updatedAt: new Date(),
                    })
                    .where(eq(tags.id, input.tagId))
                    .returning();

                return updatedTag;
            } catch (error) {
                console.error('Error editing tag:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to edit tag',
                });
            }
        }),

    deleteTag: authProcedure
        .input(z.object({ tagId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            try {
                // Check if the tag exists
                const tag = await db.query.tags.findFirst({
                    where: eq(tags.id, input.tagId),
                });

                if (!tag) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Tag not found',
                    });
                }

                const permission = await ServerPermissions.fromUserId(
                    ctx.session.user.id,
                );
                const canDeleteTag = await permission.checkCommunityPermission(
                    tag.communityId.toString(),
                    PERMISSIONS.EDIT_TAG,
                );

                if (!canDeleteTag) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You dont have access to delete tags in this community',
                    });
                }

                // Delete the tag
                await db.delete(tags).where(eq(tags.id, input.tagId));

                return { success: true };
            } catch (error) {
                console.error('Error deleting tag:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to delete tag',
                });
            }
        }),

    // Disable notifications for a specific community (opt-out)
    disableCommunityNotifications: authProcedure
        .input(
            z.object({
                communityId: z.number(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            try {
                // Check if user has access to modify notification preferences for this community
                const hasAccess = await hasNotificationPreferenceAccess(
                    ctx.session.user.id,
                    input.communityId,
                );

                if (!hasAccess) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'You do not have access to this community',
                    });
                }

                // Set notification preference to disabled (false)
                await db
                    .insert(notificationPreferences)
                    .values({
                        userId: ctx.session.user.id,
                        communityId: input.communityId,
                        enabled: false, // false = notifications disabled
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    })
                    .onConflictDoUpdate({
                        target: [
                            notificationPreferences.userId,
                            notificationPreferences.communityId,
                        ],
                        set: {
                            enabled: false,
                            updatedAt: new Date(),
                        },
                    });

                return { success: true };
            } catch (error) {
                console.error(
                    'Error disabling community notifications:',
                    error,
                );
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to disable notifications',
                });
            }
        }),

    // Re-enable notifications for a specific community
    enableCommunityNotifications: authProcedure
        .input(
            z.object({
                communityId: z.number(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            try {
                // Check if user has access to modify notification preferences for this community
                const hasAccess = await hasNotificationPreferenceAccess(
                    ctx.session.user.id,
                    input.communityId,
                );

                if (!hasAccess) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'You do not have access to this community',
                    });
                }

                // Set notification preference to enabled (true)
                await db
                    .insert(notificationPreferences)
                    .values({
                        userId: ctx.session.user.id,
                        communityId: input.communityId,
                        enabled: true, // true = notifications enabled
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    })
                    .onConflictDoUpdate({
                        target: [
                            notificationPreferences.userId,
                            notificationPreferences.communityId,
                        ],
                        set: {
                            enabled: true,
                            updatedAt: new Date(),
                        },
                    });

                return { success: true };
            } catch (error) {
                console.error('Error enabling community notifications:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to enable notifications',
                });
            }
        }),

    // Check if notifications are disabled for a specific community
    getCommunityNotificationStatus: authProcedure
        .input(
            z.object({
                communityId: z.number(),
            }),
        )
        .query(async ({ input, ctx }) => {
            try {
                const preference =
                    await db.query.notificationPreferences.findFirst({
                        where: and(
                            eq(
                                notificationPreferences.userId,
                                ctx.session.user.id,
                            ),
                            eq(
                                notificationPreferences.communityId,
                                input.communityId,
                            ),
                        ),
                    });

                // If no preference exists, notifications are enabled by default
                // If preference exists and enabled is false, notifications are disabled
                return {
                    notificationsDisabled: preference
                        ? !preference.enabled
                        : false,
                };
            } catch (error) {
                console.error('Error checking notification status:', error);
                return { notificationsDisabled: false };
            }
        }),

    // Get organization members who are not yet in the community
    getOrgMembersNotInCommunity: authProcedure
        .input(
            z.object({
                communityId: z.number(),
                search: z.string().optional(),
            }),
        )
        .query(async ({ input, ctx }) => {
            try {
                // Get the community to find its organization
                const community = await db.query.communities.findFirst({
                    where: eq(communities.id, input.communityId),
                    columns: { orgId: true },
                });

                if (!community?.orgId) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Community not found or has no organization',
                    });
                }

                // Check if user has permission to manage community members
                const permission = await ServerPermissions.fromUserId(
                    ctx.session.user.id,
                );
                const canManageMembers =
                    await permission.checkCommunityPermission(
                        input.communityId.toString(),
                        PERMISSIONS.MANAGE_COMMUNITY_MEMBERS,
                    );

                if (!canManageMembers) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You do not have permission to manage community members',
                    });
                }

                // Build search conditions
                let whereConditions = and(
                    eq(users.orgId, community.orgId),
                    eq(users.emailVerified, true), // Only verified users
                );

                if (input.search && input.search.trim()) {
                    const searchTerm = `%${input.search.trim()}%`;
                    whereConditions = and(
                        eq(users.orgId, community.orgId),
                        eq(users.emailVerified, true),
                        or(
                            ilike(users.name, searchTerm),
                            ilike(users.email, searchTerm),
                        ),
                    );
                }

                // Get all organization members from users table with optional search filtering
                const orgMembersList = await db.query.users.findMany({
                    where: whereConditions,
                    columns: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                });

                // Get existing community members
                const existingCommunityMembers =
                    await db.query.communityMembers.findMany({
                        where: eq(
                            communityMembers.communityId,
                            input.communityId,
                        ),
                        columns: { userId: true },
                    });

                const existingMemberIds = new Set(
                    existingCommunityMembers.map((m) => m.userId),
                );

                // Filter out users who are already in the community
                const availableMembers = orgMembersList.filter(
                    (member: (typeof orgMembersList)[number]) =>
                        !existingMemberIds.has(member.id),
                );

                return availableMembers;
            } catch (error) {
                if (error instanceof TRPCError) throw error;
                console.error(
                    'Error getting org members not in community:',
                    error,
                );
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to get organization members',
                });
            }
        }),

    // Add organization members to community (supports multiple users)
    addOrgMembersToCommunity: authProcedure
        .input(
            z.object({
                communityId: z.number(),
                users: z.array(
                    z.object({
                        userId: z.string(),
                        role: z.enum(['member', 'moderator']).default('member'),
                    }),
                ),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            try {
                // Get the community to find its organization
                const community = await db.query.communities.findFirst({
                    where: eq(communities.id, input.communityId),
                    columns: { orgId: true },
                });

                if (!community?.orgId) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Community not found or has no organization',
                    });
                }

                // Check if user has permission to manage community members
                const permission = await ServerPermissions.fromUserId(
                    ctx.session.user.id,
                );
                const canManageMembers =
                    await permission.checkCommunityPermission(
                        input.communityId.toString(),
                        PERMISSIONS.MANAGE_COMMUNITY_MEMBERS,
                    );

                if (!canManageMembers) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You do not have permission to manage community members',
                    });
                }

                // Verify all users are members of the organization
                const userIds = input.users.map((u) => u.userId);
                const orgMembers = await db.query.users.findMany({
                    where: and(
                        inArray(users.id, userIds),
                        eq(users.orgId, community.orgId),
                        eq(users.emailVerified, true),
                    ),
                    columns: { id: true },
                });

                if (orgMembers.length !== userIds.length) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message:
                            'Some users are not members of this organization',
                    });
                }

                // Check if any users are already in the community
                const existingMemberships =
                    await db.query.communityMembers.findMany({
                        where: and(
                            eq(communityMembers.communityId, input.communityId),
                            inArray(communityMembers.userId, userIds),
                        ),
                    });

                if (existingMemberships.length > 0) {
                    const existingUserIds = existingMemberships.map(
                        (m) => m.userId,
                    );
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: `Users ${existingUserIds.join(', ')} are already members of this community`,
                    });
                }

                // Add all users to community
                const now = new Date();
                const membersToAdd = input.users.map((user) => ({
                    userId: user.userId,
                    communityId: input.communityId,
                    role: user.role,
                    membershipType: 'member' as const,
                    status: 'active' as const,
                    joinedAt: now,
                    updatedAt: now,
                }));

                await db.insert(communityMembers).values(membersToAdd);

                return {
                    success: true,
                    message: `Successfully added ${input.users.length} member(s) to the community`,
                };
            } catch (error) {
                if (error instanceof TRPCError) throw error;
                console.error('Error adding org members to community:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to add users to community',
                });
            }
        }),
});
