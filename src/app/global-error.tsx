'use client';

import * as Sentry from '@sentry/nextjs';
import NextError from 'next/error';
import { useEffect } from 'react';

export default function GlobalError({
    error,
}: {
    error: Error & { digest?: string };
}) {
    useEffect(() => {
        Sentry.captureException(error);
    }, [error]);

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
                <h1 className="mb-4 text-2xl font-bold">
                    Something went wrong!
                </h1>
                <p className="text-muted-foreground mb-4">
                    An unexpected error occurred. Please try refreshing the
                    page.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 font-medium"
                >
                    Refresh Page
                </button>
            </div>
        </div>
    );
}
