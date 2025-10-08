import { z } from 'zod';
import { authProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import {
    getSavedPostsForUser,
    getUserSavedMapForPosts,
    savePostForUser,
    unsavePostForUser,
} from '@/server/trpc/services/saved-posts-service';

export const savedProcedures = {
    // Save a post (bookmark)
    savePost: authProcedure
        .input(z.object({ postId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;
                const { postId } = input;
                return await savePostForUser(userId, postId);
            } catch (error) {
                console.error('Error saving post:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to save post',
                });
            }
        }),

    // Unsave a post (remove bookmark)
    unsavePost: authProcedure
        .input(z.object({ postId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;
                const { postId } = input;
                return await unsavePostForUser(userId, postId);
            } catch (error) {
                console.error('Error unsaving post:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to unsave post',
                });
            }
        }),

    // Get saved posts for current user (paginated, with same shape as feeds)
    getSavedPosts: authProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).default(10),
                offset: z.number().default(0),
                sort: z
                    .enum(['latest', 'oldest', 'most-commented'])
                    .default('latest'),
            }),
        )
        .query(async ({ ctx, input }) => {
            try {
                const userId = ctx.session.user.id;
                return await getSavedPostsForUser(userId, input);
            } catch (error) {
                console.error('Error getting saved posts:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to get saved posts',
                });
            }
        }),

    // Map of user saved posts for quick client toggles
    getUserSavedMap: authProcedure
        .input(z.object({ postIds: z.array(z.number()) }))
        .query(async ({ ctx, input }) => {
            try {
                const userId = ctx.session.user.id;
                return await getUserSavedMapForPosts(userId, input.postIds);
            } catch (error) {
                console.error('Error getting saved map:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to get saved map',
                });
            }
        }),
};
