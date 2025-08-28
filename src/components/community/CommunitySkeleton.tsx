'use client';

import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function CommunitySkeleton() {
    return (
        <div className="container mx-auto px-4 py-8 md:px-6">
            {/* Banner and Community Info Skeleton */}
            <div className="mb-8">
                <Skeleton className="h-32 w-full rounded-lg sm:h-40 md:h-48 lg:h-56" />

                {/* Overlapping Content Skeleton */}
                <div className="relative -mt-8 px-4 sm:-mt-10 sm:px-6 md:-mt-12 md:px-8 lg:-mt-16">
                    {/* Mobile Layout Skeleton */}
                    <div className="block lg:hidden">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                            <Skeleton className="h-16 w-16 rounded-full sm:h-20 sm:w-20" />
                            <div className="flex-1 sm:pb-2">
                                <Skeleton className="mb-2 h-6 w-48" />
                                <Skeleton className="mb-1 h-4 w-32" />
                                <Skeleton className="h-4 w-40" />
                            </div>
                        </div>
                        <div className="mt-4 space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    </div>

                    {/* Desktop Layout Skeleton */}
                    <div className="hidden lg:flex lg:items-end lg:justify-between">
                        <div className="flex items-end gap-6">
                            <Skeleton className="h-24 w-24 rounded-full xl:h-28 xl:w-28" />
                            <div className="pb-3">
                                <Skeleton className="mb-2 h-8 w-64" />
                                <Skeleton className="h-4 w-48" />
                            </div>
                        </div>
                        <div className="flex gap-3 pb-3">
                            <Skeleton className="h-10 w-32" />
                            <Skeleton className="h-10 w-32" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs Skeleton */}
            <div className="mb-6">
                <div className="border-b">
                    <Skeleton className="h-10 w-80" />
                </div>
            </div>

            {/* Content Skeleton */}
            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-20 w-full" />
                    </CardContent>
                    <CardFooter>
                        <Skeleton className="h-8 w-24" />
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
