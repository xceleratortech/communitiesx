'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { SparklesCore } from '@/components/ui/sparkles';
import { useSession } from '@/server/auth/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
    const { data: session } = useSession();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Redirect logged-in users away from the landing page
    useEffect(() => {
        if (session) {
            router.replace('/posts');
        }
    }, [session, router]);

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden pt-14 text-center">
            <div className="fixed inset-0 top-0 h-screen w-screen bg-gradient-to-b from-blue-50 to-white dark:from-blue-950 dark:to-gray-900">
                <SparklesCore
                    id="tsparticles"
                    background="transparent"
                    particleColor="#3b82f6"
                    particleDensity={120}
                    speed={2}
                    minSize={0.6}
                    maxSize={1.4}
                    className="h-full w-full"
                />
            </div>
            <div className="relative z-10 px-4">
                <h1 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl dark:text-gray-100">
                    Let&apos;s Build a{' '}
                    <span className="text-blue-600 dark:text-blue-400">
                        Community
                    </span>
                </h1>
                <p className="mx-auto mb-8 max-w-2xl text-center text-xl text-gray-600 dark:text-gray-300">
                    Join us in creating a space where we can learn, share, and
                    grow together. Your journey of growth starts here with our
                    community.
                </p>
                <div className="flex flex-col justify-center space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
                    <Button asChild size="lg">
                        <a
                            href={mounted && session ? '/posts' : '/auth/login'}
                            className="rounded-lg px-8 py-3 text-lg font-semibold shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        >
                            Explore Posts
                        </a>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                        <a
                            href={
                                mounted && session
                                    ? '/communities'
                                    : '/auth/login'
                            }
                            className="rounded-lg px-8 py-3 text-lg font-semibold text-blue-600 shadow-sm ring-1 ring-blue-200 ring-inset focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-blue-400 dark:ring-blue-800"
                        >
                            {/* {mounted && session ? "Browse Communities" : "Join Community"} */}
                            Join Community
                        </a>
                    </Button>
                </div>
                <div className="mt-16 grid grid-cols-1 gap-8 text-center sm:grid-cols-3 sm:gap-12">
                    <Card className="bg-white/80 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
                        <CardHeader className="flex items-center justify-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="h-6 w-6 text-blue-600 dark:text-blue-400"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                                    />
                                </svg>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <CardTitle>Connect</CardTitle>
                            <p className="mt-2 text-gray-600 dark:text-gray-300">
                                Meet like-minded individuals and build
                                meaningful connections
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/80 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
                        <CardHeader className="flex items-center justify-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="h-6 w-6 text-blue-600 dark:text-blue-400"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"
                                    />
                                </svg>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <CardTitle>Learn</CardTitle>
                            <p className="mt-2 text-gray-600 dark:text-gray-300">
                                Share knowledge and learn from community
                                experiences
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/80 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
                        <CardHeader className="flex items-center justify-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="h-6 w-6 text-blue-600 dark:text-blue-400"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
                                    />
                                </svg>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <CardTitle>Grow</CardTitle>
                            <p className="mt-2 text-gray-600 dark:text-gray-300">
                                Achieve your goals and grow together as a
                                community
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
