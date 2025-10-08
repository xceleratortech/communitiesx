import { z } from 'zod';
import { authProcedure } from '../trpc';
import { db } from '@/server/db';
import { TRPCError } from '@trpc/server';
import { tags } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { ServerPermissions } from '@/server/utils/permission';
import { PERMISSIONS } from '@/lib/permissions/permission-const';

export const tagProcedures = {
    createTag: authProcedure
        .input(
            z.object({
                communityId: z.number(),
                name: z.string().min(1, 'Tag name is required'),
                description: z.string().optional(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const permission = await ServerPermissions.fromUserId(
                    ctx.session.user.id,
                );
                const canCreateTag = await permission.checkCommunityPermission(
                    input.communityId.toString(),
                    PERMISSIONS.CREATE_TAG,
                );

                if (!canCreateTag) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You dont have access to create tags in this community',
                    });
                }

                // Create the tag
                const [newTag] = await db
                    .insert(tags)
                    .values({
                        name: input.name,
                        description: input.description || '',
                        communityId: input.communityId,
                        createdAt: new Date(),
                    })
                    .returning();

                return newTag;
            } catch (error) {
                console.error('Error creating tag:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create tag',
                });
            }
        }),

    editTag: authProcedure
        .input(
            z.object({
                tagId: z.number(),
                name: z.string().min(1, 'Tag name is required'),
                description: z.string().optional(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            try {
                // Check if the tag exists
                const tag = await db.query.tags.findFirst({
                    where: eq(tags.id, input.tagId),
                });

                if (!tag) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Tag not found',
                    });
                }

                const permission = await ServerPermissions.fromUserId(
                    ctx.session.user.id,
                );
                const canEditTag = await permission.checkCommunityPermission(
                    tag.communityId.toString(),
                    PERMISSIONS.EDIT_TAG,
                );

                if (!canEditTag) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You dont have access to edit tags in this community',
                    });
                }

                // Update the tag
                const [updatedTag] = await db
                    .update(tags)
                    .set({
                        name: input.name,
                        description: input.description || '',
                        updatedAt: new Date(),
                    })
                    .where(eq(tags.id, input.tagId))
                    .returning();

                return updatedTag;
            } catch (error) {
                console.error('Error editing tag:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to edit tag',
                });
            }
        }),

    deleteTag: authProcedure
        .input(z.object({ tagId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            try {
                // Check if the tag exists
                const tag = await db.query.tags.findFirst({
                    where: eq(tags.id, input.tagId),
                });

                if (!tag) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Tag not found',
                    });
                }

                const permission = await ServerPermissions.fromUserId(
                    ctx.session.user.id,
                );
                const canDeleteTag = await permission.checkCommunityPermission(
                    tag.communityId.toString(),
                    PERMISSIONS.EDIT_TAG,
                );

                if (!canDeleteTag) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You dont have access to delete tags in this community',
                    });
                }

                // Delete the tag
                await db.delete(tags).where(eq(tags.id, input.tagId));

                return { success: true };
            } catch (error) {
                console.error('Error deleting tag:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to delete tag',
                });
            }
        }),
};
