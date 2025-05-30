import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import {
    posts,
    comments,
    users,
    orgs,
    communities,
    communityMembers,
    communityInvites,
    communityMemberRequests,
} from '@/server/db/schema';
import { TRPCError } from '@trpc/server';
import { eq, desc, count, and, isNull, or, inArray } from 'drizzle-orm';
import { db } from '@/server/db';
import type { Context } from '@/server/trpc/context';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email';

// Define types for the responses based on schema
type UserType = typeof users.$inferSelect;
type PostType = typeof posts.$inferSelect;
type CommentType = typeof comments.$inferSelect;

type PostWithAuthor = PostType & {
    author: UserType | null;
};

type CommentWithAuthor = CommentType & {
    author: UserType | null;
    replies?: CommentWithAuthor[]; // Add replies array for nesting
};

type PostWithAuthorAndComments = PostType & {
    author: UserType | null;
    comments: CommentWithAuthor[];
    community?: typeof communities.$inferSelect | null;
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

export const communityRouter = router({
    // Create a new post
    createPost: publicProcedure
        .input(
            z.object({
                title: z.string().min(1).max(200),
                content: z.string().min(1),
                communityId: z.number().nullable().optional(),
            }),
        )
        .mutation(
            async ({
                input,
                ctx,
            }: {
                input: {
                    title: string;
                    content: string;
                    communityId?: number | null;
                };
                ctx: Context;
            }) => {
                if (!ctx.session?.user) {
                    throw new TRPCError({
                        code: 'UNAUTHORIZED',
                        message: 'You must be logged in to create a post',
                    });
                }

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

                    // If communityId is provided, verify the community exists and user has access
                    if (input.communityId) {
                        const community = await db.query.communities.findFirst({
                            where: eq(communities.id, input.communityId),
                            with: {
                                members: {
                                    where: eq(
                                        communityMembers.userId,
                                        ctx.session.user.id,
                                    ),
                                },
                            },
                        });

                        if (!community) {
                            throw new TRPCError({
                                code: 'NOT_FOUND',
                                message: 'Community not found',
                            });
                        }

                        // Check if user is a member, regardless of community type
                        const isMember = community.members.some(
                            (m) =>
                                m.membershipType === 'member' &&
                                m.status === 'active',
                        );

                        if (!isMember) {
                            throw new TRPCError({
                                code: 'FORBIDDEN',
                                message:
                                    'You must be a member to post in this community',
                            });
                        }
                    }

                    const [post] = await db
                        .insert(posts)
                        .values({
                            title: input.title,
                            content: input.content,
                            authorId: ctx.session.user.id,
                            orgId: orgId,
                            communityId: input.communityId || null,
                            visibility: input.communityId
                                ? 'community'
                                : 'public',
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        })
                        .returning();

                    return post;
                } catch (error) {
                    console.error('Error creating post:', error);
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'Failed to create post',
                    });
                }
            },
        ),

    // Get all posts (org-specific) that don't belong to any community
    getPosts: publicProcedure.query(
        async ({ ctx }): Promise<PostWithAuthor[]> => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to view posts',
                });
            }
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

    // Get posts from communities the user is a member of or following
    getRelevantPosts: publicProcedure.query(
        async ({ ctx }): Promise<PostWithAuthor[]> => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to view posts',
                });
            }
            try {
                const userId = ctx.session.user.id;

                // Get all communities where the user is a member or follower
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

                // Extract community IDs
                const communityIds = userCommunities.map(
                    (membership) => membership.communityId,
                );

                // If user isn't part of any communities, return an empty array
                if (communityIds.length === 0) {
                    return [];
                }

                // Get posts from these communities
                const relevantPosts = await db.query.posts.findMany({
                    where: and(
                        inArray(posts.communityId, communityIds),
                        eq(posts.isDeleted, false),
                    ),
                    orderBy: desc(posts.createdAt),
                    with: {
                        author: true,
                        community: true,
                    },
                });

                return relevantPosts as PostWithAuthor[];
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
    getAllRelevantPosts: publicProcedure.query(async ({ ctx }) => {
        if (!ctx.session?.user) {
            throw new TRPCError({
                code: 'UNAUTHORIZED',
                message: 'You must be logged in to view posts',
            });
        }
        try {
            const userId = ctx.session.user.id;

            // Get user's org ID
            const user = await db.query.users.findFirst({
                where: eq(users.id, userId),
            });
            const orgId = user?.orgId;

            if (!orgId) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'User does not have an organization.',
                });
            }

            // Get all communities where the user is a member or follower
            const userMemberships = await db.query.communityMembers.findMany({
                where: and(
                    eq(communityMembers.userId, userId),
                    eq(communityMembers.status, 'active'),
                ),
                with: {
                    community: true,
                },
            });

            // Create a map of community ID to membership type for quick lookup
            const communityMembershipMap = new Map();
            userMemberships.forEach((membership) => {
                communityMembershipMap.set(
                    membership.communityId,
                    membership.membershipType,
                );
            });

            // Extract community IDs
            const communityIds = userMemberships.map(
                (membership) => membership.communityId,
            );

            // Get organization-wide posts (not belonging to any community)
            const orgPosts = await db.query.posts.findMany({
                where: and(
                    eq(posts.orgId, orgId),
                    isNull(posts.communityId),
                    eq(posts.isDeleted, false),
                ),
                orderBy: desc(posts.createdAt),
                with: {
                    author: true,
                    comments: true,
                },
            });

            // Get organization name
            const organization = await db.query.orgs.findFirst({
                where: eq(orgs.id, orgId),
            });

            const orgName = organization?.name || 'your organization';

            // Add source information to org posts
            const orgPostsWithSource = orgPosts.map((post) => ({
                ...post,
                source: {
                    type: 'org',
                    orgId,
                    reason: `Because you are part of ${orgName}`,
                },
            }));

            // Get community posts if user is part of any communities
            let communityPosts: PostWithSource[] = [];
            if (communityIds.length > 0) {
                const rawCommunityPosts = await db.query.posts.findMany({
                    where: and(
                        inArray(posts.communityId, communityIds),
                        eq(posts.isDeleted, false),
                    ),
                    orderBy: desc(posts.createdAt),
                    with: {
                        author: true,
                        community: true,
                        comments: true,
                    },
                });

                // Add source information to community posts
                communityPosts = rawCommunityPosts.map((post) => {
                    const membershipType = communityMembershipMap.get(
                        post.communityId,
                    );
                    return {
                        ...post,
                        source: {
                            type: 'community',
                            communityId: post.communityId ?? undefined,
                            reason:
                                membershipType === 'member'
                                    ? `Because you are a member of ${post.community?.name}`
                                    : `Because you are following ${post.community?.name}`,
                        },
                    } as PostWithSource;
                });
            }

            // Combine and sort all posts by creation date
            const allPosts = [...orgPostsWithSource, ...communityPosts].sort(
                (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime(),
            );

            return allPosts;
        } catch (error) {
            console.error('Error fetching all relevant posts:', error);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch posts',
            });
        }
    }),

    // Get a single post with its comments
    getPost: publicProcedure
        .input(
            z.object({
                postId: z.number(),
            }),
        )
        .query(async ({ input, ctx }): Promise<PostWithAuthorAndComments> => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to view posts',
                });
            }

            try {
                const postFromDb = await db.query.posts.findFirst({
                    where: eq(posts.id, input.postId),
                    with: {
                        author: true,
                        community: true,
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
                    // Check if user is a member or follower of the community
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

                    if (!membership) {
                        throw new TRPCError({
                            code: 'FORBIDDEN',
                            message:
                                'You must be a member or follower of this community to view this post',
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
                    ...(postFromDb as PostWithAuthorAndComments),
                    comments: nestedComments.sort(
                        (a, b) =>
                            new Date(b.createdAt).getTime() -
                            new Date(a.createdAt).getTime(),
                    ), // Ensure top-level comments are sorted as before
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

    // Create a comment
    createComment: publicProcedure
        .input(
            z.object({
                postId: z.number(),
                content: z.string().min(1),
                parentId: z.number().optional(),
            }),
        )
        .mutation(
            async ({
                input,
                ctx,
            }: {
                input: { postId: number; content: string; parentId?: number };
                ctx: Context;
            }) => {
                if (!ctx.session?.user) {
                    throw new TRPCError({
                        code: 'UNAUTHORIZED',
                        message: 'You must be logged in to comment',
                    });
                }

                console.log('Session user:', ctx.session.user);

                try {
                    // First check if the post exists
                    const orgId = (ctx.session?.user as any).orgId;
                    const post = await db.query.posts.findFirst({
                        where: eq(posts.id, input.postId),
                    });

                    if (!post) {
                        throw new TRPCError({
                            code: 'NOT_FOUND',
                            message: 'Post not found',
                        });
                    }

                    const [comment] = await db
                        .insert(comments)
                        .values({
                            content: input.content,
                            postId: input.postId,
                            authorId: ctx.session.user.id,
                            parentId: input.parentId,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        })
                        .returning({
                            id: comments.id,
                            content: comments.content,
                            postId: comments.postId,
                            authorId: comments.authorId,
                            createdAt: comments.createdAt,
                            updatedAt: comments.updatedAt,
                        });

                    return comment;
                } catch (error) {
                    if (error instanceof TRPCError) {
                        throw error;
                    }
                    console.error('Error creating comment:', error);
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'Failed to create comment',
                    });
                }
            },
        ),

    // Update a comment
    updateComment: publicProcedure
        .input(
            z.object({
                commentId: z.number(),
                content: z.string().min(1),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to edit a comment',
                });
            }

            const commentToUpdate = await db.query.comments.findFirst({
                where: eq(comments.id, input.commentId),
            });

            if (!commentToUpdate) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Comment not found',
                });
            }

            if (commentToUpdate.authorId !== ctx.session.user.id) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You are not authorized to edit this comment',
                });
            }

            try {
                const [updatedComment] = await db
                    .update(comments)
                    .set({
                        content: input.content,
                        updatedAt: new Date(),
                    })
                    .where(eq(comments.id, input.commentId))
                    .returning();

                if (!updatedComment) {
                    // This case should ideally not happen if the findFirst above succeeded
                    // and no one deleted the comment in between.
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'Failed to update comment after verification',
                    });
                }

                return updatedComment;
            } catch (error) {
                console.error('Error updating comment:', error);
                if (error instanceof TRPCError) throw error;
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to update comment',
                });
            }
        }),

    // Edit a post
    editPost: publicProcedure
        .input(
            z.object({
                postId: z.number(),
                title: z.string().min(1).max(200),
                content: z.string().min(1),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to edit a post',
                });
            }
            // Find the post
            const post = await db.query.posts.findFirst({
                where: eq(posts.id, input.postId),
            });
            if (!post) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Post not found',
                });
            }
            if (post.authorId !== ctx.session.user.id) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You are not allowed to edit this post',
                });
            }
            const [updatedPost] = await db
                .update(posts)
                .set({
                    title: input.title,
                    content: input.content,
                    updatedAt: new Date(),
                })
                .where(eq(posts.id, input.postId))
                .returning();
            return updatedPost;
        }),

    // Soft delete a comment
    deleteComment: publicProcedure
        .input(
            z.object({
                commentId: z.number(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to delete a comment',
                });
            }

            const commentToDelete = await db.query.comments.findFirst({
                where: eq(comments.id, input.commentId),
            });

            if (!commentToDelete) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Comment not found',
                });
            }

            if (commentToDelete.authorId !== ctx.session.user.id) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You are not authorized to delete this comment',
                });
            }

            try {
                const [updatedComment] = await db
                    .update(comments)
                    .set({
                        isDeleted: true,
                        updatedAt: new Date(),
                    })
                    .where(eq(comments.id, input.commentId))
                    .returning();

                return updatedComment;
            } catch (error) {
                console.error('Error deleting comment:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to delete comment',
                });
            }
        }),

    // Soft delete a post
    deletePost: publicProcedure
        .input(
            z.object({
                postId: z.number(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to delete a post',
                });
            }

            const postToDelete = await db.query.posts.findFirst({
                where: eq(posts.id, input.postId),
            });

            if (!postToDelete) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Post not found',
                });
            }

            if (postToDelete.authorId !== ctx.session.user.id) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You are not authorized to delete this post',
                });
            }

            try {
                const [updatedPost] = await db
                    .update(posts)
                    .set({
                        isDeleted: true,
                        updatedAt: new Date(),
                    })
                    .where(eq(posts.id, input.postId))
                    .returning();

                return updatedPost;
            } catch (error) {
                console.error('Error deleting post:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to delete post',
                });
            }
        }),

    // Get statistics for the community
    getStats: publicProcedure.query(async ({ ctx }) => {
        if (!ctx.session?.user) {
            throw new TRPCError({
                code: 'UNAUTHORIZED',
                message: 'You must be logged in to view statistics',
            });
        }

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

            // Count total communities (orgs) in the database
            const orgsResult = await db.select({ count: count() }).from(orgs);

            const totalCommunities = orgsResult[0]?.count || 0;

            return {
                totalUsers,
                totalPosts,
                totalCommunities,
            };
        } catch (error) {
            console.error('Error fetching statistics:', error);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch statistics',
            });
        }
    }),

    // Get admin users for the community
    getAdmins: publicProcedure.query(async ({ ctx }) => {
        if (!ctx.session?.user) {
            throw new TRPCError({
                code: 'UNAUTHORIZED',
                message: 'You must be logged in to view admins',
            });
        }

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

            // Find admin users in the organization
            const adminUsers = await db.query.users.findMany({
                where: and(eq(users.orgId, orgId), eq(users.role, 'admin')),
                orderBy: [users.name],
            });

            return adminUsers;
        } catch (error) {
            console.error('Error fetching admins:', error);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch admins',
            });
        }
    }),

    // Create a new community
    create: publicProcedure
        .input(
            z.object({
                name: z.string().min(3).max(50),
                slug: z
                    .string()
                    .min(3)
                    .max(50)
                    .regex(/^[a-z0-9-]+$/),
                description: z.string().max(500).nullable(),
                type: z.enum(['public', 'private']),
                rules: z.string().max(2000).nullable(),
            }),
        )
        .mutation(
            async ({
                input,
                ctx,
            }: {
                input: {
                    name: string;
                    slug: string;
                    description: string | null;
                    type: 'public' | 'private';
                    rules: string | null;
                };
                ctx: Context;
            }) => {
                if (!ctx.session?.user) {
                    throw new TRPCError({
                        code: 'UNAUTHORIZED',
                        message: 'You must be logged in to create a community',
                    });
                }

                try {
                    // Check if slug is already taken
                    const existingCommunity =
                        await db.query.communities.findFirst({
                            where: eq(communities.slug, input.slug),
                        });

                    if (existingCommunity) {
                        throw new TRPCError({
                            code: 'BAD_REQUEST',
                            message: 'Community URL is already taken',
                        });
                    }

                    // Create the community
                    const [community] = await db
                        .insert(communities)
                        .values({
                            name: input.name,
                            slug: input.slug,
                            description: input.description,
                            type: input.type,
                            rules: input.rules,
                            createdBy: ctx.session.user.id,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        })
                        .returning();

                    // Add creator as an admin
                    await db.insert(communityMembers).values({
                        userId: ctx.session.user.id,
                        communityId: community.id,
                        role: 'admin',
                        membershipType: 'member',
                        status: 'active',
                        joinedAt: new Date(),
                        updatedAt: new Date(),
                    });

                    return community;
                } catch (error) {
                    if (error instanceof TRPCError) {
                        throw error;
                    }
                    console.error('Error creating community:', error);
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'Failed to create community',
                    });
                }
            },
        ),

    // Update community details (admin only)
    updateCommunity: publicProcedure
        .input(
            z.object({
                communityId: z.number(),
                name: z.string().min(3).max(50).optional(),
                description: z.string().max(500).nullable().optional(),
                rules: z.string().max(2000).nullable().optional(),
                banner: z.string().nullable().optional(),
                avatar: z.string().nullable().optional(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to update a community',
                });
            }

            // Check if user is an admin of the community
            const membership = await db.query.communityMembers.findFirst({
                where: and(
                    eq(communityMembers.userId, ctx.session.user.id),
                    eq(communityMembers.communityId, input.communityId),
                    eq(communityMembers.role, 'admin'),
                ),
            });

            if (!membership) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message:
                        'Only community admins can update community details',
                });
            }

            try {
                const updateData: any = {
                    updatedAt: new Date(),
                };

                if (input.name) updateData.name = input.name;
                if (input.description !== undefined)
                    updateData.description = input.description;
                if (input.rules !== undefined) updateData.rules = input.rules;
                if (input.banner !== undefined)
                    updateData.banner = input.banner;
                if (input.avatar !== undefined)
                    updateData.avatar = input.avatar;

                const [updatedCommunity] = await db
                    .update(communities)
                    .set(updateData)
                    .where(eq(communities.id, input.communityId))
                    .returning();

                return updatedCommunity;
            } catch (error) {
                console.error('Error updating community:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to update community',
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

            // Check if the current user is an admin of the community
            const adminMembership = await db.query.communityMembers.findFirst({
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
            const targetMembership = await db.query.communityMembers.findFirst({
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

            try {
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

            // Check if the current user is an admin of the community
            const adminMembership = await db.query.communityMembers.findFirst({
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
            const targetMembership = await db.query.communityMembers.findFirst({
                where: and(
                    eq(communityMembers.userId, input.userId),
                    eq(communityMembers.communityId, input.communityId),
                    eq(communityMembers.role, 'moderator'),
                ),
            });

            if (!targetMembership) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'The user is not a moderator of this community',
                });
            }

            try {
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
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to remove moderator role',
                });
            }
        }),

    // Create invite link for a community (admin and moderator)
    createInviteLink: publicProcedure
        .input(
            z.object({
                communityId: z.number(),
                role: z.enum(['member', 'moderator']).default('member'),
                expiresInDays: z.number().min(1).max(30).default(7),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to create invite links',
                });
            }

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

            if (!membership) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message:
                        'Only community admins and moderators can create invite links',
                });
            }

            // Only admins can create moderator invites
            if (input.role === 'moderator' && membership.role !== 'admin') {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message:
                        'Only community admins can create moderator invites',
                });
            }

            try {
                // Generate a unique code
                const code = crypto.randomUUID();

                // Calculate expiration date
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

                return {
                    ...invite,
                    inviteLink: `/communities/join/${code}`,
                };
            } catch (error) {
                console.error('Error creating invite link:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create invite link',
                });
            }
        }),

    // Get information about an invitation
    getInviteInfo: publicProcedure
        .input(
            z.object({
                inviteCode: z.string(),
            }),
        )
        .query(async ({ input }) => {
            try {
                // Find the invite with community information
                const invite = await db.query.communityInvites.findFirst({
                    where: eq(communityInvites.code, input.inviteCode),
                    with: {
                        community: true,
                        organization: true,
                    },
                });

                if (!invite) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Invalid invite code',
                    });
                }

                // Check if the invite has expired
                if (invite.expiresAt < new Date()) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'This invite has expired',
                    });
                }

                // Check if the invite has already been used
                if (invite.usedAt) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'This invite has already been used',
                    });
                }

                // Only return the necessary information
                return {
                    email: invite.email || null,
                    role: invite.role,
                    communityName: invite.community.name,
                    orgId: invite.orgId || null,
                };
            } catch (error) {
                if (error instanceof TRPCError) {
                    throw error;
                }
                console.error('Error getting invite info:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to get invite information',
                });
            }
        }),

    // Join a community via invite link
    joinViaInvite: publicProcedure
        .input(
            z.object({
                inviteCode: z.string(),
                // Add optional registration fields for new users
                registration: z
                    .object({
                        name: z.string().min(1),
                        password: z.string().min(8),
                    })
                    .optional(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to join a community',
                });
            }

            try {
                // Find the invite
                const invite = await db.query.communityInvites.findFirst({
                    where: eq(communityInvites.code, input.inviteCode),
                    with: {
                        community: true,
                    },
                });

                if (!invite) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Invalid invite code',
                    });
                }

                // Check if the invite has expired
                if (invite.expiresAt < new Date()) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'This invite has expired',
                    });
                }

                // Check if the invite has already been used
                if (invite.usedAt) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'This invite has already been used',
                    });
                }

                // Check if the user is already a member of the community
                const existingMembership =
                    await db.query.communityMembers.findFirst({
                        where: and(
                            eq(communityMembers.userId, ctx.session.user.id),
                            eq(
                                communityMembers.communityId,
                                invite.communityId,
                            ),
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

                    // Update membership from follower to member if needed
                    const [updatedMembership] = await db
                        .update(communityMembers)
                        .set({
                            membershipType: 'member',
                            role: invite.role,
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
                        )
                        .returning();

                    // Mark the invite as used
                    await db
                        .update(communityInvites)
                        .set({
                            usedAt: new Date(),
                            usedBy: ctx.session.user.id,
                        })
                        .where(eq(communityInvites.id, invite.id));

                    return {
                        membership: updatedMembership,
                        community: invite.community,
                    };
                }

                // Create a new membership with the role from the invitation
                const [newMembership] = await db
                    .insert(communityMembers)
                    .values({
                        userId: ctx.session.user.id,
                        communityId: invite.communityId,
                        role: invite.role,
                        membershipType: 'member',
                        status: 'active',
                        joinedAt: new Date(),
                        updatedAt: new Date(),
                    })
                    .returning();

                // Mark the invite as used
                await db
                    .update(communityInvites)
                    .set({
                        usedAt: new Date(),
                        usedBy: ctx.session.user.id,
                    })
                    .where(eq(communityInvites.id, invite.id));

                return {
                    membership: newMembership,
                    community: invite.community,
                };
            } catch (error) {
                if (error instanceof TRPCError) {
                    throw error;
                }
                console.error('Error joining community via invite:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to join community',
                });
            }
        }),

    // Send email invites to users for a community (admin and moderator)
    inviteUsersByEmail: publicProcedure
        .input(
            z.object({
                communityId: z.number(),
                emails: z.array(z.string().email()),
                role: z.enum(['member', 'moderator']).default('member'),
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

            if (!membership) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message:
                        'Only community admins and moderators can send invites',
                });
            }

            // Only admins can create moderator invites
            if (input.role === 'moderator' && membership.role !== 'admin') {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Only community admins can invite moderators',
                });
            }

            // Get community details
            const community = await db.query.communities.findFirst({
                where: eq(communities.id, input.communityId),
            });

            if (!community) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Community not found',
                });
            }

            // Get the current user's organization
            const currentUser = await db.query.users.findFirst({
                where: eq(users.id, ctx.session.user.id),
            });

            if (!currentUser?.orgId) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'User does not have an organization',
                });
            }

            try {
                const results = [];

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
                            orgId: currentUser.orgId, // Include the organization ID
                            createdBy: ctx.session.user.id,
                            createdAt: new Date(),
                            expiresAt,
                        })
                        .returning();

                    // Generate the invite link
                    const inviteLink = `/communities/join/${code}`;
                    const fullInviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${inviteLink}`;

                    // Determine the sender name to use
                    const senderName = input.senderName || community.name;

                    // Use the DEFAULT_EMAIL_FROM environment variable instead of SMTP_USER
                    const defaultFrom =
                        process.env.DEFAULT_EMAIL_FROM ||
                        'noreply@communities.app';

                    // Send the email directly to the recipient
                    const emailResult = await sendEmail({
                        to: email,
                        subject: `You're invited to join ${community.name}`,
                        from: senderName
                            ? `${senderName} <${defaultFrom}>`
                            : defaultFrom,
                        html: `
                            <h1>You've been invited to join ${community.name}</h1>
                            <p>${ctx.session.user.name || 'Someone'} has invited you to join the ${community.name} community as a ${input.role}.</p>
                            <p>Click the link below to accept the invitation:</p>
                            <p><a href="${fullInviteLink}" style="display: inline-block; padding: 10px 20px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px;">Accept Invitation</a></p>
                            <p>Or copy and paste this link into your browser:</p>
                            <p>${fullInviteLink}</p>
                            <p><strong>If you don't have an account yet, you'll be able to create one when you accept the invitation.</strong></p>
                            <p>This invitation will expire in 7 days.</p>
                        `,
                    });

                    // Add detailed logging for email sending results
                    console.log('Email invitation result:', {
                        email,
                        success: emailResult.success,
                        error: emailResult.error,
                        data: emailResult.data,
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
});
