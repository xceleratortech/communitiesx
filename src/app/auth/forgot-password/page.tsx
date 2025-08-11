'use client';

import { useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Loading } from '@/components/ui/loading';
import { authClient } from '@/server/auth/client';

function ForgotPasswordForm() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Use better-auth's built-in forgot password functionality
            const result = await authClient.forgetPassword({
                email,
                redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password`,
            });

            if (result.error) {
                throw new Error(
                    result.error.message || 'Failed to send reset email',
                );
            }

            setSuccess(true);
            setError(null);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Failed to send reset email',
            );
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="w-full max-w-md space-y-6">
                    <div className="text-center">
                        <div className="mb-6 flex justify-center">
                            <Image
                                src="/diamond-192.png"
                                alt="CommunitiesX Logo"
                                width={80}
                                height={80}
                                className="rounded-lg"
                            />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            CommunityX
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Powered by Xcelerator
                        </p>
                    </div>
                    <Card className="w-full">
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                                <CheckCircle className="h-6 w-6 text-green-600" />
                            </div>
                            <CardTitle className="text-2xl">
                                Check Your Email
                            </CardTitle>
                            <CardDescription>
                                We've sent a password reset link to {email}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="text-muted-foreground mb-4 text-sm">
                                Click the link in the email to reset your
                                password. The link will expire in 1 hour.
                            </p>
                        </CardContent>
                        <CardFooter className="flex flex-col space-y-4">
                            <Button asChild className="w-full">
                                <Link href="/auth/login">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back to Sign In
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center">
                    <div className="mb-6 flex justify-center">
                        <Image
                            src="/diamond-192.png"
                            alt="CommunitiesX Logo"
                            width={80}
                            height={80}
                            className="rounded-lg"
                        />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        CommunityX
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Powered by Xcelerator
                    </p>
                </div>
                <Card className="w-full">
                    <CardHeader>
                        <CardTitle className="text-2xl">
                            Forgot Password
                        </CardTitle>
                        <CardDescription>
                            Enter your email address and we'll send you a link
                            to reset your password
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label
                                    htmlFor="email"
                                    className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Email
                                </label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            {error && (
                                <div className="bg-destructive/15 text-destructive rounded-md p-3 text-sm">
                                    {error}
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="flex flex-col space-y-4">
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending Reset Link...
                                    </>
                                ) : (
                                    'Send Reset Link'
                                )}
                            </Button>

                            <Button
                                asChild
                                variant="outline"
                                className="w-full"
                            >
                                <Link href="/auth/login">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back to Sign In
                                </Link>
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}

export default function ForgotPasswordPage() {
    return (
        <Suspense
            fallback={<Loading message="Loading forgot password form..." />}
        >
            <ForgotPasswordForm />
        </Suspense>
    );
}
