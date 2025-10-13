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

interface HtmlVideoCarouselProps {
    htmlContent: string;
    className?: string;
}

export function HtmlVideoCarousel({
    htmlContent,
    className,
}: HtmlVideoCarouselProps) {
    // Extract video URLs from VIDEO placeholders
    const videoRegex = /\[VIDEO:([^\]]+)\]/gi;
    const videos: string[] = [];
    let match;

    while ((match = videoRegex.exec(htmlContent)) !== null) {
        videos.push(match[1]);
    }

    if (videos.length === 0) {
        return null;
    }

    return (
        <div className={cn('relative w-full', className)}>
            <div className="bg-muted relative aspect-video w-full overflow-hidden rounded-lg">
                <Carousel className="h-full w-full">
                    <CarouselContent className="h-full">
                        {videos.map((src, idx) => (
                            <CarouselItem
                                key={`${src}-${idx}`}
                                className="h-full"
                            >
                                <div className="flex h-full w-full items-center justify-center">
                                    <video
                                        src={src}
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
                                        Your browser does not support the video
                                        tag.
                                    </video>
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    {videos.length > 1 && (
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
