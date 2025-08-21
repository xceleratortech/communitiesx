import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { userProfiles } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { getUserSession } from '../../auth/server';
import { db } from '../../db';
import { TRPCError } from '@trpc/server';

// Schema for profile metadata validation
const profileMetadataSchema = z.object({
    phoneNumber: z.string().optional(),
    location: z.string().optional(),
    experiences: z
        .array(
            z.object({
                id: z.string(),
                title: z.string(),
                company: z.string(),
                location: z.string().optional(),
                startDate: z.string(),
                endDate: z.string().optional(),
                description: z.string().optional(),
                isCurrent: z.boolean().optional(),
            }),
        )
        .optional(),
    educations: z
        .array(
            z.object({
                id: z.string(),
                degree: z.string(),
                institution: z.string(),
                fieldOfStudy: z.string(),
                startDate: z.string(),
                endDate: z.string().optional(),
                gpa: z.number().optional(),
                description: z.string().optional(),
            }),
        )
        .optional(),
    certifications: z
        .array(
            z.object({
                id: z.string(),
                name: z.string(),
                issuingOrganization: z.string(),
                issueDate: z.string(),
                expiryDate: z.string().optional(),
                credentialId: z.string().optional(),
                credentialUrl: z.string().optional(),
                description: z.string().optional(),
                industries: z.array(z.string()).optional(),
            }),
        )
        .optional(),
    skills: z
        .array(
            z.object({
                id: z.string(),
                name: z.string(),
                level: z.enum([
                    'beginner',
                    'intermediate',
                    'advanced',
                    'expert',
                ]),
                category: z.string().optional(),
                yearsOfExperience: z.number().optional(),
            }),
        )
        .optional(),
    achievements: z
        .array(
            z.object({
                id: z.string(),
                title: z.string(),
                description: z.string().optional(),
                date: z.string(),
                category: z.string().optional(),
                evidence: z.string().optional(),
            }),
        )
        .optional(),
    interests: z.array(z.string()).optional(),
    industries: z.array(z.string()).optional(),
});

export const profilesRouter = router({
    // Get current user's profile
    getMyProfile: publicProcedure.query(async ({ ctx }) => {
        if (!ctx.session?.user?.id) {
            throw new TRPCError({
                code: 'UNAUTHORIZED',
                message: 'You must be logged in to view your profile',
            });
        }

        const [profile] = await db
            .select()
            .from(userProfiles)
            .where(eq(userProfiles.userId, ctx.session.user.id));

        if (!profile) {
            return null;
        }

        try {
            // Since we're using JSONB, metadata should already be an object
            const metadata = profile.metadata;
            return {
                ...profile,
                metadata,
            };
        } catch (error) {
            // If metadata is invalid, return empty metadata
            return {
                ...profile,
                metadata: {},
            };
        }
    }),

    // Get profile by user ID (public)
    getProfileByUserId: publicProcedure
        .input(z.object({ userId: z.string() }))
        .query(async ({ input }) => {
            const [profile] = await db
                .select()
                .from(userProfiles)
                .where(eq(userProfiles.userId, input.userId));

            if (!profile) {
                return null;
            }

            try {
                // Since we're using JSONB, metadata should already be an object
                const metadata = profile.metadata;
                return {
                    ...profile,
                    metadata,
                };
            } catch (error) {
                return {
                    ...profile,
                    metadata: profile.metadata || {},
                };
            }
        }),

    // Create or update current user's profile
    upsertProfile: publicProcedure
        .input(profileMetadataSchema)
        .mutation(async ({ ctx, input }) => {
            if (!ctx.session?.user?.id) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to update your profile',
                });
            }

            const metadata = input;

            // Check if profile exists
            const [existingProfile] = await db
                .select()
                .from(userProfiles)
                .where(eq(userProfiles.userId, ctx.session.user.id));

            if (existingProfile) {
                // Update existing profile
                const [updatedProfile] = await db
                    .update(userProfiles)
                    .set({
                        metadata,
                        updatedAt: new Date(),
                    })
                    .where(eq(userProfiles.userId, ctx.session.user.id))
                    .returning();

                return updatedProfile;
            } else {
                // Create new profile
                const [newProfile] = await db
                    .insert(userProfiles)
                    .values({
                        userId: ctx.session.user.id,
                        metadata,
                    })
                    .returning();

                return newProfile;
            }
        }),

    // Update specific fields in profile
    updateProfileFields: publicProcedure
        .input(
            z.object({
                updates: profileMetadataSchema.partial(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            if (!ctx.session?.user?.id) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to update your profile',
                });
            }

            // Get current profile
            const [currentProfile] = await db
                .select()
                .from(userProfiles)
                .where(eq(userProfiles.userId, ctx.session.user.id));

            if (!currentProfile) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Profile not found',
                });
            }

            // Since we're using JSONB, metadata should already be an object
            let currentMetadata: Record<string, any> = {};
            try {
                currentMetadata = currentProfile.metadata || {};
            } catch (error) {
                currentMetadata = {};
            }

            const updatedMetadata = { ...currentMetadata, ...input.updates };

            // Update profile
            const [updatedProfile] = await db
                .update(userProfiles)
                .set({
                    metadata: updatedMetadata,
                    updatedAt: new Date(),
                })
                .where(eq(userProfiles.userId, ctx.session.user.id))
                .returning();

            return updatedProfile;
        }),

    // Delete current user's profile
    deleteProfile: publicProcedure.mutation(async ({ ctx }) => {
        if (!ctx.session?.user?.id) {
            throw new TRPCError({
                code: 'UNAUTHORIZED',
                message: 'You must be logged in to delete your profile',
            });
        }

        await db
            .delete(userProfiles)
            .where(eq(userProfiles.userId, ctx.session.user.id));

        return { success: true };
    }),
});
