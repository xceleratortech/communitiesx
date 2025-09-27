'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HtmlImageCarouselProps {
    htmlContent: string;
    className?: string;
}

export function HtmlImageCarousel({
    htmlContent,
    className,
}: HtmlImageCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Extract img tags from HTML content
    const imgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
    const images: string[] = [];
    let match;

    while ((match = imgRegex.exec(htmlContent)) !== null) {
        images.push(match[1]);
    }

    if (images.length === 0) {
        return null;
    }

    const goToPrevious = () => {
        setCurrentIndex((prevIndex) =>
            prevIndex === 0 ? images.length - 1 : prevIndex - 1,
        );
    };

    const goToNext = () => {
        setCurrentIndex((prevIndex) =>
            prevIndex === images.length - 1 ? 0 : prevIndex + 1,
        );
    };

    const currentImage = images[currentIndex];

    return (
        <div className={cn('relative w-full', className)}>
            {/* Main image container */}
            <div className="bg-muted relative aspect-square w-full overflow-hidden rounded-lg">
                <img
                    src={currentImage}
                    alt={`Image ${currentIndex + 1}`}
                    className="h-full w-full object-cover"
                />

                {/* Navigation buttons */}
                {images.length > 1 && (
                    <>
                        <Button
                            variant="secondary"
                            size="icon"
                            className="absolute top-1/2 left-2 h-8 w-8 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                goToPrevious();
                            }}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="secondary"
                            size="icon"
                            className="absolute top-1/2 right-2 h-8 w-8 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                goToNext();
                            }}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </>
                )}
            </div>

            {/* Image indicators */}
            {images.length > 1 && (
                <div className="mt-2 flex justify-center space-x-1">
                    {images.map((_, index) => (
                        <button
                            key={index}
                            className={cn(
                                'h-2 w-2 rounded-full transition-colors',
                                index === currentIndex
                                    ? 'bg-primary'
                                    : 'bg-muted-foreground/30',
                            )}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setCurrentIndex(index);
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
