'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { trpc } from '@/providers/trpc-provider';
import { toast } from 'sonner';
import { useTypedSession } from '@/server/auth/client';
import { Form } from '@/components/ui/form';
import { ProfileCompletionBanner } from '@/components/ui/profile-completion-banner';
import type { UserProfileMetadata } from '@/types/models';
import {
    BasicInformation,
    ExperienceSection,
    EducationSection,
    SkillsSection,
    InterestsSection,
    IndustriesSection,
    AchievementsSection,
    CertificationsSection,
    ResumeUploadBanner,
    SaveButtons,
    ProfileSkeleton,
} from '@/components/profile';

export default function ProfilePage() {
    const { data: session } = useTypedSession();
    const [displaySkills, setDisplaySkills] = useState<string[]>([]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [hasAttemptedSave, setHasAttemptedSave] = useState(false);
    const [hasSavedSuccessfully, setHasSavedSuccessfully] = useState(false);

    const {
        data: userProfile,
        refetch,
        isLoading: profileLoading,
    } = trpc.profiles.getMyProfile.useQuery();

    const upsertProfile = trpc.profiles.upsertProfile.useMutation({
        onSuccess: () => {
            setHasUnsavedChanges(false);
            form.reset(form.getValues()); // Reset form dirty state
            refetch();
            toast.success('Profile updated successfully');
            setHasAttemptedSave(false);
            setHasSavedSuccessfully(true);
        },
        onError: (e) => toast.error(e.message || 'Failed to update profile'),
    });

    const form = useForm<UserProfileMetadata>({
        defaultValues: {
            phoneNumber: '',
            location: '',
            linkedinUsername: '',
            experiences: [],
            educations: [],
            certifications: [],
            skills: [],
            achievements: [],
            interests: [],
            industries: [],
        },
    });

    const { isDirty } = form.formState;

    useEffect(() => {
        if (isDirty && hasSavedSuccessfully) {
            setHasSavedSuccessfully(false);
        }
    }, [hasSavedSuccessfully, isDirty]);

    useEffect(() => {
        setHasUnsavedChanges(isDirty);
    }, [isDirty]);

    useEffect(() => {
        if (userProfile && userProfile.metadata) {
            // Clean up interests data to ensure they are strings
            let cleanMetadata = {
                ...userProfile.metadata,
            } as UserProfileMetadata;
            if (
                cleanMetadata.interests &&
                Array.isArray(cleanMetadata.interests)
            ) {
                cleanMetadata.interests = cleanMetadata.interests.map(
                    (interest: any) =>
                        typeof interest === 'string'
                            ? interest
                            : typeof interest === 'object' && interest.name
                              ? interest.name
                              : JSON.stringify(interest),
                );
            }

            form.reset(cleanMetadata);

            // Update display skills
            if (cleanMetadata.skills && Array.isArray(cleanMetadata.skills)) {
                const skillNames = cleanMetadata.skills
                    .map((skill: any) =>
                        typeof skill === 'string' ? skill : skill.name || '',
                    )
                    .filter(Boolean);
                setDisplaySkills(skillNames);
            }
        }
    }, [userProfile, form]);

    const onSubmit = async (data: UserProfileMetadata) => {
        setHasAttemptedSave(true);

        // Check if user is from the specific organization and validate requirements (exclude super admins)
        if (
            session?.user?.orgId ===
                'org-935fb015-1621-4514-afcf-8cf8c759ec27' &&
            session?.user?.appRole !== 'admin' &&
            session?.user?.role !== 'admin'
        ) {
            const hasPhoneNumber = !!data.phoneNumber?.trim();
            const hasLocation = !!data.location?.trim();
            const hasLinkedIn = !!data.linkedinUsername?.trim();
            const hasIndustries = !!(
                data.industries &&
                Array.isArray(data.industries) &&
                data.industries.length > 0
            );
            const hasPresentExperience = !!(
                data.experiences &&
                Array.isArray(data.experiences) &&
                data.experiences.some((exp) => exp.isCurrent === true)
            );

            if (
                !hasPhoneNumber ||
                !hasLocation ||
                !hasLinkedIn ||
                !hasIndustries ||
                !hasPresentExperience
            ) {
                toast.error(
                    'Please complete all required fields before saving',
                );
                return;
            }
        }

        try {
            await upsertProfile.mutateAsync(data);
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    };

    if (profileLoading) return <ProfileSkeleton />;

    const isRequired =
        session?.user?.orgId === 'org-935fb015-1621-4514-afcf-8cf8c759ec27' &&
        session?.user?.appRole !== 'admin' &&
        session?.user?.role !== 'admin';

    return (
        <div className="mx-auto max-w-4xl space-y-4 p-4">
            {/* Profile Completion Banner */}
            <ProfileCompletionBanner />

            {/* Resume Upload Banner */}
            <ResumeUploadBanner />

            <Form {...form}>
                <form
                    id="profile-form"
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6 pb-24 sm:pb-4"
                >
                    <div className="space-y-6">
                        {/* Basic Information */}
                        <BasicInformation
                            userName={
                                userProfile?.userName || session?.user?.name
                            }
                            userEmail={
                                userProfile?.userEmail || session?.user?.email
                            }
                            isRequired={isRequired}
                        />

                        {/* Experience Section */}
                        <ExperienceSection isRequired={isRequired} />

                        {/* Education Section */}
                        <EducationSection />

                        {/* Skills Section */}
                        <SkillsSection
                            displaySkills={displaySkills}
                            setDisplaySkills={setDisplaySkills}
                            setHasUnsavedChanges={setHasUnsavedChanges}
                        />

                        {/* Interests Section */}
                        <InterestsSection
                            setHasUnsavedChanges={setHasUnsavedChanges}
                        />

                        {/* Industries Section */}
                        <IndustriesSection isRequired={isRequired} />

                        {/* Achievements Section */}
                        <AchievementsSection />

                        {/* Certificates Section */}
                        <CertificationsSection />
                    </div>
                </form>
            </Form>

            {/* Save Buttons */}
            <SaveButtons
                hasUnsavedChanges={hasUnsavedChanges}
                isPending={upsertProfile.isPending}
                formId="profile-form"
            />
        </div>
    );
}
