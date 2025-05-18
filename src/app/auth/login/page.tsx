'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { signIn } from '@/server/auth/client';

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
                <div className="mb-4 rounded bg-red-50 p-4 text-red-600">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label
                        htmlFor="email"
                        className="mb-1 block text-sm font-medium text-gray-700"
                    >
                        Email
                    </label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded border p-2"
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
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded border p-2"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
                >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                </button>
            </form>
        </div>
    );
}
