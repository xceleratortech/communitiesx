import { createAuthClient } from 'better-auth/react';
import {
    adminClient,
    inferAdditionalFields,
    emailOTPClient,
} from 'better-auth/client/plugins';
import type { auth } from './server';

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL,
    plugins: [
        inferAdditionalFields<typeof auth>(),
        adminClient(),
        emailOTPClient(),
    ],
});

export const { signIn, signOut, signUp, useSession } = authClient;
