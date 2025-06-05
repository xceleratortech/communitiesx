import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { db } from '@/server/db';
import { chatThreads, directMessages, users } from '@/server/db/schema';
import { TRPCError } from '@trpc/server';
import { eq, and, or, desc, gt, sql, asc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

export const chatRouter = router({
    // Get all chat threads for the current user
    getThreads: publicProcedure.query(async ({ ctx }) => {
        if (!ctx.session?.user) {
            throw new TRPCError({
                code: 'UNAUTHORIZED',
                message: 'You must be logged in to view messages',
            });
        }

        try {
            const userId = ctx.session.user.id;

            // Get all threads where the current user is involved
            const threads = await db.query.chatThreads.findMany({
                where: or(
                    eq(chatThreads.user1Id, userId),
                    eq(chatThreads.user2Id, userId),
                ),
                orderBy: desc(chatThreads.lastMessageAt),
                with: {
                    user1: {
                        columns: {
                            id: true,
                            name: true,
                            email: true,
                            image: true,
                        },
                    },
                    user2: {
                        columns: {
                            id: true,
                            name: true,
                            email: true,
                            image: true,
                        },
                    },
                },
            });

            // Get unread message counts for each thread
            const threadsWithUnreadCounts = await Promise.all(
                threads.map(async (thread) => {
                    const unreadCount = await db
                        .select({ count: sql<number>`count(*)` })
                        .from(directMessages)
                        .where(
                            and(
                                eq(directMessages.threadId, thread.id),
                                eq(directMessages.recipientId, userId),
                                eq(directMessages.isRead, false),
                            ),
                        );

                    // Determine the other user in the conversation
                    const otherUser =
                        thread.user1Id === userId ? thread.user2 : thread.user1;

                    return {
                        ...thread,
                        unreadCount: unreadCount[0]?.count || 0,
                        otherUser,
                    };
                }),
            );

            return threadsWithUnreadCounts;
        } catch (error) {
            console.error('Error fetching chat threads:', error);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch chat threads',
            });
        }
    }),

    // Get messages for a specific thread
    getMessages: publicProcedure
        .input(
            z.object({
                threadId: z.number(),
                limit: z.number().optional().default(50),
                cursor: z.number().optional(), // For pagination
            }),
        )
        .query(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to view messages',
                });
            }

            try {
                const userId = ctx.session.user.id;

                // Check if user is part of the thread
                const thread = await db.query.chatThreads.findFirst({
                    where: and(
                        eq(chatThreads.id, input.threadId),
                        or(
                            eq(chatThreads.user1Id, userId),
                            eq(chatThreads.user2Id, userId),
                        ),
                    ),
                });

                if (!thread) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'You do not have access to this chat thread',
                    });
                }

                // Get messages with pagination
                let query = db.query.directMessages.findMany({
                    where: eq(directMessages.threadId, input.threadId),
                    orderBy: asc(directMessages.createdAt),
                    limit: input.limit,
                    with: {
                        sender: {
                            columns: {
                                id: true,
                                name: true,
                                email: true,
                                image: true,
                            },
                        },
                    },
                });

                // Apply cursor if provided
                if (input.cursor) {
                    query = db.query.directMessages.findMany({
                        where: and(
                            eq(directMessages.threadId, input.threadId),
                            sql`${directMessages.id} > ${input.cursor}`,
                        ),
                        orderBy: asc(directMessages.createdAt),
                        limit: input.limit,
                        with: {
                            sender: {
                                columns: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    image: true,
                                },
                            },
                        },
                    });
                }

                const messages = await query;

                // Mark messages as read
                await db
                    .update(directMessages)
                    .set({ isRead: true })
                    .where(
                        and(
                            eq(directMessages.threadId, input.threadId),
                            eq(directMessages.recipientId, userId),
                            eq(directMessages.isRead, false),
                        ),
                    );

                // Get the next cursor
                const nextCursor =
                    messages.length > 0
                        ? messages[messages.length - 1].id
                        : null;

                return {
                    messages,
                    nextCursor,
                };
            } catch (error) {
                console.error('Error fetching messages:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch messages',
                });
            }
        }),

    // Send a new message
    sendMessage: publicProcedure
        .input(
            z.object({
                recipientId: z.string(),
                content: z.string().min(1).max(2000),
                threadId: z.number().optional(), // Optional if creating a new thread
            }),
        )
        .mutation(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to send messages',
                });
            }

            try {
                const senderId = ctx.session.user.id;

                // Get sender's org
                const sender = await db.query.users.findFirst({
                    where: eq(users.id, senderId),
                });

                if (!sender?.orgId) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'User does not belong to an organization',
                    });
                }

                // Check if recipient exists and is in the same org
                const recipient = await db.query.users.findFirst({
                    where: eq(users.id, input.recipientId),
                });

                if (!recipient) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Recipient not found',
                    });
                }

                if (recipient.orgId !== sender.orgId) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You can only message users in your organization',
                    });
                }

                let threadId = input.threadId;

                // If no threadId provided, find existing thread or create new one
                if (!threadId) {
                    // Check if thread already exists between these users
                    const existingThread = await db.query.chatThreads.findFirst(
                        {
                            where: or(
                                and(
                                    eq(chatThreads.user1Id, senderId),
                                    eq(chatThreads.user2Id, input.recipientId),
                                ),
                                and(
                                    eq(chatThreads.user1Id, input.recipientId),
                                    eq(chatThreads.user2Id, senderId),
                                ),
                            ),
                        },
                    );

                    if (existingThread) {
                        threadId = existingThread.id;
                    } else {
                        // Create new thread
                        const [newThread] = await db
                            .insert(chatThreads)
                            .values({
                                user1Id: senderId,
                                user2Id: input.recipientId,
                                orgId: sender.orgId,
                                lastMessageAt: new Date(),
                                lastMessagePreview: input.content.substring(
                                    0,
                                    50,
                                ),
                                createdAt: new Date(),
                            })
                            .returning();

                        threadId = newThread.id;
                    }
                }

                // Send the message
                const [message] = await db
                    .insert(directMessages)
                    .values({
                        threadId,
                        senderId,
                        recipientId: input.recipientId,
                        content: input.content,
                        createdAt: new Date(),
                    })
                    .returning();

                // Update the thread's last message info
                await db
                    .update(chatThreads)
                    .set({
                        lastMessageAt: new Date(),
                        lastMessagePreview: input.content.substring(0, 50),
                    })
                    .where(eq(chatThreads.id, threadId));

                // Get the message with sender info
                const messageWithSender =
                    await db.query.directMessages.findFirst({
                        where: eq(directMessages.id, message.id),
                        with: {
                            sender: {
                                columns: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    image: true,
                                },
                            },
                        },
                    });

                return {
                    message: messageWithSender,
                    threadId,
                };
            } catch (error) {
                console.error('Error sending message:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to send message',
                });
            }
        }),

    // Get new messages since a specific timestamp (for polling)
    getNewMessages: publicProcedure
        .input(
            z.object({
                threadId: z.number(),
                since: z.date(),
            }),
        )
        .query(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to view messages',
                });
            }

            try {
                const userId = ctx.session.user.id;

                // Check if user is part of the thread
                const thread = await db.query.chatThreads.findFirst({
                    where: and(
                        eq(chatThreads.id, input.threadId),
                        or(
                            eq(chatThreads.user1Id, userId),
                            eq(chatThreads.user2Id, userId),
                        ),
                    ),
                });

                if (!thread) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'You do not have access to this chat thread',
                    });
                }

                // Get new messages since the specified timestamp
                const newMessages = await db.query.directMessages.findMany({
                    where: and(
                        eq(directMessages.threadId, input.threadId),
                        gt(directMessages.createdAt, input.since),
                    ),
                    orderBy: asc(directMessages.createdAt),
                    with: {
                        sender: {
                            columns: {
                                id: true,
                                name: true,
                                email: true,
                                image: true,
                            },
                        },
                    },
                });

                // Mark messages as read if the current user is the recipient
                await db
                    .update(directMessages)
                    .set({ isRead: true })
                    .where(
                        and(
                            eq(directMessages.threadId, input.threadId),
                            eq(directMessages.recipientId, userId),
                            eq(directMessages.isRead, false),
                        ),
                    );

                return newMessages;
            } catch (error) {
                console.error('Error fetching new messages:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch new messages',
                });
            }
        }),

    // Get total unread message count
    getUnreadCount: publicProcedure.query(async ({ ctx }) => {
        if (!ctx.session?.user) {
            throw new TRPCError({
                code: 'UNAUTHORIZED',
                message: 'You must be logged in to view unread count',
            });
        }

        try {
            const userId = ctx.session.user.id;

            const result = await db
                .select({ count: sql<number>`count(*)` })
                .from(directMessages)
                .where(
                    and(
                        eq(directMessages.recipientId, userId),
                        eq(directMessages.isRead, false),
                    ),
                );

            return result[0]?.count || 0;
        } catch (error) {
            console.error('Error fetching unread count:', error);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch unread count',
            });
        }
    }),

    // Get users in the same org for starting new conversations
    getOrgUsers: publicProcedure.query(async ({ ctx }) => {
        if (!ctx.session?.user) {
            throw new TRPCError({
                code: 'UNAUTHORIZED',
                message: 'You must be logged in to view org users',
            });
        }

        try {
            const userId = ctx.session.user.id;

            // Get user's org
            const user = await db.query.users.findFirst({
                where: eq(users.id, userId),
            });

            if (!user?.orgId) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'User does not belong to an organization',
                });
            }

            // Get all users in the same org except the current user
            const orgUsers = await db.query.users.findMany({
                where: and(
                    eq(users.orgId, user.orgId),
                    sql`${users.id} != ${userId}`,
                ),
                columns: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                },
            });

            return orgUsers;
        } catch (error) {
            console.error('Error fetching org users:', error);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch org users',
            });
        }
    }),

    // Find an existing thread or create a new one
    findOrCreateThread: publicProcedure
        .input(
            z.object({
                recipientId: z.string(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to access chat threads',
                });
            }

            try {
                const senderId = ctx.session.user.id;

                if (senderId === input.recipientId) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'Cannot create a chat thread with yourself',
                    });
                }

                // Get sender's org
                const sender = await db.query.users.findFirst({
                    where: eq(users.id, senderId),
                });

                if (!sender?.orgId) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'User does not belong to an organization',
                    });
                }

                // Check if recipient exists and is in the same org
                const recipient = await db.query.users.findFirst({
                    where: eq(users.id, input.recipientId),
                });

                if (!recipient) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Recipient not found',
                    });
                }

                if (recipient.orgId !== sender.orgId) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You can only message users in your organization',
                    });
                }

                // Check if thread already exists between these users
                const existingThread = await db.query.chatThreads.findFirst({
                    where: or(
                        and(
                            eq(chatThreads.user1Id, senderId),
                            eq(chatThreads.user2Id, input.recipientId),
                        ),
                        and(
                            eq(chatThreads.user1Id, input.recipientId),
                            eq(chatThreads.user2Id, senderId),
                        ),
                    ),
                });

                if (existingThread) {
                    return { threadId: existingThread.id, isNew: false };
                }

                // Create new thread
                const [newThread] = await db
                    .insert(chatThreads)
                    .values({
                        user1Id: senderId,
                        user2Id: input.recipientId,
                        orgId: sender.orgId,
                        lastMessageAt: new Date(),
                        lastMessagePreview: 'New conversation',
                        createdAt: new Date(),
                    })
                    .returning();

                return { threadId: newThread.id, isNew: true };
            } catch (error) {
                console.error('Error finding or creating thread:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to find or create chat thread',
                });
            }
        }),

    // Get thread by ID
    getThreadById: publicProcedure
        .input(
            z.object({
                threadId: z.number(),
            }),
        )
        .query(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to view thread details',
                });
            }

            try {
                const userId = ctx.session.user.id;

                // Check if user is part of the thread
                const thread = await db.query.chatThreads.findFirst({
                    where: and(
                        eq(chatThreads.id, input.threadId),
                        or(
                            eq(chatThreads.user1Id, userId),
                            eq(chatThreads.user2Id, userId),
                        ),
                    ),
                    columns: {
                        id: true,
                        user1Id: true,
                        user2Id: true,
                        orgId: true,
                        createdAt: true,
                        lastMessageAt: true,
                    },
                    with: {
                        user1: {
                            columns: {
                                id: true,
                                name: true,
                                email: true,
                                image: true,
                            },
                        },
                        user2: {
                            columns: {
                                id: true,
                                name: true,
                                email: true,
                                image: true,
                            },
                        },
                    },
                });

                if (!thread) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'You do not have access to this chat thread',
                    });
                }

                return thread;
            } catch (error) {
                console.error('Error fetching thread details:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch thread details',
                });
            }
        }),
});
