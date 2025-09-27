'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!images || images.length === 0) {
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
    const imageUrl = currentImage.publicUrl || currentImage.r2Url;

    if (!imageUrl) {
        return null;
    }

    return (
        <div className={cn('relative w-full', className)}>
            {/* Main image container */}
            <div className="bg-muted relative aspect-square w-full overflow-hidden rounded-lg">
                <img
                    src={imageUrl}
                    alt={currentImage.filename}
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
