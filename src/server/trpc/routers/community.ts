import { z } from 'zod';
import { router, publicProcedure } from '@/server/trpc/trpc';
import { posts, comments } from '@/server/db/schema';
import { TRPCError } from '@trpc/server';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/server/db';
import type { Context } from '@/server/trpc/context';

// Define types for the responses
type User = {
    id: string;
    name: string | null;
    email: string;
};

type Post = {
    id: number;
    title: string;
    content: string;
    authorId: string;
    createdAt: Date;
    updatedAt: Date;
    author: User;
};

type Comment = {
    id: number;
    content: string;
    postId: number;
    authorId: string;
    createdAt: Date;
    updatedAt: Date;
    author: User;
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
                    const [post] = await db
                        .insert(posts)
                        .values({
                            title: input.title,
                            content: input.content,
                            authorId: ctx.session.user.id,
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

    // Get all posts
    getPosts: publicProcedure.query(async (): Promise<Post[]> => {
        try {
            const allPosts = await db.query.posts.findMany({
                orderBy: desc(posts.createdAt),
                with: {
                    author: true,
                },
            });

            return allPosts;
        } catch (error) {
            console.error('Error fetching posts:', error);
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
        .query(async ({ input }): Promise<Post & { comments: Comment[] }> => {
            try {
                const post = await db.query.posts.findFirst({
                    where: eq(posts.id, input.postId),
                    with: {
                        author: true,
                        comments: {
                            with: {
                                author: true,
                            },
                            orderBy: desc(comments.createdAt),
                        },
                    },
                });

                if (!post) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Post not found',
                    });
                }

                return post;
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
            }),
        )
        .mutation(
            async ({
                input,
                ctx,
            }: {
                input: { postId: number; content: string };
                ctx: Context;
            }) => {
                if (!ctx.session?.user) {
                    throw new TRPCError({
                        code: 'UNAUTHORIZED',
                        message: 'You must be logged in to comment',
                    });
                }

                try {
                    // First check if the post exists
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
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        })
                        .returning();

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
});
