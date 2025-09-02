'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';

interface GlobalErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
    useEffect(() => {
        Sentry.captureException(error);
    }, [error]);

    // Determine if this is a database-related error
    const isDatabaseError =
        error.message?.includes('database') ||
        error.message?.includes('connection') ||
        error.message?.includes('timeout') ||
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('ENOTFOUND') ||
        error.message?.includes('ETIMEDOUT') ||
        error.message?.includes('relation') ||
        error.message?.includes('column') ||
        error.message?.includes('syntax') ||
        error.message?.includes('duplicate') ||
        error.message?.includes('constraint');

    // Determine if this is a validation error
    const isValidationError =
        error.message?.includes('validation') ||
        error.message?.includes('invalid') ||
        error.message?.includes('required') ||
        error.message?.includes('format');

    // Determine if this is an authentication error
    const isAuthError =
        error.message?.includes('unauthorized') ||
        error.message?.includes('forbidden') ||
        error.message?.includes('authentication') ||
        error.message?.includes('session') ||
        error.message?.includes('token');

    // Get appropriate error message based on error type
    const getErrorMessage = () => {
        if (isDatabaseError) {
            return {
                title: 'Service Temporarily Unavailable',
                description:
                    "We're experiencing technical difficulties. Please try again in a few moments.",
                userMessage:
                    'Our servers are currently experiencing issues. Please try again later.',
            };
        }

        if (isValidationError) {
            return {
                title: 'Invalid Request',
                description:
                    'The information you provided is not valid. Please check your input and try again.',
                userMessage: 'Please check your input and try again.',
            };
        }

        if (isAuthError) {
            return {
                title: 'Access Denied',
                description:
                    "You don't have permission to access this resource or your session has expired.",
                userMessage:
                    'Please log in again or contact support if you believe this is an error.',
            };
        }

        // Default error message
        return {
            title: 'Something Went Wrong',
            description:
                'An unexpected error occurred. Our team has been notified and is working to fix it.',
            userMessage:
                'Please try again or contact support if the problem persists.',
        };
    };

    const errorInfo = getErrorMessage();

    return (
        <html>
            <body>
                <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-slate-900 dark:to-slate-800">
                    <Card className="w-full max-w-md border-0 bg-white/80 shadow-xl backdrop-blur-sm dark:bg-slate-800/80">
                        <CardHeader className="pb-4 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                            </div>
                            <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                                {errorInfo.title}
                            </CardTitle>
                            <CardDescription className="text-slate-600 dark:text-slate-400">
                                {errorInfo.description}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            {/* User-friendly message */}
                            <div className="text-center">
                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                    {errorInfo.userMessage}
                                </p>
                            </div>

                            {/* Error ID for debugging (only in development) */}
                            {process.env.NODE_ENV === 'development' &&
                                error.digest && (
                                    <div className="text-center">
                                        <p className="text-xs text-slate-500 dark:text-slate-500">
                                            Error ID: {error.digest}
                                        </p>
                                    </div>
                                )}

                            {/* Action buttons */}
                            <div className="flex flex-col space-y-3 pt-4">
                                <Button
                                    onClick={reset}
                                    className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                                >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Try Again
                                </Button>

                                <Button
                                    asChild
                                    variant="outline"
                                    className="w-full"
                                >
                                    <Link href="/">
                                        <Home className="mr-2 h-4 w-4" />
                                        Go Home
                                    </Link>
                                </Button>
                            </div>

                            {/* Additional help */}
                            <div className="border-t border-slate-200 pt-4 text-center dark:border-slate-700">
                                <p className="text-xs text-slate-500 dark:text-slate-500">
                                    If this problem continues, please{' '}
                                    <Link
                                        href="/contact"
                                        className="text-slate-700 hover:underline dark:text-slate-300"
                                    >
                                        contact support
                                    </Link>
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </body>
        </html>
    );
}
