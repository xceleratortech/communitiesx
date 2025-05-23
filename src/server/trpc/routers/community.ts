import { z } from 'zod';
import { router, publicProcedure } from '@/server/trpc/trpc';
import { posts, comments, users, orgs } from '@/server/db/schema';
import { TRPCError } from '@trpc/server';
import { eq, desc, count, and } from 'drizzle-orm';
import { db } from '@/server/db';
import type { Context } from '@/server/trpc/context';

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
};

export const communityRouter = router({
    // Create a new post
    createPost: publicProcedure
        .input(
            z.object({
                title: z.string().min(1).max(200),
                content: z.string().min(1),
            }),
        )
        .mutation(
            async ({
                input,
                ctx,
            }: {
                input: { title: string; content: string };
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
                    const [post] = await db
                        .insert(posts)
                        .values({
                            title: input.title,
                            content: input.content,
                            authorId: ctx.session.user.id,
                            orgId: orgId,
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

    // Get all posts (org-specific)
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
                    where: eq(posts.orgId, orgId),
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

    // Get a single post with its comments
    getPost: publicProcedure
        .input(
            z.object({
                postId: z.number(),
            }),
        )
        .query(async ({ input }): Promise<PostWithAuthorAndComments> => {
            try {
                const postFromDb = await db.query.posts.findFirst({
                    where: eq(posts.id, input.postId),
                    with: {
                        author: true,
                        // We will fetch comments as a flat list and then structure them
                        // comments: {
                        //     with: {
                        //         author: true,
                        //     },
                        //     orderBy: desc(comments.createdAt),
                        // },
                    },
                });

                if (!postFromDb) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Post not found',
                    });
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
});
