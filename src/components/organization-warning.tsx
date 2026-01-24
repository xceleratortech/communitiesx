'use client';

import { useEffect, useRef } from 'react';
import { useTypedSession } from '@/server/auth/client';
import { toast } from 'sonner';
import { usePathname } from 'next/navigation';

export function OrganizationWarning() {
    const { data: session, isPending } = useTypedSession();
    const pathname = usePathname();
    const hasShownToast = useRef(false);
    const lastUserId = useRef<string | null>(null);

    useEffect(() => {
        if (isPending) return;

        if (!session?.user) {
            hasShownToast.current = false;
            lastUserId.current = null;
            return;
        }

        if (session.user.id !== lastUserId.current) {
            hasShownToast.current = false;
            lastUserId.current = session.user.id;
        }

        if (!session.user.orgId) {
            if (!pathname.startsWith('/auth')) {
                toast.warning('Organization Warning', {
                    description: 'You are not assigned to any organization.',
                    duration: Infinity,
                    closeButton: false,
                    id: 'organization-warning',
                });
                hasShownToast.current = true;
            }
        } else if (hasShownToast.current) {
            // dismiss the toast if user gets assigned to an organization
            toast.dismiss('organization-warning');
            hasShownToast.current = false;
        }
    }, [session, isPending, pathname]);

    return null;
}
