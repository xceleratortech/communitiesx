import { z } from 'zod';
import { publicProcedure } from '../trpc';
import { db } from '@/server/db';
import { TRPCError } from '@trpc/server';
import {
    communities,
    communityMembers,
    posts,
    communityAllowedOrgs,
    tags,
    users,
    pollOptions,
    postTags,
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

// Helper function to check if user is SuperAdmin
function isSuperAdmin(session: any): boolean {
    return session?.user?.appRole === 'admin';
}

export const discoveryProcedures = {
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
                        limit: 3, // Only get first 3 members for avatar display
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
                            limit: 3, // Only get first 3 members for avatar display
                        },
                    },
                    orderBy: desc(communities.id),
                    limit,
                });

                // Get member counts for each community
                const communityIds = allCommunities.map((c) => c.id);
                const memberCounts = await db
                    .select({
                        communityId: communityMembers.communityId,
                        count: sql<number>`count(*)`.as('count'),
                    })
                    .from(communityMembers)
                    .where(
                        communityIds.length > 0
                            ? inArray(
                                  communityMembers.communityId,
                                  communityIds,
                              )
                            : sql`false`,
                    )
                    .groupBy(communityMembers.communityId);

                // Create a map of community ID to member count
                const memberCountMap = new Map(
                    memberCounts.map((mc) => [mc.communityId, mc.count]),
                );

                // Add member count to each community
                const communitiesWithCounts = allCommunities.map(
                    (community) => ({
                        ...community,
                        memberCount: memberCountMap.get(community.id) || 0,
                    }),
                );

                const nextCursor =
                    communitiesWithCounts.length === limit
                        ? communitiesWithCounts[
                              communitiesWithCounts.length - 1
                          ]?.id
                        : undefined;

                return {
                    items: communitiesWithCounts,
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
                        creator: {
                            columns: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
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
                            limit: 3, // Only get first 3 members for avatar display
                        },
                    },
                    orderBy: desc(communities.id),
                    limit,
                });

                // Get member counts for each community
                const communityIds = allCommunities.map((c) => c.id);
                const memberCounts = await db
                    .select({
                        communityId: communityMembers.communityId,
                        count: sql<number>`count(*)`.as('count'),
                    })
                    .from(communityMembers)
                    .where(
                        communityIds.length > 0
                            ? inArray(
                                  communityMembers.communityId,
                                  communityIds,
                              )
                            : sql`false`,
                    )
                    .groupBy(communityMembers.communityId);

                // Create a map of community ID to member count
                const memberCountMap = new Map(
                    memberCounts.map((mc) => [mc.communityId, mc.count]),
                );

                // Add member count to each community
                const communitiesWithCounts = allCommunities.map(
                    (community) => ({
                        ...community,
                        memberCount: memberCountMap.get(community.id) || 0,
                    }),
                );

                const nextCursor =
                    communitiesWithCounts.length === limit
                        ? communitiesWithCounts[
                              communitiesWithCounts.length - 1
                          ]?.id
                        : undefined;

                return {
                    items: communitiesWithCounts,
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
                            members: community.members.map((member) => ({
                                ...member,
                                membershipType: 'member' as const,
                            })),
                        };
                    }
                } else if (community.type === 'private' && !ctx.session?.user) {
                    // If community is private and user is not logged in, hide posts
                    return {
                        ...community,
                        posts: [],
                        members: community.members.map((member) => ({
                            ...member,
                            membershipType: 'member' as const,
                        })),
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
                    members: community.members.map((member) => ({
                        ...member,
                        membershipType: 'member' as const,
                    })),
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
                            where: eq(
                                communityMembers.membershipType,
                                'member',
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
                                members: community.members.map((member) => ({
                                    ...member,
                                    membershipType: 'member' as const,
                                })),
                            };
                        }
                    }
                } else if (community.type === 'private' && !ctx.session?.user) {
                    // If community is private and user is not logged in, hide posts
                    return {
                        ...community,
                        posts: [],
                        members: community.members.map((member) => ({
                            ...member,
                            membershipType: 'member' as const,
                        })),
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
                            members: community.members.map((member) => ({
                                ...member,
                                membershipType: 'member' as const,
                            })),
                        };
                    }
                }

                const viewerOrgId = (ctx.session?.user as any)?.orgId;
                const orgFilter =
                    community.type === 'public' && viewerOrgId
                        ? [eq(posts.orgId, viewerOrgId)]
                        : [];

                // Load posts with authors, tags, comments, and poll (include org filter for public communities)
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
                        poll: {
                            with: {
                                options: {
                                    orderBy: asc(pollOptions.orderIndex),
                                },
                            },
                        },
                        qa: true,
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

                // Compute tag post counts (respecting same filters as posts)
                const tagCountRows = await db
                    .select({
                        tagId: postTags.tagId,
                        count: sql<number>`count(*)`.as('count'),
                    })
                    .from(postTags)
                    .innerJoin(posts, eq(postTags.postId, posts.id))
                    .where(
                        and(
                            eq(posts.communityId, community.id),
                            eq(posts.isDeleted, false),
                            ...dateFilterConditions,
                            ...orgFilter,
                        ),
                    )
                    .groupBy(postTags.tagId);

                const tagIdToCount = new Map<number, number>(
                    tagCountRows.map((r) => [r.tagId, r.count]),
                );

                // Load all tags for the community and attach counts
                const communityTags = await db.query.tags.findMany({
                    where: eq(tags.communityId, community.id),
                    orderBy: desc(tags.createdAt),
                });
                const tagsWithCounts = communityTags.map((t) => ({
                    ...t,
                    postCount: tagIdToCount.get(t.id) || 0,
                }));

                // Return the community with posts and tags including counts
                return {
                    ...community,
                    orgId: community.orgId,
                    posts: postsWithTags,
                    tags: tagsWithCounts,
                    members: community.members.map((member) => ({
                        ...member,
                        membershipType: 'member' as const,
                    })),
                };
            } catch (error) {
                console.error(
                    `Error fetching community with slug ${input.slug}:`,
                    error,
                );
                return null;
            }
        }),
};
