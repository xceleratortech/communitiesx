import { db } from '@/server/db';
import { savedPosts, posts, comments } from '@/server/db/schema';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';

export async function savePostForUser(userId: string, postId: number) {
    await db
        .insert(savedPosts)
        .values({ userId, postId })
        .onConflictDoNothing();
    return { success: true } as const;
}

export async function unsavePostForUser(userId: string, postId: number) {
    await db
        .delete(savedPosts)
        .where(
            and(eq(savedPosts.userId, userId), eq(savedPosts.postId, postId)),
        );
    return { success: true } as const;
}

export type SavedPostsQueryInput = {
    limit: number;
    offset: number;
    sort: 'latest' | 'oldest' | 'most-commented';
};

export async function getSavedPostsForUser(
    userId: string,
    input: SavedPostsQueryInput,
) {
    const { limit, offset, sort } = input;

    let orderByClause;
    if (sort === 'most-commented') {
        orderByClause = sql`(
            SELECT COUNT(*) FROM ${comments} c
            WHERE c.post_id = ${posts.id} AND c.is_deleted = false
        ) DESC`;
    } else {
        orderByClause =
            sort === 'latest' ? desc(posts.createdAt) : asc(posts.createdAt);
    }

    const totalCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(savedPosts)
        .where(eq(savedPosts.userId, userId));
    const totalCount = totalCountResult[0]?.count || 0;

    const saved = await db.query.savedPosts.findMany({
        where: eq(savedPosts.userId, userId),
        orderBy: desc(savedPosts.createdAt),
        limit,
        offset,
        with: {
            post: {
                with: {
                    author: { with: { organization: true } },
                    community: true,
                    comments: true,
                    postTags: { with: { tag: true } },
                    attachments: true,
                },
            },
        },
    });

    const postsWithSource = saved
        .map((s) => s.post)
        .filter((p) => !!p && !p.isDeleted)
        .map((post) => ({
            ...post,
            tags: post.postTags.map((pt) => pt.tag),
            source: {
                type: post.communityId ? 'community' : 'org',
                orgId: post.orgId,
                communityId: post.communityId ?? undefined,
                reason: '',
            },
        }));

    let sortedPosts = postsWithSource;
    if (sort === 'latest') {
        sortedPosts = postsWithSource.sort(
            (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
        );
    } else if (sort === 'oldest') {
        sortedPosts = postsWithSource.sort(
            (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
        );
    }

    const hasNextPage = offset + limit < totalCount;
    const nextOffset = hasNextPage ? offset + limit : null;

    return {
        posts: sortedPosts,
        nextOffset,
        hasNextPage,
        totalCount,
    } as const;
}

export async function getUserSavedMapForPosts(
    userId: string,
    postIds: number[],
) {
    if (postIds.length === 0) return {} as Record<number, boolean>;

    const rows = await db
        .select({ postId: savedPosts.postId })
        .from(savedPosts)
        .where(
            and(
                eq(savedPosts.userId, userId),
                inArray(savedPosts.postId, postIds),
            ),
        );

    const map: Record<number, boolean> = {};
    rows.forEach((r) => {
        map[r.postId] = true;
    });
    return map;
}
