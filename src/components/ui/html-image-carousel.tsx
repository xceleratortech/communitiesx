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

interface HtmlImageCarouselProps {
    htmlContent: string;
    className?: string;
}

export function HtmlImageCarousel({
    htmlContent,
    className,
}: HtmlImageCarouselProps) {
    const imgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
    const images: string[] = [];
    let match;

    while ((match = imgRegex.exec(htmlContent)) !== null) {
        images.push(match[1]);
    }

    if (images.length === 0) {
        return null;
    }

    return (
        <div className={cn('relative w-full', className)}>
            <div className="bg-muted relative aspect-square w-full overflow-hidden rounded-lg">
                <Carousel className="h-full w-full">
                    <CarouselContent className="h-full">
                        {images.map((src, idx) => (
                            <CarouselItem
                                key={`${src}-${idx}`}
                                className="h-full"
                            >
                                <div className="relative flex h-full w-full items-center justify-center">
                                    <Image
                                        src={src}
                                        alt={`Image ${idx + 1}`}
                                        fill
                                        className="object-contain object-center"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        priority={idx === 0}
                                        quality={85}
                                    />
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    {images.length > 1 && (
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
