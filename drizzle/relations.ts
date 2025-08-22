import { relations } from 'drizzle-orm/relations';
import {
    orgs,
    communities,
    users,
    userBadges,
    userProfiles,
    chatThreads,
    notifications,
    posts,
    pushSubscriptions,
    accounts,
    directMessages,
    communityInvites,
    comments,
    communityMemberRequests,
    attachments,
    reactions,
    tags,
    loginEvents,
    sessions,
    postTags,
    userBadgeAssignments,
    notificationPreferences,
    communityAllowedOrgs,
    orgMembers,
    communityMembers,
} from './schema';

export const communitiesRelations = relations(communities, ({ one, many }) => ({
    org: one(orgs, {
        fields: [communities.orgId],
        references: [orgs.id],
    }),
    user: one(users, {
        fields: [communities.createdBy],
        references: [users.id],
    }),
    posts: many(posts),
    communityInvites: many(communityInvites),
    communityMemberRequests: many(communityMemberRequests),
    attachments: many(attachments),
    tags: many(tags),
    notificationPreferences: many(notificationPreferences),
    communityAllowedOrgs: many(communityAllowedOrgs),
    communityMembers: many(communityMembers),
}));

export const orgsRelations = relations(orgs, ({ many }) => ({
    communities: many(communities),
    userBadges: many(userBadges),
    chatThreads: many(chatThreads),
    posts: many(posts),
    users: many(users),
    communityInvites: many(communityInvites),
    communityAllowedOrgs: many(communityAllowedOrgs),
    orgMembers: many(orgMembers),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
    communities: many(communities),
    userBadges: many(userBadges),
    userProfiles: many(userProfiles),
    chatThreads_user1Id: many(chatThreads, {
        relationName: 'chatThreads_user1Id_users_id',
    }),
    chatThreads_user2Id: many(chatThreads, {
        relationName: 'chatThreads_user2Id_users_id',
    }),
    notifications: many(notifications),
    posts: many(posts),
    pushSubscriptions: many(pushSubscriptions),
    accounts: many(accounts),
    org: one(orgs, {
        fields: [users.orgId],
        references: [orgs.id],
    }),
    directMessages_senderId: many(directMessages, {
        relationName: 'directMessages_senderId_users_id',
    }),
    directMessages_recipientId: many(directMessages, {
        relationName: 'directMessages_recipientId_users_id',
    }),
    communityInvites_createdBy: many(communityInvites, {
        relationName: 'communityInvites_createdBy_users_id',
    }),
    communityInvites_usedBy: many(communityInvites, {
        relationName: 'communityInvites_usedBy_users_id',
    }),
    comments: many(comments),
    communityMemberRequests_userId: many(communityMemberRequests, {
        relationName: 'communityMemberRequests_userId_users_id',
    }),
    communityMemberRequests_reviewedBy: many(communityMemberRequests, {
        relationName: 'communityMemberRequests_reviewedBy_users_id',
    }),
    attachments: many(attachments),
    reactions: many(reactions),
    loginEvents: many(loginEvents),
    sessions: many(sessions),
    userBadgeAssignments_userId: many(userBadgeAssignments, {
        relationName: 'userBadgeAssignments_userId_users_id',
    }),
    userBadgeAssignments_assignedBy: many(userBadgeAssignments, {
        relationName: 'userBadgeAssignments_assignedBy_users_id',
    }),
    notificationPreferences: many(notificationPreferences),
    communityAllowedOrgs: many(communityAllowedOrgs),
    orgMembers: many(orgMembers),
    communityMembers: many(communityMembers),
}));

export const userBadgesRelations = relations(userBadges, ({ one, many }) => ({
    org: one(orgs, {
        fields: [userBadges.orgId],
        references: [orgs.id],
    }),
    user: one(users, {
        fields: [userBadges.createdBy],
        references: [users.id],
    }),
    userBadgeAssignments: many(userBadgeAssignments),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
    user: one(users, {
        fields: [userProfiles.userId],
        references: [users.id],
    }),
}));

export const chatThreadsRelations = relations(chatThreads, ({ one, many }) => ({
    user_user1Id: one(users, {
        fields: [chatThreads.user1Id],
        references: [users.id],
        relationName: 'chatThreads_user1Id_users_id',
    }),
    user_user2Id: one(users, {
        fields: [chatThreads.user2Id],
        references: [users.id],
        relationName: 'chatThreads_user2Id_users_id',
    }),
    org: one(orgs, {
        fields: [chatThreads.orgId],
        references: [orgs.id],
    }),
    directMessages: many(directMessages),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
    user: one(users, {
        fields: [notifications.recipientId],
        references: [users.id],
    }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
    user: one(users, {
        fields: [posts.authorId],
        references: [users.id],
    }),
    org: one(orgs, {
        fields: [posts.orgId],
        references: [orgs.id],
    }),
    community: one(communities, {
        fields: [posts.communityId],
        references: [communities.id],
    }),
    comments: many(comments),
    attachments: many(attachments),
    reactions: many(reactions),
    postTags: many(postTags),
}));

export const pushSubscriptionsRelations = relations(
    pushSubscriptions,
    ({ one }) => ({
        user: one(users, {
            fields: [pushSubscriptions.userId],
            references: [users.id],
        }),
    }),
);

export const accountsRelations = relations(accounts, ({ one }) => ({
    user: one(users, {
        fields: [accounts.userId],
        references: [users.id],
    }),
}));

export const directMessagesRelations = relations(directMessages, ({ one }) => ({
    chatThread: one(chatThreads, {
        fields: [directMessages.threadId],
        references: [chatThreads.id],
    }),
    user_senderId: one(users, {
        fields: [directMessages.senderId],
        references: [users.id],
        relationName: 'directMessages_senderId_users_id',
    }),
    user_recipientId: one(users, {
        fields: [directMessages.recipientId],
        references: [users.id],
        relationName: 'directMessages_recipientId_users_id',
    }),
}));

export const communityInvitesRelations = relations(
    communityInvites,
    ({ one }) => ({
        community: one(communities, {
            fields: [communityInvites.communityId],
            references: [communities.id],
        }),
        org: one(orgs, {
            fields: [communityInvites.orgId],
            references: [orgs.id],
        }),
        user_createdBy: one(users, {
            fields: [communityInvites.createdBy],
            references: [users.id],
            relationName: 'communityInvites_createdBy_users_id',
        }),
        user_usedBy: one(users, {
            fields: [communityInvites.usedBy],
            references: [users.id],
            relationName: 'communityInvites_usedBy_users_id',
        }),
    }),
);

export const commentsRelations = relations(comments, ({ one, many }) => ({
    post: one(posts, {
        fields: [comments.postId],
        references: [posts.id],
    }),
    user: one(users, {
        fields: [comments.authorId],
        references: [users.id],
    }),
    comment: one(comments, {
        fields: [comments.parentId],
        references: [comments.id],
        relationName: 'comments_parentId_comments_id',
    }),
    comments: many(comments, {
        relationName: 'comments_parentId_comments_id',
    }),
}));

export const communityMemberRequestsRelations = relations(
    communityMemberRequests,
    ({ one }) => ({
        user_userId: one(users, {
            fields: [communityMemberRequests.userId],
            references: [users.id],
            relationName: 'communityMemberRequests_userId_users_id',
        }),
        community: one(communities, {
            fields: [communityMemberRequests.communityId],
            references: [communities.id],
        }),
        user_reviewedBy: one(users, {
            fields: [communityMemberRequests.reviewedBy],
            references: [users.id],
            relationName: 'communityMemberRequests_reviewedBy_users_id',
        }),
    }),
);

export const attachmentsRelations = relations(attachments, ({ one }) => ({
    user: one(users, {
        fields: [attachments.uploadedBy],
        references: [users.id],
    }),
    post: one(posts, {
        fields: [attachments.postId],
        references: [posts.id],
    }),
    community: one(communities, {
        fields: [attachments.communityId],
        references: [communities.id],
    }),
}));

export const reactionsRelations = relations(reactions, ({ one }) => ({
    post: one(posts, {
        fields: [reactions.postId],
        references: [posts.id],
    }),
    user: one(users, {
        fields: [reactions.userId],
        references: [users.id],
    }),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
    community: one(communities, {
        fields: [tags.communityId],
        references: [communities.id],
    }),
    postTags: many(postTags),
}));

export const loginEventsRelations = relations(loginEvents, ({ one }) => ({
    user: one(users, {
        fields: [loginEvents.userId],
        references: [users.id],
    }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
    user: one(users, {
        fields: [sessions.userId],
        references: [users.id],
    }),
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

export const userBadgeAssignmentsRelations = relations(
    userBadgeAssignments,
    ({ one }) => ({
        user_userId: one(users, {
            fields: [userBadgeAssignments.userId],
            references: [users.id],
            relationName: 'userBadgeAssignments_userId_users_id',
        }),
        userBadge: one(userBadges, {
            fields: [userBadgeAssignments.badgeId],
            references: [userBadges.id],
        }),
        user_assignedBy: one(users, {
            fields: [userBadgeAssignments.assignedBy],
            references: [users.id],
            relationName: 'userBadgeAssignments_assignedBy_users_id',
        }),
    }),
);

export const notificationPreferencesRelations = relations(
    notificationPreferences,
    ({ one }) => ({
        user: one(users, {
            fields: [notificationPreferences.userId],
            references: [users.id],
        }),
        community: one(communities, {
            fields: [notificationPreferences.communityId],
            references: [communities.id],
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
        org: one(orgs, {
            fields: [communityAllowedOrgs.orgId],
            references: [orgs.id],
        }),
        user: one(users, {
            fields: [communityAllowedOrgs.addedBy],
            references: [users.id],
        }),
    }),
);

export const orgMembersRelations = relations(orgMembers, ({ one }) => ({
    user: one(users, {
        fields: [orgMembers.userId],
        references: [users.id],
    }),
    org: one(orgs, {
        fields: [orgMembers.orgId],
        references: [orgs.id],
    }),
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
