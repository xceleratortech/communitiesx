'use client';

import { usePermission } from '@/hooks/use-permission';
import { useSession } from '@/server/auth/client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loading } from '@/components/ui/loading';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = useSession();
    const router = useRouter();
    const { appRole } = usePermission();

    useEffect(() => {
        if (appRole && appRole.length > 0) {
            const isAdmin = appRole.includes('admin');
            if (!isAdmin) {
                router.push('/');
            }
        }
    }, [appRole, router]);

    useEffect(() => {
        if (!session.isPending) {
            if (!session.data) {
                router.push('/auth/login');
            }
        }
    }, [session.isPending, session.data, router]);

    if (session.isPending) {
        return <Loading message="Authenticating..." />;
    }

    return <div className="bg-background min-h-screen">{children}</div>;
}
