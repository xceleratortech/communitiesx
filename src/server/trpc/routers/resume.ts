import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import {
    resumeParserService,
    ResumeProfileSchema,
} from '@/lib/services/resume-parser';
import { TRPCError } from '@trpc/server';
import { db } from '../../db';
import { userProfiles } from '../../db/schema';
import { eq } from 'drizzle-orm';

export const resumeRouter = router({
    parseResume: publicProcedure
        .input(
            z.object({
                fileData: z.string(), // Base64 encoded file data
                fileName: z.string(),
                fileType: z.string(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            if (!ctx.session?.user?.id) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to parse a resume',
                });
            }

            try {
                // Decode base64 file data
                const base64Data = input.fileData.replace(
                    /^data:[^;]+;base64,/,
                    '',
                );
                const buffer = Buffer.from(base64Data, 'base64');

                // Parse the resume
                const profileData = await resumeParserService.parseResume(
                    buffer,
                    input.fileType,
                    input.fileName,
                );

                return {
                    success: true,
                    profileData,
                };
            } catch (error) {
                console.error('Resume parsing error:', error);

                // Provide more specific error messages
                let errorMessage = 'Failed to parse resume';
                let errorCode: 'BAD_REQUEST' | 'INTERNAL_SERVER_ERROR' =
                    'INTERNAL_SERVER_ERROR';

                if (error instanceof Error) {
                    if (error.message.includes('PDF')) {
                        errorMessage =
                            "Unable to read PDF file. Please ensure it's a valid, text-based PDF.";
                        errorCode = 'BAD_REQUEST';
                    } else if (error.message.includes('text content')) {
                        errorMessage =
                            'No text found in file. Please upload a text-based resume.';
                        errorCode = 'BAD_REQUEST';
                    } else if (error.message.includes('AI')) {
                        errorMessage =
                            'AI processing failed. Please try again in a moment.';
                    } else if (
                        error.message.includes('network') ||
                        error.message.includes('fetch')
                    ) {
                        errorMessage =
                            'Network error while processing resume. Please try again.';
                    } else if (error.message.includes('format')) {
                        errorMessage =
                            'Unsupported file format. Please upload a PDF, DOC, or DOCX file.';
                        errorCode = 'BAD_REQUEST';
                    } else if (error.message.length > 0) {
                        errorMessage = error.message;
                    }
                }

                throw new TRPCError({
                    code: errorCode,
                    message: errorMessage,
                });
            }
        }),

    updateProfileFromResume: publicProcedure
        .input(
            z.object({
                profileData: ResumeProfileSchema,
                selectedFields: z.object({
                    phoneNumber: z.boolean().default(false),
                    location: z.boolean().default(false),
                    experiences: z.boolean().default(false),
                    educations: z.boolean().default(false),
                    skills: z.boolean().default(false),
                    certifications: z.boolean().default(false),
                    achievements: z.boolean().default(false),
                    interests: z.boolean().default(false),
                    industries: z.boolean().default(false),
                }),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            if (!ctx.session?.user?.id) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to update your profile',
                });
            }

            try {
                const { profileData, selectedFields } = input;
                const userId = ctx.session.user.id;

                // Get current profile
                const [currentProfile] = await db
                    .select()
                    .from(userProfiles)
                    .where(eq(userProfiles.userId, userId));

                // Since we're using JSONB, metadata should already be an object
                let currentMetadata: Record<string, any> = {};
                if (currentProfile) {
                    try {
                        currentMetadata = currentProfile.metadata || {};
                    } catch (error) {
                        currentMetadata = {};
                    }
                }

                // Update only selected fields
                const updatedMetadata = { ...currentMetadata };

                if (selectedFields.phoneNumber && profileData.phoneNumber) {
                    updatedMetadata.phoneNumber = profileData.phoneNumber;
                }

                if (selectedFields.location && profileData.location) {
                    updatedMetadata.location = profileData.location;
                }

                if (selectedFields.experiences && profileData.experiences) {
                    updatedMetadata.experiences = profileData.experiences;
                }

                if (selectedFields.educations && profileData.educations) {
                    updatedMetadata.educations = profileData.educations;
                }

                if (selectedFields.skills && profileData.skills) {
                    updatedMetadata.skills = profileData.skills;
                }

                if (
                    selectedFields.certifications &&
                    profileData.certifications
                ) {
                    updatedMetadata.certifications = profileData.certifications;
                }

                if (selectedFields.achievements && profileData.achievements) {
                    updatedMetadata.achievements = profileData.achievements;
                }

                if (selectedFields.interests && profileData.interests) {
                    updatedMetadata.interests = profileData.interests;
                }

                if (currentProfile) {
                    // Update existing profile
                    await db
                        .update(userProfiles)
                        .set({
                            metadata: updatedMetadata,
                            updatedAt: new Date(),
                        })
                        .where(eq(userProfiles.userId, userId));
                } else {
                    // Create new profile
                    await db.insert(userProfiles).values({
                        userId,
                        metadata: updatedMetadata,
                    });
                }

                return {
                    success: true,
                    message: 'Profile updated successfully with resume data',
                };
            } catch (error) {
                console.error('Profile update error:', error);

                // Provide more specific error messages
                let errorMessage = 'Failed to update profile';
                let errorCode:
                    | 'BAD_REQUEST'
                    | 'INTERNAL_SERVER_ERROR'
                    | 'UNAUTHORIZED' = 'INTERNAL_SERVER_ERROR';

                if (error instanceof Error) {
                    if (
                        error.message.includes('permission') ||
                        error.message.includes('Unauthorized')
                    ) {
                        errorMessage =
                            "You don't have permission to update this profile.";
                        errorCode = 'UNAUTHORIZED';
                    } else if (
                        error.message.includes('validation') ||
                        error.message.includes('required')
                    ) {
                        errorMessage = 'Please check your data and try again.';
                        errorCode = 'BAD_REQUEST';
                    } else if (
                        error.message.includes('network') ||
                        error.message.includes('connection')
                    ) {
                        errorMessage =
                            'Network error. Please check your connection and try again.';
                    } else if (error.message.includes('database')) {
                        errorMessage =
                            'Database error. Please try again in a moment.';
                    } else if (error.message.length > 0) {
                        errorMessage = error.message;
                    }
                }

                throw new TRPCError({
                    code: errorCode,
                    message: errorMessage,
                });
            }
        }),
});
