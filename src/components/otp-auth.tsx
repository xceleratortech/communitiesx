'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Loader2, Mail } from 'lucide-react';
import { authClient } from '@/server/auth/client';

interface OTPAuthProps {
    email: string;
    onEmailChange: (email: string) => void;
    onBack: () => void;
    onSuccess: () => void;
}

// Email validation function
const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export function OTPAuth({
    email,
    onEmailChange,
    onBack,
    onSuccess,
}: OTPAuthProps) {
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [sendingOTP, setSendingOTP] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [otpSent, setOtpSent] = useState(false);

    const handleSendOTP = async () => {
        if (!email) {
            setError('Please enter your email address first');
            return;
        }

        if (!isValidEmail(email)) {
            setError('Please enter a valid email address');
            return;
        }

        setSendingOTP(true);
        setError(null);

        try {
            const result = await authClient.emailOtp.sendVerificationOtp({
                email,
                type: 'sign-in',
            });

            if (result?.error) {
                setError(result.error.message || 'Failed to send OTP');
            } else {
                setOtpSent(true);
                setError(null);
            }
        } catch (err) {
            console.error('Failed to send OTP:', err);
            setError('Failed to send OTP. Please try again.');
        } finally {
            setSendingOTP(false);
        }
    };

    const handleSubmitOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp || otp.length !== 6) {
            setError('Please enter a valid 6-digit OTP');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await authClient.signIn.emailOtp({
                email,
                otp,
            });

            if (result?.error) {
                setError(result.error.message || 'Invalid OTP');
            } else {
                onSuccess();
            }
        } catch (err) {
            setError('Failed to verify OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        setOtp('');
        setError(null);
        await handleSendOTP();
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <p className="text-muted-foreground">
                    We'll send a 6-digit code to your email
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                {!otpSent ? (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label
                                htmlFor="otp-email"
                                className="text-sm font-medium"
                            >
                                Email Address
                            </label>
                            <Input
                                id="otp-email"
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => onEmailChange(e.target.value)}
                                required
                                className={
                                    email && !isValidEmail(email)
                                        ? 'border-destructive'
                                        : ''
                                }
                            />
                            {email && (
                                <div className="text-xs">
                                    {isValidEmail(email) ? (
                                        <span className="text-green-600">
                                            ✓ Valid email address
                                        </span>
                                    ) : (
                                        <span className="text-destructive">
                                            ✗ Please enter a valid email address
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="text-center">
                            <Mail className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                            <p className="text-muted-foreground text-sm">
                                Click the button below to receive your OTP
                            </p>
                        </div>
                        <Button
                            onClick={handleSendOTP}
                            disabled={
                                sendingOTP || !email || !isValidEmail(email)
                            }
                            className="w-full"
                        >
                            {sendingOTP ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending OTP...
                                </>
                            ) : (
                                'Send OTP'
                            )}
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmitOTP} className="space-y-4">
                        <div className="space-y-2">
                            <label
                                htmlFor="otp"
                                className="text-sm font-medium"
                            >
                                Enter 6-digit OTP
                            </label>
                            <Input
                                id="otp"
                                type="text"
                                placeholder="123456"
                                value={otp}
                                onChange={(e) => {
                                    const value = e.target.value.replace(
                                        /\D/g,
                                        '',
                                    );
                                    if (value.length <= 6) {
                                        setOtp(value);
                                    }
                                }}
                                maxLength={6}
                                className="text-center font-mono text-lg tracking-widest"
                                required
                            />
                            <p className="text-muted-foreground text-center text-xs">
                                Enter the 6-digit code sent to {email}
                            </p>
                        </div>

                        {error && (
                            <div className="bg-destructive/15 text-destructive rounded-md p-3 text-center text-sm">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading || otp.length !== 6}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                'Verify OTP'
                            )}
                        </Button>

                        <div className="text-center">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleResendOTP}
                                disabled={sendingOTP}
                                className="text-muted-foreground hover:text-primary"
                            >
                                {sendingOTP ? (
                                    <>
                                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    "Didn't receive the code? Resend"
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </CardContent>
        </Card>
    );
}
