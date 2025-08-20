'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import { authClient } from '@/server/auth/client';

interface OTPAuthProps {
    email: string;
    onBack: () => void;
    onSuccess: () => void;
}

export function OTPAuth({ email, onBack, onSuccess }: OTPAuthProps) {
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [sendingOTP, setSendingOTP] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [otpSent, setOtpSent] = useState(false);

    const handleSendOTP = async () => {
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
                <div className="flex items-center space-x-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onBack}
                        className="h-auto p-0"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <CardTitle className="text-2xl">Sign In with OTP</CardTitle>
                </div>
                <p className="text-muted-foreground">
                    We'll send a 6-digit code to {email}
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                {!otpSent ? (
                    <div className="space-y-4">
                        <div className="text-center">
                            <Mail className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                            <p className="text-muted-foreground text-sm">
                                Click the button below to receive your OTP
                            </p>
                        </div>
                        <Button
                            onClick={handleSendOTP}
                            disabled={sendingOTP}
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
                                Enter the 6-digit code sent to your email
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
