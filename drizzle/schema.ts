import {
    pgTable,
    foreignKey,
    unique,
    serial,
    text,
    varchar,
    timestamp,
    jsonb,
    boolean,
    integer,
    primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const communities = pgTable(
    'communities',
    {
        id: serial().primaryKey().notNull(),
        name: text().notNull(),
        slug: varchar({ length: 255 }).notNull(),
        description: text(),
        type: text().default('public').notNull(),
        rules: text(),
        banner: text(),
        avatar: text(),
        orgId: text('org_id'),
        createdBy: text('created_by').notNull(),
        createdAt: timestamp('created_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp('updated_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
        postCreationMinRole: text('post_creation_min_role')
            .default('member')
            .notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.orgId],
            foreignColumns: [orgs.id],
            name: 'communities_org_id_orgs_id_fk',
        }),
        foreignKey({
            columns: [table.createdBy],
            foreignColumns: [users.id],
            name: 'communities_created_by_users_id_fk',
        }),
        unique('communities_slug_unique').on(table.slug),
    ],
);

export const userBadges = pgTable(
    'user_badges',
    {
        id: serial().primaryKey().notNull(),
        name: text().notNull(),
        description: text(),
        icon: text(),
        color: text().default('#3B82F6').notNull(),
        orgId: text('org_id').notNull(),
        createdBy: text('created_by').notNull(),
        createdAt: timestamp('created_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp('updated_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.orgId],
            foreignColumns: [orgs.id],
            name: 'user_badges_org_id_orgs_id_fk',
        }).onDelete('cascade'),
        foreignKey({
            columns: [table.createdBy],
            foreignColumns: [users.id],
            name: 'user_badges_created_by_users_id_fk',
        }),
    ],
);

export const userProfiles = pgTable(
    'user_profiles',
    {
        id: serial().primaryKey().notNull(),
        userId: text('user_id').notNull(),
        metadata: jsonb().default({}).notNull(),
        createdAt: timestamp('created_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp('updated_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.id],
            name: 'user_profiles_user_id_users_id_fk',
        }).onDelete('cascade'),
        unique('user_profiles_user_id_unique').on(table.userId),
    ],
);

export const chatThreads = pgTable(
    'chat_threads',
    {
        id: serial().primaryKey().notNull(),
        user1Id: text('user1_id').notNull(),
        user2Id: text('user2_id').notNull(),
        orgId: text('org_id').notNull(),
        lastMessageAt: timestamp('last_message_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
        lastMessagePreview: text('last_message_preview'),
        createdAt: timestamp('created_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.user1Id],
            foreignColumns: [users.id],
            name: 'chat_threads_user1_id_users_id_fk',
        }).onDelete('cascade'),
        foreignKey({
            columns: [table.user2Id],
            foreignColumns: [users.id],
            name: 'chat_threads_user2_id_users_id_fk',
        }).onDelete('cascade'),
        foreignKey({
            columns: [table.orgId],
            foreignColumns: [orgs.id],
            name: 'chat_threads_org_id_orgs_id_fk',
        }).onDelete('cascade'),
    ],
);

export const hello = pgTable('hello', {
    id: serial().primaryKey().notNull(),
    greeting: text().notNull(),
});

export const notifications = pgTable(
    'notifications',
    {
        id: serial().primaryKey().notNull(),
        recipientId: text('recipient_id').notNull(),
        title: text().notNull(),
        body: text().notNull(),
        type: text().notNull(),
        data: text(),
        isRead: boolean('is_read').default(false).notNull(),
        createdAt: timestamp('created_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp('updated_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.recipientId],
            foreignColumns: [users.id],
            name: 'notifications_recipient_id_users_id_fk',
        }).onDelete('cascade'),
    ],
);

export const orgs = pgTable(
    'orgs',
    {
        id: text().primaryKey().notNull(),
        name: text().notNull(),
        slug: text().notNull(),
        createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
        allowCrossOrgDm: boolean('allow_cross_org_dm').default(false).notNull(),
    },
    (table) => [
        unique('orgs_name_unique').on(table.name),
        unique('orgs_slug_unique').on(table.slug),
    ],
);

export const posts = pgTable(
    'posts',
    {
        id: serial().primaryKey().notNull(),
        title: text().notNull(),
        content: text().notNull(),
        authorId: text('author_id').notNull(),
        orgId: text('org_id').notNull(),
        communityId: integer('community_id'),
        visibility: text().default('public').notNull(),
        isDeleted: boolean('is_deleted').default(false).notNull(),
        createdAt: timestamp('created_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp('updated_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.authorId],
            foreignColumns: [users.id],
            name: 'posts_author_id_users_id_fk',
        }),
        foreignKey({
            columns: [table.orgId],
            foreignColumns: [orgs.id],
            name: 'posts_org_id_orgs_id_fk',
        }),
        foreignKey({
            columns: [table.communityId],
            foreignColumns: [communities.id],
            name: 'posts_community_id_communities_id_fk',
        }),
    ],
);

export const pushSubscriptions = pgTable(
    'push_subscriptions',
    {
        id: serial().primaryKey().notNull(),
        userId: text('user_id').notNull(),
        endpoint: text().notNull(),
        p256Dh: text().notNull(),
        auth: text().notNull(),
        createdAt: timestamp('created_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp('updated_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.id],
            name: 'push_subscriptions_user_id_users_id_fk',
        }).onDelete('cascade'),
        unique('push_subscriptions_endpoint_unique').on(table.endpoint),
    ],
);

export const accounts = pgTable(
    'accounts',
    {
        id: text().primaryKey().notNull(),
        accountId: text('account_id').notNull(),
        providerId: text('provider_id').notNull(),
        userId: text('user_id').notNull(),
        accessToken: text('access_token'),
        refreshToken: text('refresh_token'),
        idToken: text('id_token'),
        accessTokenExpiresAt: timestamp('access_token_expires_at', {
            mode: 'string',
        }),
        refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
            mode: 'string',
        }),
        scope: text(),
        password: text(),
        createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
        updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.id],
            name: 'accounts_user_id_users_id_fk',
        }).onDelete('cascade'),
    ],
);

export const users = pgTable(
    'users',
    {
        id: text().primaryKey().notNull(),
        name: text().notNull(),
        email: text().notNull(),
        emailVerified: boolean('email_verified').notNull(),
        image: text(),
        orgId: text('org_id'),
        role: text().default('user').notNull(),
        appRole: text('app_role').default('user').notNull(),
        createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
        updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.orgId],
            foreignColumns: [orgs.id],
            name: 'users_org_id_orgs_id_fk',
        }),
        unique('users_email_unique').on(table.email),
    ],
);

export const verifications = pgTable('verifications', {
    id: text().primaryKey().notNull(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }),
    updatedAt: timestamp('updated_at', { mode: 'string' }),
});

export const directMessages = pgTable(
    'direct_messages',
    {
        id: serial().primaryKey().notNull(),
        threadId: integer('thread_id').notNull(),
        senderId: text('sender_id').notNull(),
        recipientId: text('recipient_id').notNull(),
        content: text().notNull(),
        isRead: boolean('is_read').default(false).notNull(),
        createdAt: timestamp('created_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.threadId],
            foreignColumns: [chatThreads.id],
            name: 'direct_messages_thread_id_chat_threads_id_fk',
        }).onDelete('cascade'),
        foreignKey({
            columns: [table.senderId],
            foreignColumns: [users.id],
            name: 'direct_messages_sender_id_users_id_fk',
        }).onDelete('cascade'),
        foreignKey({
            columns: [table.recipientId],
            foreignColumns: [users.id],
            name: 'direct_messages_recipient_id_users_id_fk',
        }).onDelete('cascade'),
    ],
);

export const communityInvites = pgTable(
    'community_invites',
    {
        id: serial().primaryKey().notNull(),
        communityId: integer('community_id').notNull(),
        email: text(),
        code: varchar({ length: 64 }).notNull(),
        role: text().default('member').notNull(),
        orgId: text('org_id'),
        createdBy: text('created_by').notNull(),
        createdAt: timestamp('created_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
        expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
        usedAt: timestamp('used_at', { mode: 'string' }),
        usedBy: text('used_by'),
    },
    (table) => [
        foreignKey({
            columns: [table.communityId],
            foreignColumns: [communities.id],
            name: 'community_invites_community_id_communities_id_fk',
        }).onDelete('cascade'),
        foreignKey({
            columns: [table.orgId],
            foreignColumns: [orgs.id],
            name: 'community_invites_org_id_orgs_id_fk',
        }),
        foreignKey({
            columns: [table.createdBy],
            foreignColumns: [users.id],
            name: 'community_invites_created_by_users_id_fk',
        }),
        foreignKey({
            columns: [table.usedBy],
            foreignColumns: [users.id],
            name: 'community_invites_used_by_users_id_fk',
        }),
        unique('community_invites_code_unique').on(table.code),
    ],
);

export const comments = pgTable(
    'comments',
    {
        id: serial().primaryKey().notNull(),
        content: text().notNull(),
        postId: integer('post_id').notNull(),
        authorId: text('author_id').notNull(),
        parentId: integer('parent_id'),
        isDeleted: boolean('is_deleted').default(false).notNull(),
        createdAt: timestamp('created_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp('updated_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.postId],
            foreignColumns: [posts.id],
            name: 'comments_post_id_posts_id_fk',
        }),
        foreignKey({
            columns: [table.authorId],
            foreignColumns: [users.id],
            name: 'comments_author_id_users_id_fk',
        }),
        foreignKey({
            columns: [table.parentId],
            foreignColumns: [table.id],
            name: 'comments_parent_id_comments_id_fk',
        }),
    ],
);

export const communityMemberRequests = pgTable(
    'community_member_requests',
    {
        id: serial().primaryKey().notNull(),
        userId: text('user_id').notNull(),
        communityId: integer('community_id').notNull(),
        requestType: text('request_type').notNull(),
        status: text().default('pending').notNull(),
        message: text(),
        requestedAt: timestamp('requested_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
        reviewedAt: timestamp('reviewed_at', { mode: 'string' }),
        reviewedBy: text('reviewed_by'),
    },
    (table) => [
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.id],
            name: 'community_member_requests_user_id_users_id_fk',
        }).onDelete('cascade'),
        foreignKey({
            columns: [table.communityId],
            foreignColumns: [communities.id],
            name: 'community_member_requests_community_id_communities_id_fk',
        }).onDelete('cascade'),
        foreignKey({
            columns: [table.reviewedBy],
            foreignColumns: [users.id],
            name: 'community_member_requests_reviewed_by_users_id_fk',
        }),
    ],
);

export const attachments = pgTable(
    'attachments',
    {
        id: serial().primaryKey().notNull(),
        filename: text().notNull(),
        mimetype: text().notNull(),
        size: integer().default(0),
        r2Key: text('r2_key').notNull(),
        r2Url: text('r2_url'),
        publicUrl: text('public_url'),
        uploadedBy: text('uploaded_by').notNull(),
        postId: integer('post_id'),
        communityId: integer('community_id'),
        createdAt: timestamp('created_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp('updated_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
        type: text().notNull(),
        thumbnailUrl: text('thumbnail_url'),
    },
    (table) => [
        foreignKey({
            columns: [table.uploadedBy],
            foreignColumns: [users.id],
            name: 'attachments_uploaded_by_users_id_fk',
        }).onDelete('cascade'),
        foreignKey({
            columns: [table.postId],
            foreignColumns: [posts.id],
            name: 'attachments_post_id_posts_id_fk',
        }).onDelete('cascade'),
        foreignKey({
            columns: [table.communityId],
            foreignColumns: [communities.id],
            name: 'attachments_community_id_communities_id_fk',
        }).onDelete('cascade'),
    ],
);

export const reactions = pgTable(
    'reactions',
    {
        id: serial().primaryKey().notNull(),
        postId: integer('post_id').notNull(),
        userId: text('user_id').notNull(),
        type: text().notNull(),
        createdAt: timestamp('created_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.postId],
            foreignColumns: [posts.id],
            name: 'reactions_post_id_posts_id_fk',
        }).onDelete('cascade'),
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.id],
            name: 'reactions_user_id_users_id_fk',
        }).onDelete('cascade'),
    ],
);

export const tags = pgTable(
    'tags',
    {
        id: serial().primaryKey().notNull(),
        name: text().notNull(),
        description: text(),
        createdAt: timestamp('created_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp('updated_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
        communityId: integer('community_id').notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.communityId],
            foreignColumns: [communities.id],
            name: 'tags_community_id_communities_id_fk',
        }).onDelete('cascade'),
    ],
);

export const loginEvents = pgTable(
    'login_events',
    {
        id: text().primaryKey().notNull(),
        userId: text('user_id').notNull(),
        createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
        ipAddress: text('ip_address'),
        userAgent: text('user_agent'),
    },
    (table) => [
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.id],
            name: 'login_events_user_id_users_id_fk',
        }).onDelete('cascade'),
    ],
);

export const sessions = pgTable(
    'sessions',
    {
        id: text().primaryKey().notNull(),
        expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
        token: text().notNull(),
        createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
        updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
        ipAddress: text('ip_address'),
        userAgent: text('user_agent'),
        userId: text('user_id').notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.id],
            name: 'sessions_user_id_users_id_fk',
        }).onDelete('cascade'),
        unique('sessions_token_unique').on(table.token),
    ],
);

export const postTags = pgTable(
    'post_tags',
    {
        postId: integer('post_id').notNull(),
        tagId: integer('tag_id').notNull(),
        createdAt: timestamp('created_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.postId],
            foreignColumns: [posts.id],
            name: 'post_tags_post_id_posts_id_fk',
        }).onDelete('cascade'),
        foreignKey({
            columns: [table.tagId],
            foreignColumns: [tags.id],
            name: 'post_tags_tag_id_tags_id_fk',
        }).onDelete('cascade'),
        primaryKey({
            columns: [table.postId, table.tagId],
            name: 'post_tags_post_id_tag_id_pk',
        }),
    ],
);

export const userBadgeAssignments = pgTable(
    'user_badge_assignments',
    {
        userId: text('user_id').notNull(),
        badgeId: integer('badge_id').notNull(),
        assignedBy: text('assigned_by').notNull(),
        assignedAt: timestamp('assigned_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
        note: text(),
    },
    (table) => [
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.id],
            name: 'user_badge_assignments_user_id_users_id_fk',
        }).onDelete('cascade'),
        foreignKey({
            columns: [table.badgeId],
            foreignColumns: [userBadges.id],
            name: 'user_badge_assignments_badge_id_user_badges_id_fk',
        }).onDelete('cascade'),
        foreignKey({
            columns: [table.assignedBy],
            foreignColumns: [users.id],
            name: 'user_badge_assignments_assigned_by_users_id_fk',
        }),
        primaryKey({
            columns: [table.userId, table.badgeId],
            name: 'user_badge_assignments_user_id_badge_id_pk',
        }),
    ],
);

export const notificationPreferences = pgTable(
    'notification_preferences',
    {
        userId: text('user_id').notNull(),
        communityId: integer('community_id').notNull(),
        enabled: boolean().default(false).notNull(),
        createdAt: timestamp('created_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp('updated_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.id],
            name: 'notification_preferences_user_id_users_id_fk',
        }).onDelete('cascade'),
        foreignKey({
            columns: [table.communityId],
            foreignColumns: [communities.id],
            name: 'notification_preferences_community_id_communities_id_fk',
        }).onDelete('cascade'),
        primaryKey({
            columns: [table.userId, table.communityId],
            name: 'notification_preferences_user_id_community_id_pk',
        }),
    ],
);

export const communityAllowedOrgs = pgTable(
    'community_allowed_orgs',
    {
        communityId: integer('community_id').notNull(),
        orgId: text('org_id').notNull(),
        permissions: text().default('view').notNull(),
        addedAt: timestamp('added_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
        addedBy: text('added_by').notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.communityId],
            foreignColumns: [communities.id],
            name: 'community_allowed_orgs_community_id_communities_id_fk',
        }).onDelete('cascade'),
        foreignKey({
            columns: [table.orgId],
            foreignColumns: [orgs.id],
            name: 'community_allowed_orgs_org_id_orgs_id_fk',
        }).onDelete('cascade'),
        foreignKey({
            columns: [table.addedBy],
            foreignColumns: [users.id],
            name: 'community_allowed_orgs_added_by_users_id_fk',
        }),
        primaryKey({
            columns: [table.communityId, table.orgId],
            name: 'community_allowed_orgs_community_id_org_id_pk',
        }),
    ],
);

export const orgMembers = pgTable(
    'org_members',
    {
        userId: text('user_id').notNull(),
        orgId: text('org_id').notNull(),
        role: text().default('user').notNull(),
        status: text().default('active').notNull(),
        joinedAt: timestamp('joined_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp('updated_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.id],
            name: 'org_members_user_id_users_id_fk',
        }).onDelete('cascade'),
        foreignKey({
            columns: [table.orgId],
            foreignColumns: [orgs.id],
            name: 'org_members_org_id_orgs_id_fk',
        }).onDelete('cascade'),
        primaryKey({
            columns: [table.userId, table.orgId],
            name: 'org_members_user_id_org_id_pk',
        }),
    ],
);

export const communityMembers = pgTable(
    'community_members',
    {
        userId: text('user_id').notNull(),
        communityId: integer('community_id').notNull(),
        role: text().default('member').notNull(),
        membershipType: text('membership_type').notNull(),
        status: text().default('active').notNull(),
        joinedAt: timestamp('joined_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp('updated_at', { mode: 'string' })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.id],
            name: 'community_members_user_id_users_id_fk',
        }).onDelete('cascade'),
        foreignKey({
            columns: [table.communityId],
            foreignColumns: [communities.id],
            name: 'community_members_community_id_communities_id_fk',
        }).onDelete('cascade'),
        primaryKey({
            columns: [table.userId, table.communityId],
            name: 'community_members_user_id_community_id_pk',
        }),
    ],
);
