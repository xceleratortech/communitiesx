import { createAuthClient } from 'better-auth/react';
import {
    adminClient,
    inferAdditionalFields,
    emailOTPClient,
} from 'better-auth/client/plugins';
import type { auth } from './server';

// Extend the session types to include our custom fields
export interface ExtendedSession {
    appRole: string;
    user: {
        id: string;
        name: string;
        email: string;
        image?: string;
        orgId?: string;
        appRole: string;
        role?: string;
    };
}

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL,
    plugins: [
        inferAdditionalFields<typeof auth>(),
        adminClient(),
        emailOTPClient(),
    ],
});

export const { signIn, signOut, signUp, useSession } = authClient;

// Export a properly typed version of useSession
export const useTypedSession = () => {
    const session = useSession();
    return {
        ...session,
        data: session.data as ExtendedSession | null,
    };
};
