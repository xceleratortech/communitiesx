import { randomUUID } from 'crypto';
import { hashPassword } from 'better-auth/crypto';
import { db } from '@/server/db';
import { accounts, users, orgs } from '@/server/db/auth-schema';
import {
    posts,
    comments,
    reactions,
    communities,
    communityMembers,
    communityAllowedOrgs,
    communityInvites,
    communityMemberRequests,
} from '@/server/db/schema';
import { addDays } from 'date-fns';
import { config } from 'dotenv';

// Attempt to load .env.local first (non-fatal if it doesn't exist)
config({ path: '.env.local', override: false });

// Parse command-line arguments for demo mode
const args = process.argv.slice(2);
const isDemo = args.includes('--demo');

async function seed() {
    console.log('🌱 Seeding database...', isDemo ? '(Demo Mode)' : '');

    try {
        // --- Clean Slate ---
        console.log('🗑️ Clearing existing data...');
        // Order matters due to foreign key constraints
        await db.delete(reactions);
        await db.delete(comments);
        await db.delete(posts);
        await db.delete(communityInvites);
        await db.delete(communityMemberRequests);
        await db.delete(communityMembers);
        await db.delete(communityAllowedOrgs);
        await db.delete(communities);
        await db.delete(accounts);
        await db.delete(users);
        await db.delete(orgs);
        console.log('🗑️ Data cleared.');

        if (isDemo) {
            console.log('🚀 Demo seeding mode: Creating demo data...');
            // Create an organization
            const orgId = `org-${randomUUID()}`;
            const [org] = await db
                .insert(orgs)
                .values({
                    id: orgId,
                    name: 'Xcelerator',
                    slug: 'xcelerator',
                    createdAt: new Date(),
                })
                .returning();

            // Create a second organization
            const org2Id = `org-${randomUUID()}`;
            const [org2] = await db
                .insert(orgs)
                .values({
                    id: org2Id,
                    name: 'TechCorp',
                    slug: 'techcorp',
                    createdAt: new Date(),
                })
                .returning();

            // Demo: Create admin user
            const adminId = `admin-${randomUUID()}`;
            const hashedPassword = await hashPassword('password123');
            const [adminUser] = await db
                .insert(users)
                .values({
                    id: adminId,
                    name: 'Demo Admin',
                    email: 'it@xcelerator.co.in',
                    emailVerified: true,
                    orgId: org.id,
                    role: 'admin',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })
                .returning();
            await db.insert(accounts).values({
                id: `account-${randomUUID()}`,
                userId: adminUser.id,
                providerId: 'credential',
                accountId: adminUser.id,
                password: hashedPassword,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            // Demo: Create regular users with specific emails
            const userEmails = [
                { email: 'raj@xcelerator.co.in', name: 'Raj Sharma' },
                { email: 'ranjan@xcelerator.co.in', name: 'Ranjan Bhat' },
                { email: 'neeraj@xcelerator.co.in', name: 'Neeraj Gowda' },
                { email: 'anju@xcelerator.co.in', name: 'Anju Reddy' },
                { email: 'surya@xcelerator.co.in', name: 'Surya Murugan' },
            ];

            const regularUsers = [];
            for (const user of userEmails) {
                const userId = `user-${randomUUID()}`;
                const [createdUser] = await db
                    .insert(users)
                    .values({
                        id: userId,
                        name: user.name,
                        email: user.email,
                        emailVerified: true,
                        orgId: org.id,
                        role: 'user',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    })
                    .returning();
                regularUsers.push(createdUser);
                await db.insert(accounts).values({
                    id: `account-${randomUUID()}`,
                    userId: createdUser.id,
                    providerId: 'credential',
                    accountId: createdUser.id,
                    password: hashedPassword,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            }

            // Create users for the second organization
            const org2Users = [];
            const org2UserEmails = [
                { email: 'john@techcorp.com', name: 'John Smith' },
                { email: 'jane@techcorp.com', name: 'Jane Doe' },
                { email: 'alex@techcorp.com', name: 'Alex Johnson' },
            ];

            for (const user of org2UserEmails) {
                const userId = `user-${randomUUID()}`;
                const [createdUser] = await db
                    .insert(users)
                    .values({
                        id: userId,
                        name: user.name,
                        email: user.email,
                        emailVerified: true,
                        orgId: org2.id,
                        role: 'user',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    })
                    .returning();
                org2Users.push(createdUser);
                await db.insert(accounts).values({
                    id: `account-${randomUUID()}`,
                    userId: createdUser.id,
                    providerId: 'credential',
                    accountId: createdUser.id,
                    password: hashedPassword,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            }

            console.log('👤 Created admin and regular users.');

            // Create communities
            console.log('🏘️ Creating communities...');

            // Public community
            const [techCommunity] = await db
                .insert(communities)
                .values({
                    name: 'Tech Enthusiasts',
                    slug: 'tech-enthusiasts',
                    description:
                        'A community for all tech lovers to share knowledge and discuss the latest trends.',
                    type: 'public',
                    rules: '1. Be respectful\n2. No spam\n3. Stay on topic',
                    banner: 'https://picsum.photos/seed/tech/1200/300',
                    avatar: 'https://picsum.photos/seed/tech/300/300',
                    createdBy: adminUser.id,
                })
                .returning();

            // Private community
            const [designCommunity] = await db
                .insert(communities)
                .values({
                    name: 'Design Masters',
                    slug: 'design-masters',
                    description:
                        'A private community for professional designers to share work and get feedback.',
                    type: 'private',
                    rules: '1. Constructive criticism only\n2. Credit all sources\n3. No client work without permission',
                    banner: 'https://picsum.photos/seed/design/1200/300',
                    avatar: 'https://picsum.photos/seed/design/300/300',
                    createdBy: regularUsers[1].id,
                })
                .returning();

            // Another public community
            const [marketingCommunity] = await db
                .insert(communities)
                .values({
                    name: 'Marketing Strategies',
                    slug: 'marketing-strategies',
                    description:
                        'Share and learn effective marketing strategies for businesses of all sizes.',
                    type: 'public',
                    rules: '1. No self-promotion\n2. Cite sources\n3. Be constructive',
                    banner: 'https://picsum.photos/seed/marketing/1200/300',
                    avatar: 'https://picsum.photos/seed/marketing/300/300',
                    createdBy: regularUsers[3].id,
                })
                .returning();

            // Add community members
            console.log('👥 Adding community members...');

            // Tech community members
            await db.insert(communityMembers).values({
                userId: adminUser.id,
                communityId: techCommunity.id,
                role: 'moderator',
                membershipType: 'member',
                status: 'active',
            });

            for (const user of regularUsers) {
                await db.insert(communityMembers).values({
                    userId: user.id,
                    communityId: techCommunity.id,
                    role:
                        user.id === regularUsers[0].id ? 'moderator' : 'member',
                    membershipType: 'member',
                    status: 'active',
                });
            }

            // Add org2 users as followers
            for (const user of org2Users) {
                await db.insert(communityMembers).values({
                    userId: user.id,
                    communityId: techCommunity.id,
                    role: 'follower',
                    membershipType: 'follower',
                    status: 'active',
                });
            }

            // Design community members
            await db.insert(communityMembers).values({
                userId: regularUsers[1].id,
                communityId: designCommunity.id,
                role: 'moderator',
                membershipType: 'member',
                status: 'active',
            });

            await db.insert(communityMembers).values({
                userId: regularUsers[2].id,
                communityId: designCommunity.id,
                role: 'member',
                membershipType: 'member',
                status: 'active',
            });

            await db.insert(communityMembers).values({
                userId: adminUser.id,
                communityId: designCommunity.id,
                role: 'member',
                membershipType: 'member',
                status: 'active',
            });

            // Marketing community members
            await db.insert(communityMembers).values({
                userId: regularUsers[3].id,
                communityId: marketingCommunity.id,
                role: 'moderator',
                membershipType: 'member',
                status: 'active',
            });

            await db.insert(communityMembers).values({
                userId: regularUsers[4].id,
                communityId: marketingCommunity.id,
                role: 'member',
                membershipType: 'member',
                status: 'active',
            });

            // Add community allowed orgs for private community
            console.log(
                '🔒 Setting up allowed organizations for private communities...',
            );

            await db.insert(communityAllowedOrgs).values({
                communityId: designCommunity.id,
                orgId: org.id,
                permissions: 'join',
                addedBy: regularUsers[1].id,
            });

            await db.insert(communityAllowedOrgs).values({
                communityId: designCommunity.id,
                orgId: org2.id,
                permissions: 'view',
                addedBy: regularUsers[1].id,
            });

            // Create community invites
            console.log('✉️ Creating community invites...');

            // Invite to Design community
            await db.insert(communityInvites).values({
                communityId: designCommunity.id,
                email: 'newuser@xcelerator.co.in',
                code: randomUUID().substring(0, 8),
                role: 'member',
                createdBy: regularUsers[1].id,
                expiresAt: addDays(new Date(), 7),
            });

            // Invite to Marketing community with moderator role
            await db.insert(communityInvites).values({
                communityId: marketingCommunity.id,
                email: 'marketing-expert@techcorp.com',
                code: randomUUID().substring(0, 8),
                role: 'moderator',
                createdBy: regularUsers[3].id,
                expiresAt: addDays(new Date(), 14),
            });

            // Create member requests
            console.log('🙋 Creating membership requests...');

            // Request to join Design community
            await db.insert(communityMemberRequests).values({
                userId: org2Users[0].id,
                communityId: designCommunity.id,
                requestType: 'join',
                status: 'pending',
                message:
                    'I would love to join this community to share my design expertise.',
                requestedAt: new Date(),
            });

            // Request to follow Marketing community
            await db.insert(communityMemberRequests).values({
                userId: org2Users[1].id,
                communityId: marketingCommunity.id,
                requestType: 'follow',
                status: 'pending',
                message:
                    'I want to stay updated with the latest marketing strategies.',
                requestedAt: new Date(),
            });

            // Approved request
            await db.insert(communityMemberRequests).values({
                userId: org2Users[2].id,
                communityId: designCommunity.id,
                requestType: 'join',
                status: 'approved',
                message:
                    'I have experience in UX/UI design and would like to contribute.',
                requestedAt: new Date(Date.now() - 86400000), // 1 day ago
                reviewedAt: new Date(),
                reviewedBy: regularUsers[1].id,
            });

            // Add the approved user as a member
            await db.insert(communityMembers).values({
                userId: org2Users[2].id,
                communityId: designCommunity.id,
                role: 'member',
                membershipType: 'member',
                status: 'active',
            });

            // Demo: Create posts for each user
            const allPosts = [];
            for (const user of [adminUser, ...regularUsers]) {
                for (let i = 1; i <= 2; i++) {
                    const [post] = await db
                        .insert(posts)
                        .values({
                            title: `${user.name}'s Post ${i}`,
                            content: `This is a demo post ${i} by ${user.name}. It contains some sample content for demonstration purposes.`,
                            authorId: user.id,
                            orgId: org.id,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        })
                        .returning();
                    allPosts.push(post);
                }
            }

            // Create community-specific posts
            console.log('📝 Creating community posts...');

            // Tech community posts
            await db.insert(posts).values({
                title: 'Latest Developments in AI',
                content:
                    "Let's discuss the recent advancements in artificial intelligence and their implications for society.",
                authorId: adminUser.id,
                orgId: org.id,
                communityId: techCommunity.id,
                visibility: 'community',
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            await db.insert(posts).values({
                title: 'Web Development Trends 2023',
                content:
                    "What are the most exciting web development trends you've seen this year? Share your thoughts!",
                authorId: regularUsers[0].id,
                orgId: org.id,
                communityId: techCommunity.id,
                visibility: 'community',
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            // Design community posts
            await db.insert(posts).values({
                title: 'UI Design Principles Everyone Should Know',
                content:
                    'Here are some fundamental UI design principles that can improve any digital product...',
                authorId: regularUsers[1].id,
                orgId: org.id,
                communityId: designCommunity.id,
                visibility: 'community',
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            // Marketing community posts
            await db.insert(posts).values({
                title: 'Effective Social Media Strategies',
                content:
                    "In this post, I'll share some effective social media strategies that have worked well for our clients.",
                authorId: regularUsers[3].id,
                orgId: org.id,
                communityId: marketingCommunity.id,
                visibility: 'community',
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            console.log(
                '📝 Created 2 posts for each user and community-specific posts.',
            );

            // Demo: Create comments on posts
            for (const post of allPosts) {
                const commenters = [adminUser, ...regularUsers].filter(
                    (u) => u.id !== post.authorId,
                );
                for (const commenter of commenters.slice(0, 3)) {
                    await db.insert(comments).values({
                        content: `Great post! This is a comment from ${commenter.name}.`,
                        postId: post.id,
                        authorId: commenter.id,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });
                }
            }
            console.log('💬 Created comments on posts.');

            // Demo: Add reactions to posts
            for (const post of allPosts) {
                const reactors = [adminUser, ...regularUsers].filter(
                    (u) => u.id !== post.authorId,
                );
                for (const reactor of reactors.slice(0, 2)) {
                    await db.insert(reactions).values({
                        type: Math.random() > 0.5 ? 'like' : 'love',
                        postId: post.id,
                        userId: reactor.id,
                        createdAt: new Date(),
                    });
                }
            }
            console.log('👍 Added reactions to posts.');

            console.log('✅ Demo seeding complete.');
            return;
        }

        // --- Production Seeding ---
        console.log('🌱 Creating production seed data...');

        // Create an organization
        const orgId = `org-${randomUUID()}`;
        const [org] = await db
            .insert(orgs)
            .values({
                id: orgId,
                name: 'Xcelerator',
                slug: 'xcelerator',
                createdAt: new Date(),
            })
            .returning();
        // Create admin user
        const adminId = `admin-${randomUUID()}`;
        const hashedPassword = await hashPassword('password123');
        const [adminUser] = await db
            .insert(users)
            .values({
                id: adminId,
                name: 'IT Admin',
                email: 'it@xcelerator.co.in',
                emailVerified: true,
                orgId: org.id,
                role: 'admin',
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning();

        await db.insert(accounts).values({
            id: `account-${randomUUID()}`,
            userId: adminUser.id,
            providerId: 'credential',
            accountId: adminUser.id,
            password: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // Create regular user
        const userId = `user-${randomUUID()}`;
        const [regularUser] = await db
            .insert(users)
            .values({
                id: userId,
                name: 'Rajesh',
                email: 'raj@xcelerator.co.in',
                emailVerified: true,
                orgId: org.id,
                role: 'user',
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning();

        await db.insert(accounts).values({
            id: `account-${randomUUID()}`,
            userId: regularUser.id,
            providerId: 'credential',
            accountId: regularUser.id,
            password: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // Create sample post
        const [post] = await db
            .insert(posts)
            .values({
                title: 'Welcome to the Community',
                content:
                    'This is our first community post. Feel free to engage and share your thoughts!',
                authorId: adminUser.id,
                orgId: org.id,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning();

        // Add comment to the post
        await db.insert(comments).values({
            content:
                'Great to be here! Looking forward to engaging with everyone.',
            postId: post.id,
            authorId: regularUser.id,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // Add reaction to the post
        await db.insert(reactions).values({
            type: 'like',
            postId: post.id,
            userId: regularUser.id,
            createdAt: new Date(),
        });

        console.log('✅ Production seeding complete!');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        throw error;
    }
}

seed().catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
});
