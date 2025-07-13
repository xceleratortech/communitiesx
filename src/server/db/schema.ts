import {
    pgTable,
    serial,
    text,
    timestamp,
    integer,
    boolean,
    primaryKey,
    varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Import auth schema first
import { users, orgs, usersRelations, orgsRelations } from './auth-schema';

// Re-export auth schema
export * from './auth-schema';

// Existing table
export const hello = pgTable('hello', {
    id: serial('id').primaryKey(),
    greeting: text('greeting').notNull(),
});

export const tags = pgTable('tags', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    communityId: integer('community_id')
        .notNull()
        .references(() => communities.id, { onDelete: 'cascade' }),
});

export const postTags = pgTable(
    'post_tags',
    {
        postId: integer('post_id')
            .notNull()
            .references(() => posts.id, { onDelete: 'cascade' }),
        tagId: integer('tag_id')
            .notNull()
            .references(() => tags.id, { onDelete: 'cascade' }),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => {
        return {
            pk: primaryKey({ columns: [table.postId, table.tagId] }),
        };
    },
);

// Communities schema
export const communities = pgTable('communities', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    description: text('description'),
    type: text('type').notNull().default('public'), // 'public' | 'private'
    rules: text('rules'),
    banner: text('banner'),
    avatar: text('avatar'),
    createdBy: text('created_by')
        .notNull()
        .references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const communityMembers = pgTable(
    'community_members',
    {
        userId: text('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        communityId: integer('community_id')
            .notNull()
            .references(() => communities.id, { onDelete: 'cascade' }),
        role: text('role').notNull().default('member'), // 'admin' | 'moderator' | 'member' | 'follower'
        membershipType: text('membership_type').notNull(), // 'member' | 'follower'
        status: text('status').notNull().default('active'), // 'active' | 'pending'
        joinedAt: timestamp('joined_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow(),
    },
    (table) => {
        return {
            pk: primaryKey({ columns: [table.userId, table.communityId] }),
        };
    },
);

export const communityMemberRequests = pgTable('community_member_requests', {
    id: serial('id').primaryKey(),
    userId: text('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    communityId: integer('community_id')
        .notNull()
        .references(() => communities.id, { onDelete: 'cascade' }),
    requestType: text('request_type').notNull(), // 'join' | 'follow'
    status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
    message: text('message'),
    requestedAt: timestamp('requested_at').notNull().defaultNow(),
    reviewedAt: timestamp('reviewed_at'),
    reviewedBy: text('reviewed_by').references(() => users.id),
});

export const communityAllowedOrgs = pgTable(
    'community_allowed_orgs',
    {
        communityId: integer('community_id')
            .notNull()
            .references(() => communities.id, { onDelete: 'cascade' }),
        orgId: text('org_id')
            .notNull()
            .references(() => orgs.id, { onDelete: 'cascade' }),
        permissions: text('permissions').notNull().default('view'), // 'view' | 'join'
        addedAt: timestamp('added_at').notNull().defaultNow(),
        addedBy: text('added_by')
            .notNull()
            .references(() => users.id),
    },
    (table) => {
        return {
            pk: primaryKey({ columns: [table.communityId, table.orgId] }),
        };
    },
);

export const communityInvites = pgTable('community_invites', {
    id: serial('id').primaryKey(),
    communityId: integer('community_id')
        .notNull()
        .references(() => communities.id, { onDelete: 'cascade' }),
    email: text('email'),
    code: varchar('code', { length: 64 }).notNull().unique(),
    role: text('role').notNull().default('member'), // 'member' | 'moderator'
    orgId: text('org_id').references(() => orgs.id), // Organization the invited user should join
    createdBy: text('created_by')
        .notNull()
        .references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'),
    usedBy: text('used_by').references(() => users.id),
});

// Community schema
export const posts = pgTable('posts', {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    authorId: text('author_id')
        .notNull()
        .references(() => users.id),
    orgId: text('org_id')
        .notNull()
        .references(() => orgs.id),
    communityId: integer('community_id').references(() => communities.id),
    visibility: text('visibility').notNull().default('public'), // 'public' | 'community'
    isDeleted: boolean('is_deleted').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Define comments table with type assertion to handle self-reference
export const comments = pgTable('comments', {
    id: serial('id').primaryKey(),
    content: text('content').notNull(),
    postId: integer('post_id')
        .notNull()
        .references(() => posts.id),
    authorId: text('author_id')
        .notNull()
        .references(() => users.id),
    parentId: integer('parent_id').references((): any => comments.id),
    isDeleted: boolean('is_deleted').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const reactions = pgTable('reactions', {
    id: serial('id').primaryKey(),
    postId: integer('post_id')
        .notNull()
        .references(() => posts.id, { onDelete: 'cascade' }),
    userId: text('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Define relations
export const communitiesRelations = relations(communities, ({ one, many }) => ({
    creator: one(users, {
        fields: [communities.createdBy],
        references: [users.id],
    }),
    members: many(communityMembers),
    posts: many(posts),
    allowedOrgs: many(communityAllowedOrgs),
    invites: many(communityInvites),
    memberRequests: many(communityMemberRequests),
    tags: many(tags), // <-- Add this line to relate tags to communities
}));

export const communityMembersRelations = relations(
    communityMembers,
    ({ one }) => ({
        user: one(users, {
            fields: [communityMembers.userId],
            references: [users.id],
        }),
        community: one(communities, {
            fields: [communityMembers.communityId],
            references: [communities.id],
        }),
    }),
);

export const communityMemberRequestsRelations = relations(
    communityMemberRequests,
    ({ one }) => ({
        user: one(users, {
            fields: [communityMemberRequests.userId],
            references: [users.id],
        }),
        community: one(communities, {
            fields: [communityMemberRequests.communityId],
            references: [communities.id],
        }),
        reviewer: one(users, {
            fields: [communityMemberRequests.reviewedBy],
            references: [users.id],
            relationName: 'requestReviewer',
        }),
    }),
);

export const communityAllowedOrgsRelations = relations(
    communityAllowedOrgs,
    ({ one }) => ({
        community: one(communities, {
            fields: [communityAllowedOrgs.communityId],
            references: [communities.id],
        }),
        organization: one(orgs, {
            fields: [communityAllowedOrgs.orgId],
            references: [orgs.id],
        }),
        addedByUser: one(users, {
            fields: [communityAllowedOrgs.addedBy],
            references: [users.id],
        }),
    }),
);

export const communityInvitesRelations = relations(
    communityInvites,
    ({ one }) => ({
        community: one(communities, {
            fields: [communityInvites.communityId],
            references: [communities.id],
        }),
        organization: one(orgs, {
            fields: [communityInvites.orgId],
            references: [orgs.id],
        }),
        creator: one(users, {
            fields: [communityInvites.createdBy],
            references: [users.id],
            relationName: 'inviteCreator',
        }),
        usedByUser: one(users, {
            fields: [communityInvites.usedBy],
            references: [users.id],
            relationName: 'inviteUser',
        }),
    }),
);

export const postsRelations = relations(posts, ({ one, many }) => ({
    author: one(users, {
        fields: [posts.authorId],
        references: [users.id],
    }),
    organization: one(orgs, {
        fields: [posts.orgId],
        references: [orgs.id],
    }),
    community: one(communities, {
        fields: [posts.communityId],
        references: [communities.id],
    }),
    comments: many(comments),
    postTags: many(postTags),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
    post: one(posts, {
        fields: [postTags.postId],
        references: [posts.id],
    }),
    tag: one(tags, {
        fields: [postTags.tagId],
        references: [tags.id],
    }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
    post: one(posts, {
        fields: [comments.postId],
        references: [posts.id],
    }),
    author: one(users, {
        fields: [comments.authorId],
        references: [users.id],
    }),
}));

// Add extended relations for users and orgs
export const extendedUsersRelations = relations(users, ({ many }) => ({
    // Community-related relations
    createdCommunities: many(communities),
    communityMemberships: many(communityMembers),
    communityRequests: many(communityMemberRequests),
    reviewedRequests: many(communityMemberRequests, {
        relationName: 'requestReviewer',
    }),
    createdInvites: many(communityInvites, { relationName: 'inviteCreator' }),
    usedInvites: many(communityInvites, { relationName: 'inviteUser' }),
    posts: many(posts),
    comments: many(comments),
    // Push & Notifications
    pushSubscriptions: many(pushSubscriptions),
    notifications: many(notifications),
}));

export const extendedOrgsRelations = relations(orgs, ({ many }) => ({
    // Community-related relations
    allowedCommunities: many(communityAllowedOrgs),
    posts: many(posts),
}));

// Chat schema for direct messaging
export const chatThreads = pgTable('chat_threads', {
    id: serial('id').primaryKey(),
    user1Id: text('user1_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    user2Id: text('user2_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    orgId: text('org_id')
        .notNull()
        .references(() => orgs.id, { onDelete: 'cascade' }),
    lastMessageAt: timestamp('last_message_at').notNull().defaultNow(),
    lastMessagePreview: text('last_message_preview'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const directMessages = pgTable('direct_messages', {
    id: serial('id').primaryKey(),
    threadId: integer('thread_id')
        .notNull()
        .references(() => chatThreads.id, { onDelete: 'cascade' }),
    senderId: text('sender_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    recipientId: text('recipient_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Chat relations
export const chatThreadsRelations = relations(chatThreads, ({ one, many }) => ({
    user1: one(users, {
        fields: [chatThreads.user1Id],
        references: [users.id],
        relationName: 'user1Threads',
    }),
    user2: one(users, {
        fields: [chatThreads.user2Id],
        references: [users.id],
        relationName: 'user2Threads',
    }),
    organization: one(orgs, {
        fields: [chatThreads.orgId],
        references: [orgs.id],
    }),
    messages: many(directMessages),
}));

export const directMessagesRelations = relations(directMessages, ({ one }) => ({
    thread: one(chatThreads, {
        fields: [directMessages.threadId],
        references: [chatThreads.id],
    }),
    sender: one(users, {
        fields: [directMessages.senderId],
        references: [users.id],
        relationName: 'sentMessages',
    }),
    recipient: one(users, {
        fields: [directMessages.recipientId],
        references: [users.id],
        relationName: 'receivedMessages',
    }),
}));

// Add chat relations to users
export const userChatRelations = relations(users, ({ many }) => ({
    // Existing relations...
    user1Threads: many(chatThreads, { relationName: 'user1Threads' }),
    user2Threads: many(chatThreads, { relationName: 'user2Threads' }),
    sentMessages: many(directMessages, { relationName: 'sentMessages' }),
    receivedMessages: many(directMessages, {
        relationName: 'receivedMessages',
    }),
}));

export const pushSubscriptions = pgTable('push_subscriptions', {
    id: serial('id').primaryKey(),
    userId: text('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),

    endpoint: text('endpoint').notNull().unique(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const notifications = pgTable('notifications', {
    id: serial('id').primaryKey(),
    recipientId: text('recipient_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),

    title: text('title').notNull(),
    body: text('body').notNull(),

    type: text('type').notNull(), // e.g., 'dm', 'mention', 'comment'
    data: text('data'), // e.g., threadId/messageId in JSON format
    isRead: boolean('is_read').notNull().default(false),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Add tags relations
export const tagsRelations = relations(tags, ({ one, many }) => ({
    community: one(communities, {
        fields: [tags.communityId],
        references: [communities.id],
    }),
    postTags: many(postTags),
}));
