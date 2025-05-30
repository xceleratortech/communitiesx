'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { signIn } from '@/server/auth/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [isVerifying, setIsVerifying] = useState(true);
    const [isResending, setIsResending] = useState(false);
    const [networkError, setNetworkError] = useState(false);
    const [inviteData, setInviteData] = useState<{
        valid: boolean;
        orgId: string;
        role: string;
    } | null>(null);

    // Verify the invitation token
    useEffect(() => {
        async function verifyInvitation() {
            if (!token || !email) {
                setError('Missing invitation parameters');
                setIsVerifying(false);
                return;
            }

            try {
                console.log(
                    `Verifying invitation: token=${token} for email=${email}`,
                );

                // First try with GET request
                let response = await fetch(
                    `/api/auth/verify-invitation?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`,
                );

                // If GET fails, try with POST
                if (!response.ok) {
                    console.log('GET request failed, trying POST');
                    response = await fetch('/api/auth/verify-invitation', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ token, email }),
                    });
                }

                const data = await response.json();

                if (!response.ok) {
                    console.error('Verification failed:', data);
                    setError(data.error || 'Invalid invitation');
                    setIsVerifying(false);
                    return;
                }

                console.log('Verification successful:', data);
                setInviteData(data);
                setIsVerifying(false);
            } catch (err) {
                console.error('Error during verification:', err);
                setError('Failed to verify invitation');
                setIsVerifying(false);
            }
        }

        verifyInvitation();
    }, [token, email]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setNetworkError(false);

        // Validate form
        if (!name.trim()) {
            setError('Name is required');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (!inviteData || !inviteData.valid) {
            setError('Invalid invitation');
            return;
        }

        setIsLoading(true);

        try {
            // Register the user
            console.log('Registering user with data:', {
                email,
                name,
                orgId: inviteData.orgId,
                role: inviteData.role,
                token,
            });

            // Use our custom endpoint instead of signUp.email
            const registerResponse = await fetch(
                '/api/auth/register-with-org',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email,
                        password,
                        name,
                        orgId: inviteData.orgId,
                        role: inviteData.role || 'user',
                        token,
                    }),
                },
            );

            const registerData = await registerResponse.json();

            if (!registerResponse.ok) {
                console.error('Registration failed:', registerData);
                throw new Error(registerData.error || 'Registration failed');
            }

            console.log('Registration successful:', registerData);

            // Now sign in the user
            const signInResponse = await signIn.email({
                email: email as string,
                password,
                callbackURL: '/',
            });

            if (signInResponse?.error) {
                console.error(
                    'Sign-in error after registration:',
                    signInResponse.error,
                );
                // Continue anyway since registration was successful
            }

            setSuccess(true);

            // Redirect to home page after a short delay
            setTimeout(() => {
                router.push('/');
            }, 2000);
        } catch (err: any) {
            console.error('Registration error:', err);
            setIsLoading(false);

            // Handle network errors specially
            if (
                err.code === 'ETIMEDOUT' ||
                err.code === 'ECONNREFUSED' ||
                err.name === 'NetworkError'
            ) {
                setNetworkError(true);
                setError(
                    'Network error: Could not connect to the server. Please check your internet connection and try again.',
                );
            } else {
                // Extract detailed error message if available
                const errorDetail =
                    err.details?.detail ||
                    err.message ||
                    'Registration failed. Please try again.';
                setError(errorDetail);
            }
        }
    };

    const handleResendInvitation = async () => {
        if (!email) return;

        setIsResending(true);
        setError('');

        try {
            const response = await fetch('/api/auth/resend-invitation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to resend invitation');
                setIsResending(false);
                return;
            }

            // Redirect to the new invitation URL if provided
            if (data.inviteUrl) {
                router.push(data.inviteUrl);
            } else {
                setError(
                    'A new invitation has been sent to your email address',
                );
                setIsResending(false);
            }
        } catch (err) {
            console.error('Error resending invitation:', err);
            setError('Failed to resend invitation');
            setIsResending(false);
        }
    };

    if (isVerifying) {
        return (
            <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle>Verifying Invitation</CardTitle>
                        <CardDescription>
                            Please wait while we verify your invitation...
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center py-8">
                        <Loader2 className="text-primary h-12 w-12 animate-spin" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!token || !email || error || !inviteData || !inviteData.valid) {
        return (
            <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mb-4 flex justify-center">
                            <AlertCircle className="text-destructive h-16 w-16" />
                        </div>
                        <CardTitle>Invalid Invitation</CardTitle>
                        <CardDescription className="mt-2">
                            {error ||
                                'This invitation link is invalid or has expired.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-muted-foreground text-sm">
                            <p>Possible reasons:</p>
                            <ul className="mt-2 list-disc space-y-1 pl-5">
                                <li>The invitation link has expired</li>
                                <li>The invitation has already been used</li>
                                <li>
                                    The email address doesn't match the
                                    invitation
                                </li>
                                <li>
                                    A new invitation was sent after this link
                                    was generated
                                </li>
                            </ul>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-center gap-4 pt-4">
                        <Button asChild variant="outline">
                            <Link href="/auth/login">Go to Login</Link>
                        </Button>
                        {email && (
                            <Button
                                onClick={handleResendInvitation}
                                disabled={isResending}
                            >
                                {isResending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Resending...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Resend Invitation
                                    </>
                                )}
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </div>
        );
    }

    if (success) {
        return (
            <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mb-4 flex justify-center">
                            <CheckCircle className="text-primary h-16 w-16" />
                        </div>
                        <CardTitle>Registration Successful!</CardTitle>
                        <CardDescription className="mt-2">
                            Your account has been created successfully.
                            Redirecting to the home page...
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle>Complete Your Registration</CardTitle>
                    <CardDescription>
                        Create your account to join the platform
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <Alert variant="destructive" className="mb-4">
                            {error}
                            {networkError && (
                                <div className="mt-2 flex justify-end">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            handleSubmit({
                                                preventDefault: () => {},
                                            } as React.FormEvent)
                                        }
                                    >
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Retry
                                    </Button>
                                </div>
                            )}
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label
                                htmlFor="email"
                                className="mb-1 block text-sm font-medium text-gray-700"
                            >
                                Email
                            </label>
                            <Input
                                type="email"
                                id="email"
                                value={email || ''}
                                disabled
                                className="bg-muted"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="name"
                                className="mb-1 block text-sm font-medium text-gray-700"
                            >
                                Full Name
                            </label>
                            <Input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="mb-1 block text-sm font-medium text-gray-700"
                            >
                                Password
                            </label>
                            <Input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="confirmPassword"
                                className="mb-1 block text-sm font-medium text-gray-700"
                            >
                                Confirm Password
                            </label>
                            <Input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) =>
                                    setConfirmPassword(e.target.value)
                                }
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating Account...
                                </>
                            ) : (
                                'Complete Registration'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
