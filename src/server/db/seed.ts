import { randomUUID } from 'crypto';
import { hashPassword } from 'better-auth/crypto';
import { db } from '@/server/db';
import { accounts, users } from '@/server/db/auth-schema';
import { posts, comments, reactions } from '@/server/db/schema';

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
        await db.delete(accounts);
        await db.delete(users);
        console.log('🗑️ Data cleared.');

        if (isDemo) {
            console.log('🚀 Demo seeding mode: Creating demo data...');
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
            console.log('👤 Created admin and regular users.');

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
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        })
                        .returning();
                    allPosts.push(post);
                }
            }
            console.log('📝 Created 2 posts for each user.');

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

        // Create admin user
        const adminId = `admin-${randomUUID()}`;
        const hashedPassword = await hashPassword('password123');
        const [adminUser] = await db
            .insert(users)
            .values({
                id: adminId,
                name: 'Admin User',
                email: 'it@xcelerator.co.in',
                emailVerified: true,
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
                name: 'Regular User',
                email: 'raj@xcelerator.co.in',
                emailVerified: true,
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
