'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';
import { useSession, signOut } from '@/server/auth/client';
import { Button } from '@/components/ui/button';

export function Navbar() {
    const { data: session } = useSession();
    const router = useRouter();

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    return (
        <nav className="bg-white shadow-sm">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 justify-between">
                    <div className="flex">
                        <Link href="/" className="flex items-center">
                            <span className="text-xl font-bold">Community</span>
                        </Link>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            {session?.user?.role === 'admin' && (
                                <Link
                                    href="/admin"
                                    className="inline-flex items-center px-1 pt-1 text-gray-900"
                                >
                                    Admin Dashboard
                                </Link>
                            )}
                            <Link
                                href="/posts"
                                className="inline-flex items-center px-1 pt-1 text-gray-900"
                            >
                                Posts
                            </Link>
                        </div>
                    </div>
                    <div className="flex items-center">
                        {session ? (
                            <div className="flex items-center space-x-4">
                                <span className="text-sm text-gray-700">
                                    {session.user.email}
                                </span>
                                <Button
                                    variant="outline"
                                    onClick={handleSignOut}
                                    className="text-sm"
                                >
                                    Sign Out
                                </Button>
                            </div>
                        ) : (
                            <Button asChild>
                                <Link href="/auth/login" className="text-sm">
                                    Sign In
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
