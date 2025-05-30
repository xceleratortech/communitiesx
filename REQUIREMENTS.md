📝 Requirements Document – Community Forum Platform
Overview
This platform is a community-driven forum, akin to Reddit, where users from different organizations can post threads and engage in discussions. Built with Next.js 15, shadcn/ui, tRPC, Drizzle ORM, PostgreSQL, and BetterAuth for authentication and organizational identity.

🚀 Core Features

1. User Authentication and Organization Management
   Auth Library: BetterAuth

User-Org Relationship:

Users belong to Organizations (orgs).

Org membership is enforced via BetterAuth's org-based identity model.

Org Admin Capabilities:

Invite users via email or link.

View list of org members.

Manage roles (admin vs. regular user) within the org.

2. Threads (Posts)
   Users can:

Create a thread with a title and rich content (e.g., Markdown or rich text editor).

View all threads across the platform or filtered by their organization.

Edit or delete their own threads.

Threads include:

Author (user)

Org (derived from user)

Timestamp

Optional group (for future use)

3. Comments and Replies
   Each thread supports nested comments (infinite depth, though realistically a few levels deep).

Reply UX follows Reddit-style threading:

Replies are visually indented.

Collapse/expand thread replies.

Users can:

Comment on threads.

Reply to other comments.

Edit/delete their own comments.

4. Communities
   Communities are spaces where users can share and discuss content with specific groups of people.

Community Types:

Public Communities: Visible to all users.

Private Communities: Visible only to members and followers from allowed organizations.

Membership Models:

Follow:

- For Public Communities: Any user can follow.
- For Private Communities: Only users from allowed orgs can follow; others can request to follow.
- Followers can view content but cannot post within the community.

Join:

- For Public Communities: Any user can join directly.
- For Private Communities: Users must request to join and be approved.
- Members can both view and post content within the community.

Community Management:

Community admins can:

- Update community details (name, description, rules, etc.)
- Assign and remove moderator roles
- Approve/reject follow requests (for private communities)
- Approve/reject join requests (for private communities)
- Configure community settings
- Moderate content within the community
- Create invite links for direct community joining

Community moderators can:

- Approve/reject follow requests (for private communities)
- Approve/reject join requests (for private communities)
- Moderate content within the community
- Create invite links for direct community joining (member role only)

Posts Visibility:

Posts can be:

- Public: Visible to all platform users.
- Community-specific: Visible only to community members and followers.

🧑‍💼 Roles and Permissions
Role
Capabilities
Org Admin
Manage users in their org, invite users, post, comment, reply
Regular User
Post, comment, reply within their org context
Community Admin
Manage community settings, assign/remove moderators, create invite links, moderate content
Community Moderator
Moderate content, approve/reject requests, create member invite links
Community Member
Post, comment, reply within the community
Community Follower
View content within the community

🗄️ Data Models (Simplified)
// User
{
id: string
email: string
name: string
orgId: string
role: 'admin' | 'user'
}

// Org
{
id: string
name: string
}

// Thread
{
id: string
title: string
content: string
authorId: string
orgId: string
createdAt: Date
communityId?: string // optional, for community-specific posts
visibility: 'public' | 'community'
}

// Comment
{
id: string
threadId: string
content: string
authorId: string
parentId?: string // for replies
createdAt: Date
}

// Community
{
id: string
name: string
description: string
type: 'public' | 'private'
createdAt: Date
createdBy: string // userId
updatedAt: Date
slug: string // URL-friendly identifier
rules: string // community guidelines/rules
banner: string // URL to banner image
avatar: string // URL to community avatar/logo
}

// CommunityMember
{
userId: string
communityId: string
role: 'admin' | 'moderator' | 'member' | 'follower'
membershipType: 'member' | 'follower' // distinguishes between full members and followers
status: 'active' | 'pending' // for join/follow requests
joinedAt: Date
updatedAt: Date
}

// CommunityMemberRequest
{
userId: string
communityId: string
requestType: 'join' | 'follow'
status: 'pending' | 'approved' | 'rejected'
requestedAt: Date
reviewedAt: Date
reviewedBy: string // userId of moderator who reviewed
message: string // optional message from requester
}

// CommunityAllowedOrg
{
communityId: string
orgId: string
addedAt: Date
addedBy: string // userId
permissions: 'view' | 'join' // what members of this org can do
}

// CommunityInvite
{
id: string
communityId: string
email: string // for email invites
code: string // unique invite code
role: 'member' | 'moderator'
createdBy: string // userId
createdAt: Date
expiresAt: Date
usedAt: Date // null if not used
usedBy: string // userId of person who used the invite
}

⚙️ Tech Stack
Area
Technology
Frontend
Next.js 15, shadcn/ui
Backend/API
tRPC
ORM & DB
Drizzle ORM, PostgreSQL
Auth
BetterAuth

🔜 Roadmap / Future Features
✅ Grouping by "Groups" (like Subreddits)
Users can create or join Groups (optional feature).

Threads can be posted under a Group.

Group discovery and subscription model.

Group-specific moderation and roles.
