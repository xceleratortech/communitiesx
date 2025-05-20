📝 Requirements Document – Community Forum Platform
Overview
This platform is a community-driven forum, akin to Reddit, where users from different organizations can post threads and engage in discussions. Built with Next.js 15, shadcn/ui, tRPC, Drizzle ORM, PostgreSQL, and BetterAuth for authentication and organizational identity.

🚀 Core Features

1. User Authentication and Organization Management
   Auth Library: BetterAuth

User-Org Relationship:

Users belong to Organizations (orgs).

Org membership is enforced via BetterAuth’s org-based identity model.

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

🧑‍💼 Roles and Permissions
Role
Capabilities
Org Admin
Manage users in their org, invite users, post, comment, reply
Regular User
Post, comment, reply within their org context

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
groupId?: string // optional
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
✅ Grouping by “Groups” (like Subreddits)
Users can create or join Groups (optional feature).

Threads can be posted under a Group.

Group discovery and subscription model.

Group-specific moderation and roles.
