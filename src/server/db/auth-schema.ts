import {
    pgTable,
    text,
    timestamp,
    boolean,
    // integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const orgs = pgTable('orgs', {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(),
    slug: text('slug').notNull().unique(),
    createdAt: timestamp('created_at').notNull(),
    allowCrossOrgDM: boolean('allow_cross_org_dm').notNull().default(false),
});

export const users = pgTable('users', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').notNull(),
    image: text('image'),
    orgId: text('org_id').references(() => orgs.id),
    role: text('role').notNull().default('user'), // 'admin' | 'user'
    appRole: text('app_role').notNull().default('user'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
});

// Define basic relations between users and organizations
// Note: Community-related relations will be defined in schema.ts
export const usersRelations = relations(users, ({ one }) => ({
    organization: one(orgs, {
        fields: [users.orgId],
        references: [orgs.id],
    }),
}));

export const orgsRelations = relations(orgs, ({ many }) => ({
    users: many(users),
}));

export const sessions = pgTable('sessions', {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
});

export const accounts = pgTable('accounts', {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
});

export const verifications = pgTable('verifications', {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at'),
    updatedAt: timestamp('updated_at'),
});

export const loginEvents = pgTable('login_events', {
    id: text('id').primaryKey(),
    userId: text('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
});
