'use client';

import { AlertTriangle, X, User, CheckCircle, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { useTypedSession } from '@/server/auth/client';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ProfileCompletionBannerProps {
    className?: string;
}

export function ProfileCompletionBanner({
    className,
}: ProfileCompletionBannerProps) {
    const { data: session } = useTypedSession();
    const { isProfileIncomplete, profileCompletionStatus, isLoading } =
        useProfileCompletion();
    const router = useRouter();
    const pathname = usePathname();
    const [isDismissed, setIsDismissed] = useState(false);

    // Don't show banner if:
    // - User is not logged in
    // - Profile is complete
    // - Banner is dismissed
    // - User is on auth pages
    // - User is not from the specific organization
    // - User is an admin
    // - Still loading
    if (
        !session?.user?.id ||
        !isProfileIncomplete ||
        isDismissed ||
        pathname.includes('/auth/') ||
        pathname.includes('/reset-password') ||
        session.user.orgId !== 'org-935fb015-1621-4514-afcf-8cf8c759ec27' ||
        session.user.appRole === 'admin' ||
        session.user.role === 'admin' ||
        isLoading
    ) {
        return null;
    }

    const handleCompleteProfile = () => {
        router.push('/profile');
    };

    const handleDismiss = () => {
        setIsDismissed(true);
    };

    // Get missing fields for detailed display
    const missingFields = profileCompletionStatus?.missingFields || [];

    // Map missing fields to user-friendly requirements
    const getRequirementsList = () => {
        const requirements = [
            {
                field: 'phoneNumber',
                label: 'Phone Number',
                description: 'Add your contact phone number',
                isMissing: missingFields.includes('phoneNumber'),
            },
            {
                field: 'location',
                label: 'Location',
                description: 'Set your current location',
                isMissing: missingFields.includes('location'),
            },
            {
                field: 'linkedinUsername',
                label: 'LinkedIn Username',
                description: 'Add your LinkedIn profile username',
                isMissing: missingFields.includes('linkedinUsername'),
            },
            {
                field: 'industries',
                label: 'Industries',
                description: 'Select at least one industry you work in',
                isMissing: missingFields.includes('industries'),
            },
            {
                field: 'experiences',
                label: 'Current Work Experience',
                description: 'Add at least one current work experience',
                isMissing: missingFields.includes('experiences'),
            },
        ];

        return requirements;
    };

    const requirements = getRequirementsList();
    const completedCount = requirements.filter((req) => !req.isMissing).length;
    const totalCount = requirements.length;

    // Customize banner content based on current page
    const isOnResumePage = pathname === '/resume-upload';
    const bannerTitle = isOnResumePage
        ? 'Complete your profile after resume upload'
        : 'Complete your profile to access all features';
    const buttonText = isOnResumePage ? 'Go to Profile' : 'Complete Profile';

    return (
        <Alert
            className={cn(
                'border-primary/20 bg-primary/5 text-primary rounded-none border-x-0 border-t-0',
                className,
            )}
        >
            <AlertTriangle className="mt-1 h-4 w-4 flex-shrink-0" />
            <AlertDescription className="w-full">
                <div className="flex w-full items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        {/* Header - responsive */}
                        <div className="mb-2 md:mb-3">
                            <h3 className="text-primary text-sm font-semibold md:text-base">
                                {bannerTitle}
                            </h3>
                            <div className="text-primary/80 flex flex-wrap items-center gap-2 text-xs md:text-sm">
                                <span>
                                    {completedCount}/{totalCount} requirements
                                    completed
                                </span>
                                <div className="bg-primary/10 flex items-center gap-1 rounded-full px-2 py-0.5">
                                    <div className="bg-primary/60 h-1.5 w-1.5 rounded-full"></div>
                                    <span className="text-primary text-xs font-medium">
                                        {totalCount - completedCount} remaining
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Requirements - simplified for mobile, detailed for desktop */}
                        <div className="space-y-2">
                            {/* Mobile: Simple list */}
                            <div className="flex flex-wrap gap-1 md:hidden">
                                {requirements
                                    .filter((req) => req.isMissing)
                                    .map((req) => (
                                        <span
                                            key={req.field}
                                            className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded px-2 py-1 text-xs"
                                        >
                                            <Circle className="h-3 w-3" />
                                            {req.label}
                                        </span>
                                    ))}
                            </div>

                            {/* Desktop: Detailed grid */}
                            <div className="hidden grid-cols-1 gap-2 md:grid lg:grid-cols-2">
                                {requirements.map((req) => (
                                    <div
                                        key={req.field}
                                        className={cn(
                                            'flex items-start gap-2 rounded-lg p-2 text-sm',
                                            req.isMissing
                                                ? 'border-primary/20 bg-primary/10 border'
                                                : 'border border-green-200 bg-green-50',
                                        )}
                                    >
                                        {req.isMissing ? (
                                            <Circle className="text-primary mt-0.5 h-4 w-4 flex-shrink-0" />
                                        ) : (
                                            <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                                        )}
                                        <div className="min-w-0">
                                            <div
                                                className={cn(
                                                    'font-medium',
                                                    req.isMissing
                                                        ? 'text-primary'
                                                        : 'text-green-900',
                                                )}
                                            >
                                                {req.label}
                                            </div>
                                            <div
                                                className={cn(
                                                    'text-xs',
                                                    req.isMissing
                                                        ? 'text-primary/70'
                                                        : 'text-green-700',
                                                )}
                                            >
                                                {req.description}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-shrink-0 items-start gap-1 md:gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCompleteProfile}
                            className="border-primary/30 bg-primary/10 text-primary hover:border-primary/40 hover:bg-primary/20 h-7 px-2 text-xs md:h-8 md:px-3 md:text-sm"
                        >
                            <User className="mr-1 h-3 w-3 md:h-4 md:w-4" />
                            <span className="hidden md:inline">
                                {buttonText}
                            </span>
                            <span className="md:hidden">
                                {isOnResumePage ? 'Profile' : 'Complete'}
                            </span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDismiss}
                            className="text-primary/70 hover:bg-primary/10 hover:text-primary h-7 w-7 p-0 md:h-8 md:w-8"
                        >
                            <X className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                    </div>
                </div>
            </AlertDescription>
        </Alert>
    );
}
