'use client';

import { useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { useTypedSession } from '@/server/auth/client';

interface ProfileCompletionGuardProps {
    children: React.ReactNode;
}

export function ProfileCompletionGuard({
    children,
}: ProfileCompletionGuardProps) {
    const { data: session } = useTypedSession();
    const { isProfileIncomplete, isLoading } = useProfileCompletion();
    const router = useRouter();
    const pathname = usePathname();

    // Memoize the organization and role check to avoid unnecessary recalculations
    const isTargetOrg = useMemo(() => {
        return (
            session?.user?.orgId === 'org-935fb015-1621-4514-afcf-8cf8c759ec27'
        );
    }, [session?.user?.orgId]);

    const isSuperAdmin = useMemo(() => {
        return session?.user?.appRole === 'admin';
    }, [session?.user?.appRole]);

    const isOrgAdmin = useMemo(() => {
        return session?.user?.role === 'admin';
    }, [session?.user?.role]);

    // Define allowed pages for profile completion
    const isProfileRelatedPage = useMemo(() => {
        return (
            pathname === '/profile' ||
            pathname === '/resume-upload' ||
            pathname.startsWith('/auth/') ||
            pathname.includes('/reset-password')
        );
    }, [pathname]);

    // Memoize the redirect logic
    const shouldRedirect = useMemo(() => {
        // Only apply protection for the specific organization and not for admins
        if (!isTargetOrg || isSuperAdmin || isOrgAdmin) {
            return false;
        }

        // Don't redirect if:
        // - Still loading
        // - Profile is complete
        // - On profile-related pages (allow access to complete profile)
        if (isLoading || !isProfileIncomplete || isProfileRelatedPage) {
            return false;
        }

        return true;
    }, [
        isTargetOrg,
        isSuperAdmin,
        isOrgAdmin,
        isLoading,
        isProfileIncomplete,
        isProfileRelatedPage,
    ]);

    useEffect(() => {
        if (shouldRedirect) {
            router.push('/profile');
        }
    }, [shouldRedirect, router]);

    // Show loading state only for target org users (non-admin) while checking profile completion
    if (isLoading && isTargetOrg && !isSuperAdmin && !isOrgAdmin) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2"></div>
                    <p className="text-muted-foreground">
                        Checking profile completion...
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
