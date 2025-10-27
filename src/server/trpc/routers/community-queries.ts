import { z } from 'zod';
import { authProcedure } from '../trpc';
import { db } from '@/server/db';
import { TRPCError } from '@trpc/server';
import {
    posts,
    users,
    communities,
    communityMembers,
    comments,
    postTags,
    tags,
    attachments,
    orgs,
    polls,
    pollOptions,
    pollVotes,
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

// Define types for the responses based on schema
type UserType = typeof users.$inferSelect;
type PostType = typeof posts.$inferSelect;
type CommentType = typeof comments.$inferSelect;

type UserWithOrg = UserType & {
    organization?: {
        id: string;
        name: string;
    };
};

type PostWithAuthor = PostType & {
    author: UserWithOrg | null;
    poll?:
        | (typeof polls.$inferSelect & {
              options: (typeof pollOptions.$inferSelect)[];
          })
        | null;
};

type CommentWithAuthor = CommentType & {
    author: UserType | null;
    replies?: CommentWithAuthor[]; // Add replies array for nesting
};

type PostWithAuthorAndComments = PostType & {
    author: UserType | null;
    comments: CommentWithAuthor[];
    community?: typeof communities.$inferSelect | null;
    tags: (typeof tags.$inferSelect)[];
    attachments: (typeof attachments.$inferSelect)[];
    poll?:
        | (typeof polls.$inferSelect & {
              options: (typeof pollOptions.$inferSelect)[];
          })
        | null;
};

type PostWithSource = PostWithAuthor & {
    source: {
        type: string;
        orgId?: string;
        communityId?: number;
        reason: string;
    };
    community?: typeof communities.$inferSelect | null;
    comments?: CommentType[];
};

export const queryProcedures = {
    // Get all posts (org-specific) that don't belong to any community
    getPosts: authProcedure.query(
        async ({ ctx }): Promise<PostWithAuthor[]> => {
            try {
                // Always fetch orgId from DB
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
                const allPostsFromDb = await db.query.posts.findMany({
                    where: and(
                        eq(posts.orgId, orgId),
                        isNull(posts.communityId), // Only include posts that don't belong to a community
                    ),
                    orderBy: desc(posts.createdAt),
                    with: {
                        author: true,
                        poll: {
                            with: {
                                options: {
                                    orderBy: asc(pollOptions.orderIndex),
                                },
                            },
                        },
                    },
                });
                return allPostsFromDb as PostWithAuthor[];
            } catch (error) {
                console.error('Error fetching posts:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch posts',
                });
            }
        },
    ),

    // Get posts from communities the user is a member of
    getRelevantPosts: authProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).default(20),
                offset: z.number().default(0),
            }),
        )
        .query(
            async ({
                ctx,
                input,
            }): Promise<{
                posts: PostWithAuthor[];
                nextOffset: number | null;
                hasNextPage: boolean;
                totalCount: number;
            }> => {
                try {
                    const { limit, offset } = input;
                    const userId = ctx.session.user.id;

                    // Check if user is SuperAdmin
                    const user = await db.query.users.findFirst({
                        where: eq(users.id, userId),
                        columns: {
                            role: true,
                            orgId: true,
                        },
                    });

                    // If SuperAdmin, get posts from ALL communities with pagination
                    if (isSuperAdmin(ctx.session)) {
                        const whereClause = eq(posts.isDeleted, false);

                        // Fetch total count and paginated posts in parallel for efficiency
                        const [totalCountResult, paginatedDbPosts] =
                            await Promise.all([
                                db
                                    .select({ count: sql<number>`count(*)` })
                                    .from(posts)
                                    .where(whereClause),
                                db.query.posts.findMany({
                                    where: whereClause,
                                    orderBy: [desc(posts.createdAt)],
                                    limit,
                                    offset,
                                    with: {
                                        author: true,
                                        community: true,
                                        poll: {
                                            with: {
                                                options: {
                                                    orderBy: asc(
                                                        pollOptions.orderIndex,
                                                    ),
                                                },
                                            },
                                        },
                                    },
                                }),
                            ]);

                        const totalCount = totalCountResult[0]?.count || 0;

                        const hasNextPage = offset + limit < totalCount;
                        const nextOffset = hasNextPage ? offset + limit : null;

                        return {
                            posts: paginatedDbPosts as PostWithAuthor[],
                            nextOffset,
                            hasNextPage,
                            totalCount,
                        };
                    }

                    // Get all communities where the user is a member
                    const userCommunities =
                        await db.query.communityMembers.findMany({
                            where: and(
                                eq(communityMembers.userId, userId),
                                eq(communityMembers.status, 'active'),
                            ),
                            with: {
                                community: true,
                            },
                        });

                    // --- ORG ADMIN OVERRIDE ---
                    // If user is org admin, also get communities from their org
                    let additionalCommunityIds: number[] = [];
                    if (user?.orgId) {
                        if (user.role === 'admin') {
                            additionalCommunityIds =
                                await getCommunityIdsForOrg(user.orgId);
                        }
                    }

                    // Extract community IDs from memberships
                    const membershipCommunityIds = userCommunities.map(
                        (membership) => membership.communityId,
                    );

                    // Combine membership communities with org admin communities
                    const allCommunityIds = [
                        ...new Set([
                            ...membershipCommunityIds,
                            ...additionalCommunityIds,
                        ]),
                    ];

                    // If user isn't part of any communities and isn't org admin, return empty result
                    if (allCommunityIds.length === 0) {
                        return {
                            posts: [],
                            nextOffset: null,
                            hasNextPage: false,
                            totalCount: 0,
                        };
                    }

                    // Get total count for pagination
                    const totalCountResult = await db
                        .select({ count: count() })
                        .from(posts)
                        .where(
                            and(
                                inArray(posts.communityId, allCommunityIds),
                                eq(posts.isDeleted, false),
                            ),
                        );

                    const totalCount = totalCountResult[0]?.count || 0;

                    // Get posts from these communities with pagination
                    const relevantPosts = await db.query.posts.findMany({
                        where: and(
                            inArray(posts.communityId, allCommunityIds),
                            eq(posts.isDeleted, false),
                        ),
                        orderBy: desc(posts.createdAt),
                        limit: limit,
                        offset: offset,
                        with: {
                            author: true,
                            community: true,
                            poll: {
                                with: {
                                    options: {
                                        orderBy: asc(pollOptions.orderIndex),
                                    },
                                },
                            },
                        },
                    });

                    const hasNextPage = offset + limit < totalCount;
                    const nextOffset = hasNextPage ? offset + limit : null;

                    return {
                        posts: relevantPosts as PostWithAuthor[],
                        nextOffset,
                        hasNextPage,
                        totalCount,
                    };
                } catch (error) {
                    console.error('Error fetching relevant posts:', error);
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'Failed to fetch relevant posts',
                    });
                }
            },
        ),

    // Get all posts relevant to user (org-wide + community posts)
    getAllRelevantPosts: authProcedure
        .input(
            z.object({
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
            }),
        )
        .query(async ({ ctx, input }) => {
            try {
                const { limit, offset, sort, dateFilter } = input;
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

                // Check if user is SuperAdmin
                const user = await db.query.users.findFirst({
                    where: eq(users.id, userId),
                    columns: {
                        role: true,
                        orgId: true,
                    },
                });

                // If SuperAdmin, get posts from ALL communities and organizations
                if (isSuperAdmin(ctx.session)) {
                    const whereClause = dateFilterCondition
                        ? and(eq(posts.isDeleted, false), dateFilterCondition)
                        : eq(posts.isDeleted, false);

                    // For comment count sorting, we need to fetch posts with comment counts
                    let orderByClause;
                    if (sort === 'most-commented') {
                        // Use a subquery to get comment counts and sort by them
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

                    // Fetch total count and paginated posts in parallel for efficiency
                    const [totalCountResult, paginatedDbPosts] =
                        await Promise.all([
                            db
                                .select({ count: sql<number>`count(*)` })
                                .from(posts)
                                .where(whereClause),
                            db.query.posts.findMany({
                                where: whereClause,
                                orderBy: [orderByClause],
                                limit,
                                offset,
                                with: {
                                    author: {
                                        with: {
                                            organization: true,
                                        },
                                    },
                                    community: true,
                                    comments: true,
                                    postTags: {
                                        with: {
                                            tag: true,
                                        },
                                    },
                                    attachments: true,
                                    poll: {
                                        with: {
                                            options: {
                                                orderBy: asc(
                                                    pollOptions.orderIndex,
                                                ),
                                            },
                                        },
                                    },
                                },
                            }),
                        ]);

                    const totalCount = totalCountResult[0]?.count || 0;

                    // Add source information to the paginated posts
                    const postsWithSource = paginatedDbPosts.map((post) => ({
                        ...post,
                        tags: post.postTags.map((pt) => pt.tag),
                        source: {
                            type: post.communityId ? 'community' : 'org',
                            orgId: post.orgId,
                            communityId: post.communityId
                                ? post.communityId
                                : undefined,
                            reason: post.communityId
                                ? `SuperAdmin access to ${post.community?.name || 'community'}`
                                : `SuperAdmin access to organization`,
                        },
                    }));

                    const hasNextPage = offset + limit < totalCount;
                    const nextOffset = hasNextPage ? offset + limit : null;

                    return {
                        posts: postsWithSource,
                        nextOffset,
                        hasNextPage,
                        totalCount,
                    };
                }

                // Get user's org ID
                const orgId = user?.orgId;

                if (!orgId) {
                    throw new TRPCError({
                        code: 'UNAUTHORIZED',
                        message: 'User does not have an organization.',
                    });
                }

                // Get all communities where the user is a member
                const userMemberships =
                    await db.query.communityMembers.findMany({
                        where: and(
                            eq(communityMembers.userId, userId),
                            eq(communityMembers.status, 'active'),
                        ),
                        with: {
                            community: true,
                        },
                    });

                // --- ORG ADMIN OVERRIDE ---
                // If user is org admin, also get communities from their org
                let additionalCommunityIds: number[] = [];
                if (user?.orgId) {
                    if (user.role === 'admin') {
                        additionalCommunityIds = await getCommunityIdsForOrg(
                            user.orgId,
                        );
                    }
                }

                // Create a map of community ID to membership type for quick lookup
                const communityMembershipMap = new Map();
                userMemberships.forEach((membership) => {
                    communityMembershipMap.set(
                        membership.communityId,
                        membership.membershipType,
                    );
                });

                // Extract community IDs from memberships
                const membershipCommunityIds = userMemberships.map(
                    (membership) => membership.communityId,
                );

                // Combine membership communities with org admin communities
                const allCommunityIds = [
                    ...new Set([
                        ...membershipCommunityIds,
                        ...additionalCommunityIds,
                    ]),
                ];

                // Build a single WHERE clause that covers both org posts and community posts
                const baseWhereConditions = [eq(posts.isDeleted, false)];

                if (dateFilterCondition) {
                    baseWhereConditions.push(dateFilterCondition);
                }

                // Create OR condition for org posts OR community posts
                const orgCondition = and(
                    eq(posts.orgId, orgId),
                    isNull(posts.communityId),
                );

                const communityCondition =
                    allCommunityIds.length > 0
                        ? inArray(posts.communityId, allCommunityIds)
                        : sql`false`; // If no communities, this condition will never match

                const combinedWhere = and(
                    ...baseWhereConditions,
                    or(orgCondition, communityCondition),
                );

                // Build ORDER BY clause
                let orderByClause;
                if (sort === 'most-commented') {
                    // Use a subquery to get comment counts and sort by them
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

                // Get organization name for source information
                const organization = await db.query.orgs.findFirst({
                    where: eq(orgs.id, orgId),
                });
                const orgName = organization?.name || 'your organization';

                // Execute single query with proper pagination and sorting
                const [totalCountResult, paginatedDbPosts] = await Promise.all([
                    // Get total count
                    db
                        .select({ count: sql<number>`count(*)` })
                        .from(posts)
                        .where(combinedWhere),
                    // Get paginated posts with all relations
                    db.query.posts.findMany({
                        where: combinedWhere,
                        orderBy: [orderByClause],
                        limit,
                        offset,
                        with: {
                            author: {
                                with: {
                                    organization: true,
                                },
                            },
                            community: true,
                            comments: true,
                            postTags: {
                                with: {
                                    tag: true,
                                },
                            },
                            poll: {
                                with: {
                                    options: {
                                        orderBy: asc(pollOptions.orderIndex),
                                    },
                                },
                            },
                            attachments: true,
                        },
                    }),
                ]);

                const totalCount = totalCountResult[0]?.count || 0;

                // Add source information to posts
                const postsWithSource = paginatedDbPosts.map((post) => {
                    const isOrgPost = post.orgId === orgId && !post.communityId;
                    const membershipType = post.communityId
                        ? communityMembershipMap.get(post.communityId)
                        : null;

                    return {
                        ...post,
                        tags: post.postTags.map((pt) => pt.tag), // Transform postTags to tags
                        source: isOrgPost
                            ? {
                                  type: 'org' as const,
                                  orgId,
                                  reason: `Because you are part of ${orgName}`,
                              }
                            : {
                                  type: 'community' as const,
                                  communityId: post.communityId
                                      ? post.communityId
                                      : undefined,
                                  // Hide reason for members; show interest-based copy
                                  reason: membershipType
                                      ? ''
                                      : `Based on your interests`,
                              },
                    } as PostWithSource;
                });

                // Check if there are more results
                const hasNextPage = offset + limit < totalCount;
                const nextOffset = hasNextPage ? offset + limit : null;

                return {
                    posts: postsWithSource,
                    nextOffset,
                    hasNextPage,
                    totalCount,
                };
            } catch (error) {
                console.error('Error fetching all relevant posts:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch posts',
                });
            }
        }),

    // Get posts from communities where the user is an active MEMBER only
    getMemberCommunityPosts: authProcedure
        .input(
            z.object({
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
            }),
        )
        .query(async ({ ctx, input }) => {
            try {
                const { limit, offset, sort, dateFilter } = input;
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

                // Get active memberships where the user is a MEMBER
                const userMemberships =
                    await db.query.communityMembers.findMany({
                        where: and(
                            eq(communityMembers.userId, userId),
                            eq(communityMembers.status, 'active'),
                            eq(communityMembers.membershipType, 'member'),
                        ),
                    });

                const memberCommunityIds = userMemberships.map(
                    (membership) => membership.communityId,
                );

                // If user is not a member of any communities, return empty list
                if (memberCommunityIds.length === 0) {
                    return {
                        posts: [],
                        nextOffset: null,
                        hasNextPage: false,
                        totalCount: 0,
                    };
                }

                // Base conditions
                const baseWhereConditions = [
                    eq(posts.isDeleted, false),
                    inArray(posts.communityId, memberCommunityIds),
                ];

                if (dateFilterCondition) {
                    baseWhereConditions.push(dateFilterCondition);
                }

                const combinedWhere = and(...baseWhereConditions);

                // Order by clause
                let orderByClause;
                if (sort === 'most-commented') {
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

                // Execute queries
                const [totalCountResult, paginatedDbPosts] = await Promise.all([
                    db
                        .select({ count: sql<number>`count(*)` })
                        .from(posts)
                        .where(combinedWhere),
                    db.query.posts.findMany({
                        where: combinedWhere,
                        orderBy: [orderByClause],
                        limit,
                        offset,
                        with: {
                            author: {
                                with: { organization: true },
                            },
                            community: true,
                            comments: true,
                            postTags: { with: { tag: true } },
                            poll: {
                                with: {
                                    options: {
                                        orderBy: asc(pollOptions.orderIndex),
                                    },
                                },
                            },
                            attachments: true,
                        },
                    }),
                ]);

                const totalCount = totalCountResult[0]?.count || 0;

                const postsWithSource = paginatedDbPosts.map((post) => ({
                    ...post,
                    tags: post.postTags.map((pt) => pt.tag),
                    source: {
                        type: 'community' as const,
                        communityId: post.communityId ?? undefined,
                        // Member-only feed: do not show a reason label
                        reason: '',
                    },
                }));

                const hasNextPage = offset + limit < totalCount;
                const nextOffset = hasNextPage ? offset + limit : null;

                return {
                    posts: postsWithSource,
                    nextOffset,
                    hasNextPage,
                    totalCount,
                };
            } catch (error) {
                console.error('Error fetching member community posts:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch posts',
                });
            }
        }),

    // Get posts for "For me" tab - includes public community posts even if not joined/followed
    getForMePosts: authProcedure
        .input(
            z.object({
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
            }),
        )
        .query(async ({ ctx, input }) => {
            try {
                const { limit, offset, sort, dateFilter } = input;
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

                // Check if user is SuperAdmin
                const user = await db.query.users.findFirst({
                    where: eq(users.id, userId),
                    columns: {
                        role: true,
                        orgId: true,
                    },
                });

                // If SuperAdmin, get posts from ALL communities and organizations
                if (isSuperAdmin(ctx.session)) {
                    const whereClause = dateFilterCondition
                        ? and(eq(posts.isDeleted, false), dateFilterCondition)
                        : eq(posts.isDeleted, false);

                    // For comment count sorting, we need to fetch posts with comment counts
                    let orderByClause;
                    if (sort === 'most-commented') {
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

                    // Fetch total count and paginated posts in parallel for efficiency
                    const [totalCountResult, paginatedDbPosts] =
                        await Promise.all([
                            db
                                .select({ count: sql<number>`count(*)` })
                                .from(posts)
                                .where(whereClause),
                            db.query.posts.findMany({
                                where: whereClause,
                                orderBy: [orderByClause],
                                limit,
                                offset,
                                with: {
                                    author: {
                                        with: {
                                            organization: true,
                                        },
                                    },
                                    community: true,
                                    comments: true,
                                    postTags: {
                                        with: {
                                            tag: true,
                                        },
                                    },
                                    attachments: true,
                                    poll: {
                                        with: {
                                            options: {
                                                orderBy: asc(
                                                    pollOptions.orderIndex,
                                                ),
                                            },
                                        },
                                    },
                                },
                            }),
                        ]);

                    const totalCount = totalCountResult[0]?.count || 0;

                    // Add source information to the paginated posts
                    const postsWithSource = paginatedDbPosts.map((post) => ({
                        ...post,
                        tags: post.postTags.map((pt) => pt.tag),
                        source: {
                            type: post.communityId ? 'community' : 'org',
                            orgId: post.orgId,
                            communityId: post.communityId
                                ? post.communityId
                                : undefined,
                            reason: post.communityId
                                ? `SuperAdmin access to ${post.community?.name || 'community'}`
                                : `SuperAdmin access to organization`,
                        },
                    }));

                    const hasNextPage = offset + limit < totalCount;
                    const nextOffset = hasNextPage ? offset + limit : null;

                    return {
                        posts: postsWithSource,
                        nextOffset,
                        hasNextPage,
                        totalCount,
                    };
                }

                // Get user's org ID
                const orgId = user?.orgId;

                if (!orgId) {
                    throw new TRPCError({
                        code: 'UNAUTHORIZED',
                        message: 'User does not have an organization.',
                    });
                }

                // Get all communities where the user is a member or follower
                const userMemberships =
                    await db.query.communityMembers.findMany({
                        where: and(
                            eq(communityMembers.userId, userId),
                            eq(communityMembers.status, 'active'),
                        ),
                        with: {
                            community: true,
                        },
                    });

                // --- ORG ADMIN OVERRIDE ---
                // If user is org admin, also get communities from their org
                let additionalCommunityIds: number[] = [];
                if (user?.orgId) {
                    if (user.role === 'admin') {
                        additionalCommunityIds = await getCommunityIdsForOrg(
                            user.orgId,
                        );
                    }
                }

                // Get public communities from the user's org only (for "For me" tab)
                const publicCommunities = await db.query.communities.findMany({
                    where: and(
                        eq(communities.type, 'public'),
                        eq(communities.orgId, orgId),
                    ),
                    columns: {
                        id: true,
                    },
                });

                const publicCommunityIds = publicCommunities.map((c) => c.id);

                // Create a map of community ID to membership type for quick lookup
                const communityMembershipMap = new Map();
                userMemberships.forEach((membership) => {
                    communityMembershipMap.set(
                        membership.communityId,
                        membership.membershipType,
                    );
                });

                // Extract community IDs from memberships
                const membershipCommunityIds = userMemberships.map(
                    (membership) => membership.communityId,
                );

                // Combine membership communities with org admin communities and public communities
                const allCommunityIds = [
                    ...new Set([
                        ...membershipCommunityIds,
                        ...additionalCommunityIds,
                        ...publicCommunityIds, // Include all public communities
                    ]),
                ];

                // Build a single WHERE clause that covers both org posts and community posts
                const baseWhereConditions = [eq(posts.isDeleted, false)];

                if (dateFilterCondition) {
                    baseWhereConditions.push(dateFilterCondition);
                }

                // Create OR condition for org posts OR community posts
                const orgCondition = and(
                    eq(posts.orgId, orgId),
                    isNull(posts.communityId),
                );

                const communityCondition =
                    allCommunityIds.length > 0
                        ? and(
                              inArray(posts.communityId, allCommunityIds),
                              eq(posts.orgId, orgId),
                          )
                        : sql`false`; // If no communities, this condition will never match

                const combinedWhere = and(
                    ...baseWhereConditions,
                    or(orgCondition, communityCondition),
                );

                // Build ORDER BY clause
                let orderByClause;
                if (sort === 'most-commented') {
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

                // Get organization name for source information
                const organization = await db.query.orgs.findFirst({
                    where: eq(orgs.id, orgId),
                });
                const orgName = organization?.name || 'your organization';

                // Execute single query with proper pagination and sorting
                const [totalCountResult, paginatedDbPosts] = await Promise.all([
                    // Get total count
                    db
                        .select({ count: sql<number>`count(*)` })
                        .from(posts)
                        .where(combinedWhere),
                    // Get paginated posts with all relations
                    db.query.posts.findMany({
                        where: combinedWhere,
                        orderBy: [orderByClause],
                        limit,
                        offset,
                        with: {
                            author: {
                                with: {
                                    organization: true,
                                },
                            },
                            community: true,
                            comments: true,
                            postTags: {
                                with: {
                                    tag: true,
                                },
                            },
                            poll: {
                                with: {
                                    options: {
                                        orderBy: asc(pollOptions.orderIndex),
                                    },
                                },
                            },
                            attachments: true,
                        },
                    }),
                ]);

                const totalCount = totalCountResult[0]?.count || 0;

                // Add source information to posts
                const postsWithSource = paginatedDbPosts.map((post) => {
                    const isOrgPost = post.orgId === orgId && !post.communityId;
                    const membershipType = post.communityId
                        ? communityMembershipMap.get(post.communityId)
                        : null;

                    // Check if this is a public community post where user is not a member
                    const isPublicCommunityPost =
                        post.communityId &&
                        publicCommunityIds.includes(post.communityId) &&
                        !membershipType;

                    return {
                        ...post,
                        tags: post.postTags.map((pt) => pt.tag), // Transform postTags to tags
                        source: isOrgPost
                            ? {
                                  type: 'org' as const,
                                  orgId,
                                  reason: `Because you are part of ${orgName}`,
                              }
                            : isPublicCommunityPost
                              ? {
                                    type: 'community' as const,
                                    communityId: post.communityId
                                        ? post.communityId
                                        : undefined,
                                    // User isn't a member/follower; public community surfacing
                                    reason: `Based on your interests`,
                                }
                              : {
                                    type: 'community' as const,
                                    communityId: post.communityId
                                        ? post.communityId
                                        : undefined,
                                    // Hide reason for members/followers
                                    reason: '',
                                },
                    } as PostWithSource;
                });

                // Check if there are more results
                const hasNextPage = offset + limit < totalCount;
                const nextOffset = hasNextPage ? offset + limit : null;

                return {
                    posts: postsWithSource,
                    nextOffset,
                    hasNextPage,
                    totalCount,
                };
            } catch (error) {
                console.error('Error fetching for me posts:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch posts',
                });
            }
        }),

    // Get a single post with its comments
    getPost: authProcedure
        .input(
            z.object({
                postId: z.number(),
            }),
        )
        .query(async ({ input, ctx }): Promise<PostWithAuthorAndComments> => {
            try {
                const postFromDb = await db.query.posts.findFirst({
                    where: eq(posts.id, input.postId),
                    with: {
                        author: true,
                        community: true,
                        attachments: true,
                        comments: {
                            with: {
                                author: true,
                            },
                            orderBy: desc(comments.createdAt),
                        },
                        postTags: {
                            with: {
                                tag: true,
                            },
                        },
                        poll: {
                            with: {
                                options: {
                                    orderBy: asc(pollOptions.orderIndex),
                                },
                            },
                        },
                    },
                });

                if (!postFromDb) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Post not found',
                    });
                }

                // Check if post is from a private community and if user has access
                if (
                    postFromDb.communityId &&
                    postFromDb.community?.type === 'private'
                ) {
                    // Check if user is a member of the community
                    const membership =
                        await db.query.communityMembers.findFirst({
                            where: and(
                                eq(
                                    communityMembers.userId,
                                    ctx.session.user.id,
                                ),
                                eq(
                                    communityMembers.communityId,
                                    postFromDb.communityId,
                                ),
                                eq(communityMembers.status, 'active'),
                            ),
                        });

                    // --- ORG ADMIN OVERRIDE ---
                    // Check if user is org admin for this community
                    const isOrgAdminForCommunityCheck = isOrgAdminForCommunity(
                        ctx.session.user,
                        postFromDb.community?.orgId,
                    );

                    if (!membership && !isOrgAdminForCommunityCheck) {
                        throw new TRPCError({
                            code: 'FORBIDDEN',
                            message:
                                'You must be a member of this community to view this post',
                        });
                    }
                }

                // Fetch all comments for the post separately
                const allCommentsForPost = await db.query.comments.findMany({
                    where: eq(comments.postId, input.postId),
                    with: {
                        author: true,
                    },
                    orderBy: desc(comments.createdAt), // Or asc(comments.createdAt) depending on desired order
                });

                // Structure comments into a tree
                const commentsById: { [key: number]: CommentWithAuthor } = {};
                allCommentsForPost.forEach((comment) => {
                    commentsById[comment.id] = {
                        ...(comment as CommentWithAuthor),
                        replies: [],
                    };
                });

                const nestedComments: CommentWithAuthor[] = [];
                allCommentsForPost.forEach((comment) => {
                    if (comment.parentId && commentsById[comment.parentId]) {
                        commentsById[comment.parentId].replies?.push(
                            commentsById[comment.id],
                        );
                    } else {
                        nestedComments.push(commentsById[comment.id]);
                    }
                });

                // The Drizzle 'with' for comments is removed, so we manually add the structured comments.
                const result: PostWithAuthorAndComments = {
                    ...(postFromDb as unknown as PostWithAuthorAndComments),
                    comments: nestedComments.sort(
                        (a, b) =>
                            new Date(b.createdAt).getTime() -
                            new Date(a.createdAt).getTime(),
                    ), // Ensure top-level comments are sorted as before
                    tags: postFromDb.postTags?.map((pt) => pt.tag) || [],
                    attachments: postFromDb.attachments || [],
                };

                return result;
            } catch (error) {
                if (error instanceof TRPCError) {
                    throw error;
                }
                console.error('Error fetching post:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch post',
                });
            }
        }),
};
