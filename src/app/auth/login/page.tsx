'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { signIn } from '@/server/auth/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await signIn.email({
                email,
                password,
                callbackURL: '/posts',
            });
        } catch (err) {
            setError('Invalid email or password');
            setIsLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-md p-6">
            <h1 className="mb-6 text-2xl font-bold">Sign In</h1>

            {error && (
                <Alert variant="destructive" className="mb-4">
                    {error}
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
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
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
                    />
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
            </form>
        </div>
    );
}
