'use client';

import React, { useEffect } from 'react';
import { setSentryUser } from '@/lib/sentry-user';
import { useTypedSession } from '@/server/auth/client';

export function SentryUserProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data } = useTypedSession();
    const user = data?.user;

    useEffect(() => {
        if (user) {
            setSentryUser({
                id: user.id,
                email: user.email,
                username: user.name,
                role: user.role || user.appRole || null,
            });
        } else {
            setSentryUser(null);
        }
    }, [user?.id, user?.email, user?.name, user?.role, user?.appRole]);

    return <>{children}</>;
}
