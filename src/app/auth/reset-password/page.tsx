'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { Loader2, ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Loading } from '@/components/ui/loading';
import { authClient } from '@/server/auth/client';

function ResetPasswordForm() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    useEffect(() => {
        if (!token) {
            setError(
                'Invalid reset link. Please request a new password reset.',
            );
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!token) {
            setError(
                'Invalid reset link. Please request a new password reset.',
            );
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await authClient.resetPassword({
                token,
                newPassword: password,
            });

            if (result.error) {
                throw new Error(
                    result.error.message || 'Failed to reset password',
                );
            }

            setSuccess(true);
            setError(null);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Failed to reset password',
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
                                Password Reset Successfully
                            </CardTitle>
                            <CardDescription>
                                Your password has been updated. You can now sign
                                in with your new password.
                            </CardDescription>
                        </CardHeader>
                        <CardFooter className="flex flex-col space-y-4">
                            <Button asChild className="w-full">
                                <Link href="/auth/login">Sign In</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        );
    }

    if (!token) {
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
                                Invalid Reset Link
                            </CardTitle>
                            <CardDescription>
                                The password reset link is invalid or has
                                expired.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground mb-4 text-sm">
                                Please request a new password reset link.
                            </p>
                        </CardContent>
                        <CardFooter className="flex flex-col space-y-4">
                            <Button asChild className="w-full">
                                <Link href="/auth/forgot-password">
                                    Request New Reset Link
                                </Link>
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
                            Reset Password
                        </CardTitle>
                        <CardDescription>
                            Enter your new password below
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label
                                    htmlFor="password"
                                    className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    New Password
                                </label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={
                                            showPassword ? 'text' : 'password'
                                        }
                                        placeholder="Enter new password"
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        required
                                        minLength={8}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() =>
                                            setShowPassword(!showPassword)
                                        }
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                                <p className="text-muted-foreground text-xs">
                                    Password must be at least 8 characters long
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor="confirmPassword"
                                    className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Confirm New Password
                                </label>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type={
                                            showConfirmPassword
                                                ? 'text'
                                                : 'password'
                                        }
                                        placeholder="Confirm new password"
                                        value={confirmPassword}
                                        onChange={(e) =>
                                            setConfirmPassword(e.target.value)
                                        }
                                        required
                                        minLength={8}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() =>
                                            setShowConfirmPassword(
                                                !showConfirmPassword,
                                            )
                                        }
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
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
                                        Resetting Password...
                                    </>
                                ) : (
                                    'Reset Password'
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

export default function ResetPasswordPage() {
    return (
        <Suspense
            fallback={<Loading message="Loading reset password form..." />}
        >
            <ResetPasswordForm />
        </Suspense>
    );
}
