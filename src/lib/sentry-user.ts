'use client';

import * as Sentry from '@sentry/nextjs';

export type SentryUser = {
    id?: string;
    email?: string | null;
    username?: string | null;
    role?: string | null;
} | null;

export function setSentryUser(user: SentryUser) {
    if (typeof window === 'undefined') return;
    if (user) {
        Sentry.setUser({
            id: user.id,
            email: user.email ?? undefined,
            username: user.username ?? undefined,
        });
        Sentry.setContext('user_meta', {
            role: user.role ?? undefined,
        });
    } else {
        Sentry.setUser(null);
    }
}