'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
    CarouselDots,
} from '@/components/ui/carousel';

interface MixedMediaItem {
    id: number;
    type: string; // Changed from 'image' | 'video' to string to match actual data
    filename: string;
    mimetype: string;
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
}

interface MixedMediaCarouselProps {
    media: MixedMediaItem[];
    className?: string;
}

export function MixedMediaCarousel({
    media,
    className,
}: MixedMediaCarouselProps) {
    if (!media || media.length === 0) {
        return null;
    }

    // Sort by creation time to maintain upload order
    const sortedMedia = [...media].sort(
        (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const mediaList = sortedMedia
        .map((item) => ({ ...item, url: item.publicUrl || item.r2Url }))
        .filter((item) => !!item.url);

    if (mediaList.length === 0) return null;

    return (
        <div className={cn('relative w-full', className)}>
            <div className="bg-muted relative aspect-square w-full overflow-hidden rounded-lg">
                <Carousel className="h-full w-full">
                    <CarouselContent className="h-full">
                        {mediaList.map((item) => (
                            <CarouselItem key={item.id} className="h-full">
                                <div className="flex h-full w-full items-center justify-center">
                                    {item.type === 'image' ? (
                                        <Image
                                            src={item.url as string}
                                            alt={item.filename}
                                            fill
                                            className="object-contain object-center"
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                            loading="lazy"
                                            quality={85}
                                        />
                                    ) : item.type === 'video' ? (
                                        <video
                                            src={item.url as string}
                                            controls
                                            playsInline
                                            webkit-playsinline="true"
                                            preload="none"
                                            muted
                                            className="max-h-full max-w-full object-contain"
                                            crossOrigin="anonymous"
                                            disablePictureInPicture={false}
                                            controlsList="nodownload"
                                            x-webkit-airplay="allow"
                                        >
                                            Your browser does not support the
                                            video tag.
                                        </video>
                                    ) : null}
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    {mediaList.length > 1 && (
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
