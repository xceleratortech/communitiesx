import { db } from '@/server/db';
import {
    accounts,
    users,
    orgs,
    sessions,
    verifications,
} from '@/server/db/auth-schema';
import { posts, comments, reactions, hello } from '@/server/db/schema';

async function seedFromBackup() {
    console.log('🌱 Seeding database from backup...');

    try {
        // --- Clean Slate ---
        console.log('🗑️ Clearing existing data...');
        // Order matters due to foreign key constraints
        await db.delete(reactions);
        await db.delete(comments);
        await db.delete(posts);
        await db.delete(sessions);
        await db.delete(accounts);
        await db.delete(users);
        await db.delete(orgs);
        await db.delete(verifications);
        await db.delete(hello);
        console.log('🗑️ Data cleared.');

        // --- Insert Organizations ---
        console.log('🏢 Inserting organizations...');
        await db.insert(orgs).values([
            {
                id: 'org-935fb015-1621-4514-afcf-8cf8c759ec27',
                name: 'Xcelerator',
                createdAt: new Date('2025-05-20 11:09:55.569'),
                slug: 'xcelerator',
            },
            {
                id: 'THWrGxwfA0F3PpjULmmXp',
                name: 'Xcelerator (Test)',
                createdAt: new Date('2025-05-23 07:57:18.984'),
                slug: 'xcelerator-test',
            },
        ]);

        // --- Insert Users ---
        console.log('👤 Inserting users...');
        await db.insert(users).values([
            {
                id: 'admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad',
                name: 'Demo Admin',
                email: 'it@xcelerator.co.in',
                emailVerified: true,
                image: null,
                createdAt: new Date('2025-05-20 11:09:55.569'),
                updatedAt: new Date('2025-05-20 11:09:55.569'),
                orgId: 'org-935fb015-1621-4514-afcf-8cf8c759ec27',
                role: 'admin',
            },
            {
                id: 'user-ac18d0cb-895d-45c5-b512-f0616d505419',
                name: 'Raj Sharma',
                email: 'raj@xcelerator.co.in',
                emailVerified: true,
                image: null,
                createdAt: new Date('2025-05-20 11:09:55.579'),
                updatedAt: new Date('2025-05-20 11:09:55.579'),
                orgId: 'org-935fb015-1621-4514-afcf-8cf8c759ec27',
                role: 'user',
            },
            {
                id: 'user-133dd0be-1eee-4599-bab3-1b427b3b8ab6',
                name: 'Ranjan Bhat',
                email: 'ranjan@xcelerator.co.in',
                emailVerified: true,
                image: null,
                createdAt: new Date('2025-05-20 11:09:55.585'),
                updatedAt: new Date('2025-05-20 11:09:55.585'),
                orgId: 'org-935fb015-1621-4514-afcf-8cf8c759ec27',
                role: 'user',
            },
            {
                id: 'user-53796c67-9033-4999-8adb-5c9003eb81d7',
                name: 'Neeraj Gowda',
                email: 'neeraj@xcelerator.co.in',
                emailVerified: true,
                image: null,
                createdAt: new Date('2025-05-20 11:09:55.590'),
                updatedAt: new Date('2025-05-20 11:09:55.590'),
                orgId: 'org-935fb015-1621-4514-afcf-8cf8c759ec27',
                role: 'user',
            },
            {
                id: 'user-fca08953-998c-4e1e-a595-0a1f8b4db6a3',
                name: 'Anju Reddy',
                email: 'anju@xcelerator.co.in',
                emailVerified: true,
                image: null,
                createdAt: new Date('2025-05-20 11:09:55.594'),
                updatedAt: new Date('2025-05-20 11:09:55.594'),
                orgId: 'org-935fb015-1621-4514-afcf-8cf8c759ec27',
                role: 'user',
            },
            {
                id: 'user-a5f3d2e6-eb3a-4f52-95dd-2544fa32fb6d',
                name: 'Surya Murugan',
                email: 'surya@xcelerator.co.in',
                emailVerified: true,
                image: null,
                createdAt: new Date('2025-05-20 11:09:55.598'),
                updatedAt: new Date('2025-05-20 11:09:55.598'),
                orgId: 'org-935fb015-1621-4514-afcf-8cf8c759ec27',
                role: 'user',
            },
            {
                id: 'mMH-VV7UZsnmVCAPn-U4j',
                name: 'John',
                email: 'john@xcelerator.co.in',
                emailVerified: true,
                image: null,
                createdAt: new Date('2025-05-23 07:57:18.984'),
                updatedAt: new Date('2025-05-23 07:57:18.984'),
                orgId: 'THWrGxwfA0F3PpjULmmXp',
                role: 'user',
            },
        ]);

        // --- Insert Accounts ---
        console.log('🔑 Inserting accounts...');
        await db.insert(accounts).values([
            {
                id: 'account-97604ba1-2a61-4d47-b3fd-eb0a2a60573e',
                accountId: 'admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad',
                providerId: 'credential',
                userId: 'admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad',
                accessToken: null,
                refreshToken: null,
                idToken: null,
                accessTokenExpiresAt: null,
                refreshTokenExpiresAt: null,
                scope: null,
                password:
                    'e18bb84aee2c5dd391e0252c4d1e4524:b8463ac6d03716b73a2470bcd4a85976655ce7f72e6595ade1ff0ac03b2b80c01c852e0d7d46b2bfbbe734193993a15748958534d451ff77a985ccaa8c346c3f',
                createdAt: new Date('2025-05-20 11:09:55.575'),
                updatedAt: new Date('2025-05-20 11:09:55.575'),
            },
            {
                id: 'account-e05ade95-1e65-4b3e-b80e-b5330f899d10',
                accountId: 'user-ac18d0cb-895d-45c5-b512-f0616d505419',
                providerId: 'credential',
                userId: 'user-ac18d0cb-895d-45c5-b512-f0616d505419',
                accessToken: null,
                refreshToken: null,
                idToken: null,
                accessTokenExpiresAt: null,
                refreshTokenExpiresAt: null,
                scope: null,
                password:
                    'e18bb84aee2c5dd391e0252c4d1e4524:b8463ac6d03716b73a2470bcd4a85976655ce7f72e6595ade1ff0ac03b2b80c01c852e0d7d46b2bfbbe734193993a15748958534d451ff77a985ccaa8c346c3f',
                createdAt: new Date('2025-05-20 11:09:55.583'),
                updatedAt: new Date('2025-05-20 11:09:55.583'),
            },
            {
                id: 'account-d3e88f90-a3e4-41d2-b49e-af47034cf79c',
                accountId: 'user-133dd0be-1eee-4599-bab3-1b427b3b8ab6',
                providerId: 'credential',
                userId: 'user-133dd0be-1eee-4599-bab3-1b427b3b8ab6',
                accessToken: null,
                refreshToken: null,
                idToken: null,
                accessTokenExpiresAt: null,
                refreshTokenExpiresAt: null,
                scope: null,
                password:
                    'e18bb84aee2c5dd391e0252c4d1e4524:b8463ac6d03716b73a2470bcd4a85976655ce7f72e6595ade1ff0ac03b2b80c01c852e0d7d46b2bfbbe734193993a15748958534d451ff77a985ccaa8c346c3f',
                createdAt: new Date('2025-05-20 11:09:55.588'),
                updatedAt: new Date('2025-05-20 11:09:55.588'),
            },
            {
                id: 'account-8a2f9eea-d03b-4570-bd0b-1cfcbf4c0c76',
                accountId: 'user-53796c67-9033-4999-8adb-5c9003eb81d7',
                providerId: 'credential',
                userId: 'user-53796c67-9033-4999-8adb-5c9003eb81d7',
                accessToken: null,
                refreshToken: null,
                idToken: null,
                accessTokenExpiresAt: null,
                refreshTokenExpiresAt: null,
                scope: null,
                password:
                    'e18bb84aee2c5dd391e0252c4d1e4524:b8463ac6d03716b73a2470bcd4a85976655ce7f72e6595ade1ff0ac03b2b80c01c852e0d7d46b2bfbbe734193993a15748958534d451ff77a985ccaa8c346c3f',
                createdAt: new Date('2025-05-20 11:09:55.592'),
                updatedAt: new Date('2025-05-20 11:09:55.592'),
            },
            {
                id: 'account-7c46a2bb-0cbb-4e11-a0e7-70477f00754c',
                accountId: 'user-fca08953-998c-4e1e-a595-0a1f8b4db6a3',
                providerId: 'credential',
                userId: 'user-fca08953-998c-4e1e-a595-0a1f8b4db6a3',
                accessToken: null,
                refreshToken: null,
                idToken: null,
                accessTokenExpiresAt: null,
                refreshTokenExpiresAt: null,
                scope: null,
                password:
                    'e18bb84aee2c5dd391e0252c4d1e4524:b8463ac6d03716b73a2470bcd4a85976655ce7f72e6595ade1ff0ac03b2b80c01c852e0d7d46b2bfbbe734193993a15748958534d451ff77a985ccaa8c346c3f',
                createdAt: new Date('2025-05-20 11:09:55.596'),
                updatedAt: new Date('2025-05-20 11:09:55.596'),
            },
            {
                id: 'account-0759bbd9-f460-4780-95af-d86446b98e40',
                accountId: 'user-a5f3d2e6-eb3a-4f52-95dd-2544fa32fb6d',
                providerId: 'credential',
                userId: 'user-a5f3d2e6-eb3a-4f52-95dd-2544fa32fb6d',
                accessToken: null,
                refreshToken: null,
                idToken: null,
                accessTokenExpiresAt: null,
                refreshTokenExpiresAt: null,
                scope: null,
                password:
                    'e18bb84aee2c5dd391e0252c4d1e4524:b8463ac6d03716b73a2470bcd4a85976655ce7f72e6595ade1ff0ac03b2b80c01c852e0d7d46b2bfbbe734193993a15748958534d451ff77a985ccaa8c346c3f',
                createdAt: new Date('2025-05-20 11:09:55.6'),
                updatedAt: new Date('2025-05-20 11:09:55.6'),
            },
            {
                id: 'k8To7qGeTYdMyZwEdkuc9',
                accountId: 'john@xcelerator.co.in',
                providerId: 'email',
                userId: 'mMH-VV7UZsnmVCAPn-U4j',
                accessToken: null,
                refreshToken: null,
                idToken: null,
                accessTokenExpiresAt: null,
                refreshTokenExpiresAt: null,
                scope: null,
                password:
                    '$2b$10$FERiFJ2v3EyqKDDLhmzYuO3LYx4hMvbsimgzYZBzRD4tpAm.0xoXe',
                createdAt: new Date('2025-05-23 07:57:18.984'),
                updatedAt: new Date('2025-05-23 07:57:18.984'),
            },
        ]);

        // --- Insert Sessions ---
        console.log('🔒 Inserting sessions...');
        await db.insert(sessions).values([
            {
                id: 'egrmG1wZmPljRJ9GiPGrKAjnww17jy7W',
                expiresAt: new Date('2025-05-27 11:36:50.164'),
                token: 'Qn0LkPJoDu4Y36wU9M8f4g3fbDp0aay3',
                createdAt: new Date('2025-05-20 11:36:50.164'),
                updatedAt: new Date('2025-05-20 11:36:50.164'),
                ipAddress: '',
                userAgent:
                    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
                userId: 'user-133dd0be-1eee-4599-bab3-1b427b3b8ab6',
            },
            {
                id: '6V22FHyeCpjd9J3evRSJaneocxtrwiY5',
                expiresAt: new Date('2025-05-27 11:43:16.046'),
                token: 'mF07Otizv1nkLYiSeqpTIvXE8c51GQgo',
                createdAt: new Date('2025-05-20 11:43:16.046'),
                updatedAt: new Date('2025-05-20 11:43:16.046'),
                ipAddress: '',
                userAgent:
                    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
                userId: 'user-133dd0be-1eee-4599-bab3-1b427b3b8ab6',
            },
            {
                id: 'Z8tSJX7j7fSjn7X01QhrpTbjlPYGtDm9',
                expiresAt: new Date('2025-05-30 07:00:54.113'),
                token: 'EjQbZchvgqq9pLpGQ3KU5lDVsjgnbouk',
                createdAt: new Date('2025-05-22 06:53:42.989'),
                updatedAt: new Date('2025-05-22 06:53:42.989'),
                ipAddress: '',
                userAgent:
                    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
                userId: 'user-133dd0be-1eee-4599-bab3-1b427b3b8ab6',
            },
            {
                id: '0wmuvxVHqMngVDm8tb6EzEjyrctkaIyL',
                expiresAt: new Date('2025-05-30 07:27:57.405'),
                token: 'z2wgclewXDHzE2JQGKp5I9bNrG4hSQEQ',
                createdAt: new Date('2025-05-23 07:27:57.406'),
                updatedAt: new Date('2025-05-23 07:27:57.406'),
                ipAddress: '',
                userAgent:
                    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
                userId: 'admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad',
            },
            {
                id: '2CDPvxxXBmgk32ElSNuyH51xErn5dyNu',
                expiresAt: new Date('2025-05-30 09:50:23.006'),
                token: 'd8nx4LHlSbpKttMK2N0aSfqexwtS5mni',
                createdAt: new Date('2025-05-23 09:50:23.006'),
                updatedAt: new Date('2025-05-23 09:50:23.006'),
                ipAddress: '',
                userAgent:
                    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
                userId: 'user-133dd0be-1eee-4599-bab3-1b427b3b8ab6',
            },
        ]);

        // --- Insert Posts ---
        console.log('📝 Inserting posts...');
        await db.insert(posts).values([
            {
                id: 47,
                title: "Demo Admin's Post 1",
                content:
                    'This is a demo post 1 by Demo Admin. It contains some sample content for demonstration purposes.',
                authorId: 'admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad',
                createdAt: new Date('2025-05-20 11:09:55.602'),
                updatedAt: new Date('2025-05-20 11:09:55.602'),
                orgId: 'org-935fb015-1621-4514-afcf-8cf8c759ec27',
                communityId: null,
                visibility: 'public',
                isDeleted: false,
            },
            {
                id: 48,
                title: "Demo Admin's Post 2",
                content:
                    'This is a demo post 2 by Demo Admin. It contains some sample content for demonstration purposes.',
                authorId: 'admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad',
                createdAt: new Date('2025-05-20 11:09:55.606'),
                updatedAt: new Date('2025-05-20 11:09:55.606'),
                orgId: 'org-935fb015-1621-4514-afcf-8cf8c759ec27',
                communityId: null,
                visibility: 'public',
                isDeleted: false,
            },
            {
                id: 49,
                title: "Raj Sharma's Post 1",
                content:
                    'This is a demo post 1 by Raj Sharma. It contains some sample content for demonstration purposes.',
                authorId: 'user-ac18d0cb-895d-45c5-b512-f0616d505419',
                createdAt: new Date('2025-05-20 11:09:55.608'),
                updatedAt: new Date('2025-05-20 11:09:55.608'),
                orgId: 'org-935fb015-1621-4514-afcf-8cf8c759ec27',
                communityId: null,
                visibility: 'public',
                isDeleted: false,
            },
            // Adding more posts from the backup...
            {
                id: 63,
                title: 'Getting Started with tRPC: Type-Safe APIs Without the Boilerplate',
                content:
                    "If you're building a full-stack TypeScript app and tired of writing and maintaining separate API contracts — check out tRPC.\n\nWith tRPC, you can:\n✅ Define backend procedures in one place\n✅ Get fully type-safe access to them in the frontend\n✅ Skip REST and GraphQL schemas entirely\n\nIt works seamlessly with libraries like React Query, Next.js, and Zod, making it perfect for modern TypeScript stacks.\n\n\nEx-\n// Server\nconst appRouter = router({\n  getUser: publicProcedure\n    .input(z.string())\n    .query(({ input }) => getUserById(input)),\n});\n\n// Client\nconst { data } = trpc.getUser.useQuery('user-id-123');",
                authorId: 'user-133dd0be-1eee-4599-bab3-1b427b3b8ab6',
                createdAt: new Date('2025-05-22 06:52:29.103'),
                updatedAt: new Date('2025-05-22 06:52:29.103'),
                orgId: 'org-935fb015-1621-4514-afcf-8cf8c759ec27',
                communityId: null,
                visibility: 'public',
                isDeleted: false,
            },
            {
                id: 67,
                title: 'Check Post',
                content:
                    '<ul class="list-disc ml-4"><li><p>Check Post</p></li><li><p>Check Post 2</p></li></ul><ol class="list-decimal ml-4"><li><p>Check Post 1</p></li><li><p>Check Post 2</p></li></ol><p></p><h1>Content Of the Post</h1><blockquote><p><em>Content Content COntent s Content Content</em></p></blockquote><p></p>',
                authorId: 'user-133dd0be-1eee-4599-bab3-1b427b3b8ab6',
                createdAt: new Date('2025-05-23 10:50:34.661'),
                updatedAt: new Date('2025-05-23 10:50:43.444'),
                orgId: 'org-935fb015-1621-4514-afcf-8cf8c759ec27',
                communityId: null,
                visibility: 'public',
                isDeleted: false,
            },
            // Add more posts as needed
        ]);

        // --- Insert Comments ---
        console.log('💬 Inserting comments...');
        await db.insert(comments).values([
            {
                id: 116,
                content: 'Great post! This is a comment from Raj Sharma.',
                postId: 47,
                authorId: 'user-ac18d0cb-895d-45c5-b512-f0616d505419',
                createdAt: new Date('2025-05-20 11:09:55.63'),
                updatedAt: new Date('2025-05-20 11:09:55.63'),
                parentId: null,
                isDeleted: false,
            },
            {
                id: 117,
                content: 'Great post! This is a comment from Ranjan Bhat.',
                postId: 47,
                authorId: 'user-133dd0be-1eee-4599-bab3-1b427b3b8ab6',
                createdAt: new Date('2025-05-20 11:09:55.633'),
                updatedAt: new Date('2025-05-20 11:09:55.633'),
                parentId: null,
                isDeleted: false,
            },
            // Add more comments as needed
            {
                id: 163,
                content:
                    "🔥 This is such a game-changer for TypeScript developers. One of the biggest pain points in full-stack apps has always been maintaining the contract between frontend and backend — especially when dealing with REST or even GraphQL. You end up duplicating types, writing boilerplate schemas, and constantly worrying about things falling out of sync.\n\nWhat I love about tRPC is that it just removes that entire category of bugs. Since your server-side procedures are typed and consumed directly by the client using generated hooks (thanks to createTRPCReact), you get end-to-end type safety with zero additional effort.\n\nAnother underrated benefit is the developer experience. You get full IntelliSense, autocomplete, and validation in your IDE across the entire stack. And because you're using Zod for input validation, the API feels super clean and expressive without needing a separate schema layer like you would in GraphQL.\n\nPair it with next-auth, drizzle-orm, and react-query, and you've got a modern, scalable full-stack TypeScript app with minimal friction.\n\nOnly thing to keep in mind is that tRPC works best within a monorepo or tightly coupled full-stack app — it's not intended for public APIs where decoupling is essential. But for internal tools, dashboards, SaaS apps, and developer products? It's honestly hard to beat.\n\n🚀 Highly recommend giving it a spin if you haven't already!",
                postId: 63,
                authorId: 'user-133dd0be-1eee-4599-bab3-1b427b3b8ab6',
                createdAt: new Date('2025-05-22 06:55:02.623'),
                updatedAt: new Date('2025-05-22 06:55:02.623'),
                parentId: null,
                isDeleted: false,
            },
        ]);

        // --- Insert Reactions ---
        console.log('👍 Inserting reactions...');
        await db.insert(reactions).values([
            {
                id: 74,
                postId: 47,
                userId: 'user-ac18d0cb-895d-45c5-b512-f0616d505419',
                type: 'like',
                createdAt: new Date('2025-05-20 11:09:55.695'),
            },
            {
                id: 75,
                postId: 47,
                userId: 'user-133dd0be-1eee-4599-bab3-1b427b3b8ab6',
                type: 'love',
                createdAt: new Date('2025-05-20 11:09:55.697'),
            },
            // Add more reactions as needed
        ]);

        console.log('✅ Database seeded successfully from backup!');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        throw error;
    }
}

seedFromBackup().catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
});
