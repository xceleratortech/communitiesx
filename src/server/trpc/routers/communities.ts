import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { db } from '@/server/db';
import {
    communities,
    communityMembers,
    posts,
    communityMemberRequests,
} from '@/server/db/schema';
import { eq, and, desc, or } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const communitiesRouter = router({
    getAll: publicProcedure.query(async ({ ctx }) => {
        try {
            const allCommunities = await db.query.communities.findMany({
                with: {
                    members: true,
                    posts: true,
                    creator: {
                        columns: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            });

            return allCommunities;
        } catch (error) {
            console.error('Error fetching communities:', error);
            return [];
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
                    },
                });

                if (!community) {
                    return null;
                }

                // If the community is private, check if the user has access
                if (community.type === 'private' && ctx.session?.user) {
                    const userId = ctx.session.user.id;

                    // Check if user is a member or follower
                    const membership = community.members.find(
                        (m) => m.userId === userId && m.status === 'active',
                    );

                    // If user is not a member or follower, return the community without posts
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

                // Load posts with authors
                const postsWithAuthors = await db.query.posts.findMany({
                    where: and(
                        eq(posts.communityId, community.id),
                        eq(posts.isDeleted, false),
                    ),
                    with: {
                        author: true,
                    },
                    orderBy: desc(posts.createdAt),
                });

                // Return the community with posts that include author information
                return {
                    ...community,
                    posts: postsWithAuthors,
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
        .input(z.object({ slug: z.string() }))
        .query(async ({ input, ctx }) => {
            try {
                const community = await db.query.communities.findFirst({
                    where: eq(communities.slug, input.slug),
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
                    },
                });

                if (!community) {
                    return null;
                }

                // If the community is private, check if the user has access
                if (community.type === 'private' && ctx.session?.user) {
                    const userId = ctx.session.user.id;

                    // Check if user is a member or follower
                    const membership = community.members.find(
                        (m) => m.userId === userId && m.status === 'active',
                    );

                    // If user is not a member or follower, return the community without posts
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

                // Load posts with authors
                const postsWithAuthors = await db.query.posts.findMany({
                    where: and(
                        eq(posts.communityId, community.id),
                        eq(posts.isDeleted, false),
                    ),
                    with: {
                        author: true,
                    },
                    orderBy: desc(posts.createdAt),
                });

                // Return the community with posts that include author information
                return {
                    ...community,
                    posts: postsWithAuthors,
                };
            } catch (error) {
                console.error(
                    `Error fetching community with slug ${input.slug}:`,
                    error,
                );
                return null;
            }
        }),

    joinCommunity: publicProcedure
        .input(z.object({ communityId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to join a community',
                });
            }

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

                    // If they're a follower, and community is public, upgrade to member
                    if (community.type === 'public') {
                        const [updatedMembership] = await db
                            .update(communityMembers)
                            .set({
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
                                        input.communityId,
                                    ),
                                ),
                            )
                            .returning();

                        return {
                            status: 'approved',
                            membership: updatedMembership,
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
                                    eq(
                                        communityMemberRequests.requestType,
                                        'join',
                                    ),
                                    eq(
                                        communityMemberRequests.status,
                                        'pending',
                                    ),
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

    followCommunity: publicProcedure
        .input(z.object({ communityId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to follow a community',
                });
            }

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

                // Check if the user already has a relationship with this community
                const existingMembership =
                    await db.query.communityMembers.findFirst({
                        where: and(
                            eq(communityMembers.userId, ctx.session.user.id),
                            eq(communityMembers.communityId, input.communityId),
                        ),
                    });

                if (existingMembership) {
                    if (existingMembership.membershipType === 'follower') {
                        throw new TRPCError({
                            code: 'BAD_REQUEST',
                            message: 'You are already following this community',
                        });
                    }

                    // If they're a member, don't allow downgrade to follower
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'You are already a member of this community',
                    });
                }

                // For public communities, create a new follower relationship directly
                if (community.type === 'public') {
                    const [newMembership] = await db
                        .insert(communityMembers)
                        .values({
                            userId: ctx.session.user.id,
                            communityId: input.communityId,
                            role: 'follower',
                            membershipType: 'follower',
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
                                eq(
                                    communityMemberRequests.requestType,
                                    'follow',
                                ),
                                eq(communityMemberRequests.status, 'pending'),
                            ),
                        });

                    if (existingRequest) {
                        throw new TRPCError({
                            code: 'BAD_REQUEST',
                            message:
                                'You already have a pending request to follow this community',
                        });
                    }

                    // Create a new follow request
                    const [newRequest] = await db
                        .insert(communityMemberRequests)
                        .values({
                            userId: ctx.session.user.id,
                            communityId: input.communityId,
                            requestType: 'follow',
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
                console.error('Error following community:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to follow community',
                });
            }
        }),

    leaveCommunity: publicProcedure
        .input(z.object({ communityId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to leave a community',
                });
            }

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

    unfollowCommunity: publicProcedure
        .input(z.object({ communityId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to unfollow a community',
                });
            }

            try {
                // Check if the user is following the community
                const membership = await db.query.communityMembers.findFirst({
                    where: and(
                        eq(communityMembers.userId, ctx.session.user.id),
                        eq(communityMembers.communityId, input.communityId),
                        eq(communityMembers.membershipType, 'follower'),
                    ),
                });

                if (!membership) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'You are not following this community',
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
                console.error('Error unfollowing community:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to unfollow community',
                });
            }
        }),

    // Get pending membership requests for a community (admin/moderator only)
    getPendingRequests: publicProcedure
        .input(z.object({ communityId: z.number() }))
        .query(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to view pending requests',
                });
            }

            try {
                // Check if user is an admin or moderator of the community
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

                if (!membership) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'Only community admins and moderators can view pending requests',
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
    approveRequest: publicProcedure
        .input(z.object({ requestId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to approve requests',
                });
            }

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

                // Check if user is an admin or moderator of the community
                const membership = await db.query.communityMembers.findFirst({
                    where: and(
                        eq(communityMembers.userId, ctx.session.user.id),
                        eq(communityMembers.communityId, request.communityId),
                        or(
                            eq(communityMembers.role, 'admin'),
                            eq(communityMembers.role, 'moderator'),
                        ),
                    ),
                });

                if (!membership) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'Only community admins and moderators can approve requests',
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

                if (existingMembership) {
                    // Update existing membership if it exists (e.g., upgrade from follower to member)
                    if (
                        request.requestType === 'join' &&
                        existingMembership.membershipType === 'follower'
                    ) {
                        await db
                            .update(communityMembers)
                            .set({
                                membershipType: 'member',
                                status: 'active',
                                updatedAt: new Date(),
                            })
                            .where(
                                and(
                                    eq(communityMembers.userId, request.userId),
                                    eq(
                                        communityMembers.communityId,
                                        request.communityId,
                                    ),
                                ),
                            );
                    }
                } else {
                    // Create a new membership
                    await db.insert(communityMembers).values({
                        userId: request.userId,
                        communityId: request.communityId,
                        role: 'member',
                        membershipType:
                            request.requestType === 'join'
                                ? 'member'
                                : 'follower',
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
    rejectRequest: publicProcedure
        .input(z.object({ requestId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to reject requests',
                });
            }

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

                // Check if user is an admin or moderator of the community
                const membership = await db.query.communityMembers.findFirst({
                    where: and(
                        eq(communityMembers.userId, ctx.session.user.id),
                        eq(communityMembers.communityId, request.communityId),
                        or(
                            eq(communityMembers.role, 'admin'),
                            eq(communityMembers.role, 'moderator'),
                        ),
                    ),
                });

                if (!membership) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'Only community admins and moderators can reject requests',
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
    assignModerator: publicProcedure
        .input(
            z.object({
                communityId: z.number(),
                userId: z.string(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to assign moderators',
                });
            }

            try {
                // Check if the current user is an admin of the community
                const adminMembership =
                    await db.query.communityMembers.findFirst({
                        where: and(
                            eq(communityMembers.userId, ctx.session.user.id),
                            eq(communityMembers.communityId, input.communityId),
                            eq(communityMembers.role, 'admin'),
                        ),
                    });

                if (!adminMembership) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'Only community admins can assign moderators',
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

    // Remove moderator role from a community member (admin only)
    removeModerator: publicProcedure
        .input(
            z.object({
                communityId: z.number(),
                userId: z.string(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to remove moderators',
                });
            }

            try {
                // Check if the current user is an admin of the community
                const adminMembership =
                    await db.query.communityMembers.findFirst({
                        where: and(
                            eq(communityMembers.userId, ctx.session.user.id),
                            eq(communityMembers.communityId, input.communityId),
                            eq(communityMembers.role, 'admin'),
                        ),
                    });

                if (!adminMembership) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'Only community admins can remove moderators',
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

    // Get user's pending requests for a community
    getUserPendingRequests: publicProcedure
        .input(z.object({ communityId: z.number() }))
        .query(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                return [];
            }

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

    getUserCommunities: publicProcedure.query(async ({ ctx }) => {
        if (!ctx.session?.user) {
            throw new TRPCError({
                code: 'UNAUTHORIZED',
                message: 'You must be logged in to view your communities',
            });
        }

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

            // Extract just the communities from the memberships
            const userCommunities = userMemberships.map(
                (membership) => membership.community,
            );

            return userCommunities;
        } catch (error) {
            console.error('Error fetching user communities:', error);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch user communities',
            });
        }
    }),
});
