import { useMemo } from 'react';
import { trpc } from '@/providers/trpc-provider';
import { useTypedSession } from '@/server/auth/client';
import type { UserProfileMetadata } from '@/types/models';

interface ProfileCompletionStatus {
    isComplete: boolean;
    missingFields: string[];
    completionPercentage: number;
}

export function useProfileCompletion() {
    const { data: session } = useTypedSession();

    // Only fetch profile data if user is from the specific organization and not a super admin or org admin
    const shouldCheckProfile =
        session?.user?.orgId === 'org-935fb015-1621-4514-afcf-8cf8c759ec27' &&
        session?.user?.appRole !== 'admin' &&
        session?.user?.role !== 'admin';

    const { data: userProfile, isLoading } =
        trpc.profiles.getMyProfile.useQuery(undefined, {
            enabled: !!session?.user?.id && shouldCheckProfile,
            staleTime: 5 * 60 * 1000, // Cache for 5 minutes
            refetchOnWindowFocus: false,
        });

    const profileCompletionStatus = useMemo((): ProfileCompletionStatus => {
        // If not from the specific organization or is super admin, return complete
        if (!shouldCheckProfile) {
            return {
                isComplete: true,
                missingFields: [],
                completionPercentage: 100,
            };
        }

        if (!userProfile?.metadata) {
            return {
                isComplete: false,
                missingFields: [
                    'phoneNumber',
                    'location',
                    'industries',
                    'linkedinUsername',
                    'experiences',
                ],
                completionPercentage: 0,
            };
        }

        const metadata = userProfile.metadata as UserProfileMetadata;
        const missingFields: string[] = [];

        // Check required fields
        if (!metadata.phoneNumber?.trim()) {
            missingFields.push('phoneNumber');
        }

        if (!metadata.location?.trim()) {
            missingFields.push('location');
        }

        if (!metadata.linkedinUsername?.trim()) {
            missingFields.push('linkedinUsername');
        }

        // Check industries (at least one required)
        if (
            !metadata.industries ||
            !Array.isArray(metadata.industries) ||
            metadata.industries.length === 0
        ) {
            missingFields.push('industries');
        }

        // Check work experience (at least one "present" experience required)
        if (
            !metadata.experiences ||
            !Array.isArray(metadata.experiences) ||
            metadata.experiences.length === 0
        ) {
            missingFields.push('experiences');
        } else {
            const hasPresentExperience = metadata.experiences.some(
                (exp) => exp.isCurrent === true,
            );
            if (!hasPresentExperience) {
                missingFields.push('experiences');
            }
        }

        const totalRequiredFields = 5; // phoneNumber, location, industries, linkedinUsername, experiences
        const completedFields = totalRequiredFields - missingFields.length;
        const completionPercentage = Math.round(
            (completedFields / totalRequiredFields) * 100,
        );

        return {
            isComplete: missingFields.length === 0,
            missingFields,
            completionPercentage,
        };
    }, [shouldCheckProfile, userProfile?.metadata]);

    const isProfileIncomplete = !profileCompletionStatus.isComplete;

    return {
        isProfileIncomplete,
        profileCompletionStatus,
        isLoading: shouldCheckProfile && isLoading,
    };
}
