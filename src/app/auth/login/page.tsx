'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from '@/server/auth/client';
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
import { Loader2, Smartphone } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Loading } from '@/components/ui/loading';
import { OTPAuth } from '@/components/otp-auth';

function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
    const [verificationSuccess, setVerificationSuccess] = useState(false);
    const [showOTP, setShowOTP] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/posts';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const result = await signIn.email({
                email,
                password,
                callbackURL: callbackUrl,
            });

            if (result?.error) {
                if (result.error.code === 'EMAIL_NOT_VERIFIED') {
                    setError(
                        'Your email is not verified. Please verify your email to continue.',
                    );
                } else {
                    setError(result.error.message || 'Failed to sign in');
                }
            } else {
                router.push(callbackUrl);
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyEmail = async () => {
        if (!email) {
            setError('Please enter your email address first');
            return;
        }

        setIsVerifyingEmail(true);
        setError(null);

        try {
            const response = await fetch('/api/auth/verify-email-direct', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to verify email');
            }

            setVerificationSuccess(true);
            setError(null);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Failed to verify email',
            );
        } finally {
            setIsVerifyingEmail(false);
        }
    };

    const handleOTPSuccess = () => {
        router.push(callbackUrl);
    };

    if (showOTP) {
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
                    <OTPAuth
                        email={email}
                        onBack={() => setShowOTP(false)}
                        onSuccess={handleOTPSuccess}
                    />
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
                        <CardTitle className="text-2xl">Sign In</CardTitle>
                        <CardDescription>
                            Enter your email and password to sign in to your
                            account
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
                            <div className="space-y-2">
                                <label
                                    htmlFor="password"
                                    className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Password
                                </label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    required
                                />
                                <div className="text-right">
                                    <Link
                                        href="/auth/forgot-password"
                                        className="text-muted-foreground hover:text-primary text-sm underline"
                                    >
                                        Forgot Password?
                                    </Link>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-destructive/15 text-destructive rounded-md p-3 text-sm">
                                    {error}
                                    {error.includes(
                                        'email is not verified',
                                    ) && (
                                        <div className="mt-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleVerifyEmail}
                                                disabled={isVerifyingEmail}
                                            >
                                                {isVerifyingEmail ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Verifying...
                                                    </>
                                                ) : (
                                                    'Verify Email Now'
                                                )}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {verificationSuccess && (
                                <div className="rounded-md bg-green-100 p-3 text-sm text-green-800">
                                    Email verified successfully! You can now
                                    sign in.
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="flex flex-col space-y-4">
                            <Button
                                type="submit"
                                className="mt-4 w-full"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </Button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background text-muted-foreground px-2">
                                        Or continue with
                                    </span>
                                </div>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={async () => {
                                    try {
                                        await signIn.social({
                                            provider: 'google',
                                            callbackURL: callbackUrl,
                                        });
                                    } catch (err) {
                                        setError(
                                            'Failed to sign in with Google',
                                        );
                                    }
                                }}
                                disabled={loading}
                            >
                                <svg
                                    className="mr-2 h-4 w-4"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        fill="currentColor"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                                Continue with Google
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                    if (!email) {
                                        setError(
                                            'Please enter your email address first',
                                        );
                                        return;
                                    }
                                    setShowOTP(true);
                                }}
                                disabled={!email}
                            >
                                <Smartphone className="mr-2 h-4 w-4" />
                                Sign in with OTP
                            </Button>

                            <div className="text-center text-sm">
                                Don't have an account?{' '}
                                <Link
                                    href="/auth/register"
                                    className="underline"
                                >
                                    Sign up
                                </Link>
                            </div>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<Loading message="Loading login form..." />}>
            <LoginForm />
        </Suspense>
    );
}
