'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export function ProfileSkeleton() {
    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-9 w-32" />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-6 md:col-span-2">
                    {/* Basic Information */}
                    <Card>
                        <CardContent className="p-6">
                            <Skeleton className="mb-4 h-5 w-24" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Experience Section */}
                    <Card>
                        <CardContent className="p-6">
                            <Skeleton className="mb-4 h-5 w-32" />
                            <div className="space-y-4">
                                {[1, 2].map((i) => (
                                    <div key={i} className="space-y-2">
                                        <Skeleton className="h-4 w-40" />
                                        <Skeleton className="h-3 w-32" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Education Section */}
                    <Card>
                        <CardContent className="p-6">
                            <Skeleton className="mb-4 h-5 w-28" />
                            <div className="space-y-4">
                                {[1, 2].map((i) => (
                                    <div key={i} className="space-y-2">
                                        <Skeleton className="h-4 w-36" />
                                        <Skeleton className="h-3 w-28" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Skills Section */}
                    <Card>
                        <CardContent className="p-6">
                            <Skeleton className="mb-4 h-5 w-24" />
                            <div className="flex flex-wrap gap-2">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <Skeleton key={i} className="h-6 w-20" />
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Interests Section */}
                    <Card>
                        <CardContent className="p-6">
                            <Skeleton className="mb-4 h-5 w-20" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Industries Section */}
                    <Card>
                        <CardContent className="p-6">
                            <Skeleton className="mb-4 h-5 w-20" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Achievements Section */}
                    <Card>
                        <CardContent className="p-6">
                            <Skeleton className="mb-4 h-5 w-20" />
                            <div className="space-y-4">
                                {[1, 2].map((i) => (
                                    <div key={i} className="space-y-2">
                                        <Skeleton className="h-4 w-40" />
                                        <Skeleton className="h-3 w-32" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Certificates Section */}
                    <Card>
                        <CardContent className="p-6">
                            <Skeleton className="mb-4 h-5 w-20" />
                            <div className="space-y-4">
                                {[1, 2].map((i) => (
                                    <div key={i} className="space-y-2">
                                        <Skeleton className="h-4 w-40" />
                                        <Skeleton className="h-3 w-32" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
