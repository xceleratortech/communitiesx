'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function PostSkeleton() {
    return (
        <div className="mt-5 space-y-4">
            {[...Array(5)].map((_, index) => (
                <Card key={index} className="relative gap-2 py-2">
                    {index % 2 === 0 && (
                        <div className="border-b px-4 pt-0.5 pb-1.5">
                            <div className="flex items-center">
                                <div className="mr-2 flex items-center">
                                    <Skeleton className="mr-1.5 h-5 w-5 rounded-full" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                                <Skeleton className="h-3 w-24" />
                            </div>
                        </div>
                    )}
                    <div className="px-4 py-0">
                        <Skeleton className="mb-2 h-6 w-3/4" />
                        <Skeleton className="mb-2 h-4 w-full" />
                        <Skeleton className="mb-2 h-4 w-full" />
                        <Skeleton className="mb-2 h-4 w-2/3" />
                        <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {index % 3 === 0 && (
                                    <Skeleton className="mr-2 h-5 w-20 rounded-full" />
                                )}
                                <Skeleton className="h-4 w-32" />
                                <div className="ml-4">
                                    <Skeleton className="h-4 w-8" />
                                </div>
                            </div>
                            {index % 2 === 1 && (
                                <div className="flex space-x-1">
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
}
