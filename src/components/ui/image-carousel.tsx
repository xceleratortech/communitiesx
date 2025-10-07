'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
    CarouselDots,
} from '@/components/ui/carousel';

interface ImageCarouselProps {
    images: Array<{
        id: number;
        filename: string;
        mimetype: string;
        type: string;
        size: number | null;
        r2Key: string;
        r2Url: string | null;
        publicUrl: string | null;
        thumbnailUrl: string | null;
        uploadedBy: string;
        postId: number | null;
        communityId: number | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    className?: string;
}

export function ImageCarousel({ images, className }: ImageCarouselProps) {
    if (!images || images.length === 0) {
        return null;
    }

    const imageList = images
        .map((img) => ({ ...img, url: img.publicUrl || img.r2Url }))
        .filter((img) => !!img.url);

    if (imageList.length === 0) return null;

    return (
        <div className={cn('relative w-full', className)}>
            <div className="bg-muted relative aspect-square w-full overflow-hidden rounded-lg">
                <Carousel className="h-full w-full">
                    <CarouselContent className="h-full">
                        {imageList.map((img) => (
                            <CarouselItem key={img.id} className="h-full">
                                <div className="flex h-full w-full items-center justify-center">
                                    <img
                                        src={img.url as string}
                                        alt={img.filename}
                                        className="max-h-full max-w-full object-contain object-center"
                                    />
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    {imageList.length > 1 && (
                        <>
                            <CarouselPrevious />
                            <CarouselNext />
                            {/* Dots */}
                            {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                            {/* @ts-ignore - imported from carousel */}
                            <CarouselDots />
                        </>
                    )}
                </Carousel>
            </div>
        </div>
    );
}
