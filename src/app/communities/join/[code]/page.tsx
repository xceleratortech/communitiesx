'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/providers/trpc-provider';
import { useSession, signUp } from '@/server/auth/client';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export default function JoinCommunityPage() {
    const params = useParams();
    const router = useRouter();
    const inviteCode = params.code as string;
    const sessionData = useSession();
    const session = sessionData.data;

    // Use client-side flag to avoid hydration mismatch
    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [communitySlug, setCommunitySlug] = useState<string | null>(null);

    // State for invite information
    const [inviteInfo, setInviteInfo] = useState<{
        email: string | null;
        role: string;
        communityName: string;
        orgId: string | null;
    } | null>(null);

    // State for registration form
    const [registrationForm, setRegistrationForm] = useState({
        fullName: '',
        password: '',
        confirmPassword: '',
        acceptTerms: false,
    });

    // Validate invite code and get invite information
    const validateInviteQuery = trpc.community.getInviteInfo.useQuery(
        { inviteCode },
        { enabled: !!inviteCode && isClient },
    );

    // Handle invite info success and error
    useEffect(() => {
        if (validateInviteQuery.data) {
            setInviteInfo(validateInviteQuery.data);
        }
        if (validateInviteQuery.error) {
            setError(validateInviteQuery.error.message);
        }
    }, [validateInviteQuery.data, validateInviteQuery.error]);

    // Join community mutation
    const joinCommunityMutation = trpc.community.joinViaInvite.useMutation({
        onSuccess: (data) => {
            setSuccess(true);
            setIsProcessing(false);
            if (data.community?.slug) {
                setCommunitySlug(data.community.slug);
                // Redirect after a short delay to allow the user to see the success message
                setTimeout(() => {
                    router.push(`/communities/${data.community.slug}`);
                }, 2000);
            }
        },
        onError: (error) => {
            setError(error.message);
            setIsProcessing(false);
        },
    });

    // Process the invite for existing users
    useEffect(() => {
        if (session && inviteCode && !isProcessing && !success && !error) {
            setIsProcessing(true);
            joinCommunityMutation.mutate({ inviteCode });
        }
    }, [
        session,
        inviteCode,
        isProcessing,
        success,
        error,
        joinCommunityMutation,
    ]);

    // Handle form input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setRegistrationForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // Handle checkbox change
    const handleCheckboxChange = (checked: boolean) => {
        setRegistrationForm((prev) => ({
            ...prev,
            acceptTerms: checked,
        }));
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate form
        if (!registrationForm.fullName.trim()) {
            setError('Full name is required');
            return;
        }

        if (registrationForm.password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        if (registrationForm.password !== registrationForm.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (!registrationForm.acceptTerms) {
            setError('You must accept the Terms & Conditions');
            return;
        }

        if (!inviteInfo?.email) {
            setError('Invalid invitation');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            // Register the user
            await signUp.email({
                email: inviteInfo.email,
                password: registrationForm.password,
                name: registrationForm.fullName,
                // If the invite includes an organization ID, include it in registration
                ...(inviteInfo.orgId ? { orgId: inviteInfo.orgId } : {}),
            });

            // After registration, the user will be automatically logged in
            // Now join the community
            joinCommunityMutation.mutate({
                inviteCode,
                registration: {
                    name: registrationForm.fullName,
                    password: registrationForm.password,
                },
            });
        } catch (err) {
            const error = err as Error;
            setError(error.message || 'Registration failed');
            setIsProcessing(false);
        }
    };

    // Don't render anything meaningful during SSR to avoid hydration mismatches
    if (!isClient) {
        return (
            <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle>Loading...</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center py-8">
                        <Loader2 className="text-primary h-12 w-12 animate-spin" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Loading state while checking session or validating invite
    if (validateInviteQuery.isLoading) {
        return (
            <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle>Checking invitation</CardTitle>
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

    // Error state for invalid invite
    if (
        validateInviteQuery.error ||
        (!validateInviteQuery.isLoading && !inviteInfo)
    ) {
        return (
            <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mb-4 flex justify-center">
                            <XCircle className="text-destructive h-16 w-16" />
                        </div>
                        <CardTitle>Invalid Invitation</CardTitle>
                        <CardDescription className="mt-2">
                            {validateInviteQuery.error?.message ||
                                'This invitation link is invalid or has expired.'}
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-center pt-4">
                        <Button asChild>
                            <Link href="/communities">Browse Communities</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // Registration form for new users (when email is provided in the invite and user is not logged in)
    if (!session && inviteInfo?.email) {
        return (
            <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle>Complete Your Onboarding</CardTitle>
                        <CardDescription className="mt-4">
                            <div>
                                You were invited as{' '}
                                <span className="font-semibold">
                                    {inviteInfo.role}
                                </span>
                            </div>
                            <div>
                                You have been invited to group{' '}
                                <span className="font-semibold">
                                    {inviteInfo.communityName}
                                </span>
                            </div>
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    id="fullName"
                                    name="fullName"
                                    placeholder="Full Name"
                                    value={registrationForm.fullName}
                                    onChange={handleInputChange}
                                    disabled={isProcessing}
                                />
                            </div>

                            <div className="space-y-2">
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    placeholder="Password"
                                    value={registrationForm.password}
                                    onChange={handleInputChange}
                                    disabled={isProcessing}
                                />
                            </div>

                            <div className="space-y-2">
                                <Input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    placeholder="Confirm Password"
                                    value={registrationForm.confirmPassword}
                                    onChange={handleInputChange}
                                    disabled={isProcessing}
                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="acceptTerms"
                                    checked={registrationForm.acceptTerms}
                                    onCheckedChange={handleCheckboxChange}
                                    disabled={isProcessing}
                                />
                                <label
                                    htmlFor="acceptTerms"
                                    className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Accept Terms & Conditions
                                </label>
                            </div>

                            {error && (
                                <div className="text-destructive text-sm">
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Processing...
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

    // If not logged in, show a message and redirect to login
    if (session === null) {
        // If there's no email in the invite, redirect to login
        useEffect(() => {
            router.push(
                `/auth/login?returnUrl=${encodeURIComponent(`/communities/join/${inviteCode}`)}`,
            );
        }, [inviteCode, router]);

        return (
            <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle>Authentication Required</CardTitle>
                        <CardDescription>
                            You need to be logged in to join this community.
                            Redirecting to login...
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center py-8">
                        <Loader2 className="text-primary h-12 w-12 animate-spin" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Processing the invite
    if (isProcessing) {
        return (
            <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle>Joining Community</CardTitle>
                        <CardDescription>
                            Please wait while we process your invitation...
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center py-8">
                        <Loader2 className="text-primary h-12 w-12 animate-spin" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mb-4 flex justify-center">
                            <XCircle className="text-destructive h-16 w-16" />
                        </div>
                        <CardTitle>Unable to Join Community</CardTitle>
                        <CardDescription className="mt-2">
                            {error}
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-center pt-4">
                        <Button asChild>
                            <Link href="/communities">Browse Communities</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // Success state
    if (success) {
        return (
            <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mb-4 flex justify-center">
                            <CheckCircle className="text-primary h-16 w-16" />
                        </div>
                        <CardTitle>Successfully Joined!</CardTitle>
                        <CardDescription className="mt-2">
                            You have successfully joined the community.
                            {communitySlug &&
                                ' Redirecting you to the community page...'}
                        </CardDescription>
                    </CardHeader>
                    {communitySlug && (
                        <CardFooter className="flex justify-center pt-4">
                            <Button asChild>
                                <Link href={`/communities/${communitySlug}`}>
                                    Go to Community{' '}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            </div>
        );
    }

    // Default state (should not normally be visible)
    return (
        <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle>Processing Invitation</CardTitle>
                    <CardDescription>Please wait...</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center py-8">
                    <Loader2 className="text-primary h-12 w-12 animate-spin" />
                </CardContent>
            </Card>
        </div>
    );
}
