'use client';

import * as React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type CarouselOrientation = 'horizontal' | 'vertical';

interface CarouselProps extends React.HTMLAttributes<HTMLDivElement> {
    opts?: any;
    orientation?: CarouselOrientation;
    plugins?: any[];
}

type CarouselContextValue = {
    carouselRef: (node: HTMLDivElement | null) => void;
    api: any;
    scrollPrev: () => void;
    scrollNext: () => void;
    scrollTo: (index: number) => void;
    canScrollPrev: boolean;
    canScrollNext: boolean;
    selectedIndex: number;
    slideCount: number;
    orientation: CarouselOrientation;
};

const CarouselContext = React.createContext<CarouselContextValue | null>(null);

export function useCarousel() {
    const context = React.useContext(CarouselContext);
    if (!context) {
        throw new Error('useCarousel must be used within <Carousel>');
    }
    return context;
}

export function Carousel({
    orientation = 'horizontal',
    opts,
    plugins,
    className,
    children,
    ...props
}: CarouselProps) {
    const [canScrollPrev, setCanScrollPrev] = React.useState(false);
    const [canScrollNext, setCanScrollNext] = React.useState(false);
    const [selectedIndex, setSelectedIndex] = React.useState(0);
    const [slideCount, setSlideCount] = React.useState(0);

    const [emblaRef, emblaApi] = useEmblaCarousel(
        {
            axis: orientation === 'horizontal' ? 'x' : 'y',
            loop: true,
            ...opts,
        },
        plugins,
    );

    const onSelect = React.useCallback((api: any) => {
        setCanScrollPrev(api.canScrollPrev());
        setCanScrollNext(api.canScrollNext());
        setSelectedIndex(api.selectedScrollSnap());
        setSlideCount(api.scrollSnapList().length);
    }, []);

    React.useEffect(() => {
        if (!emblaApi) return;
        onSelect(emblaApi);
        emblaApi.on('reInit', onSelect);
        emblaApi.on('select', onSelect);
    }, [emblaApi, onSelect]);

    const scrollPrev = React.useCallback(
        () => emblaApi?.scrollPrev(),
        [emblaApi],
    );
    const scrollNext = React.useCallback(
        () => emblaApi?.scrollNext(),
        [emblaApi],
    );
    const scrollTo = React.useCallback(
        (index: number) => emblaApi?.scrollTo(index),
        [emblaApi],
    );

    return (
        <CarouselContext.Provider
            value={{
                carouselRef: emblaRef,
                api: emblaApi || undefined,
                canScrollPrev,
                canScrollNext,
                scrollPrev,
                scrollNext,
                scrollTo,
                selectedIndex,
                slideCount,
                orientation,
            }}
        >
            <div
                className={cn(
                    'relative',
                    orientation === 'horizontal' ? 'w-full' : 'h-full',
                    className,
                )}
                {...props}
            >
                {children}
            </div>
        </CarouselContext.Provider>
    );
}

export const CarouselContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
    const { carouselRef, orientation } = useCarousel();
    return (
        <div ref={carouselRef} className="h-full overflow-hidden">
            <div
                ref={ref}
                className={cn(
                    'flex h-full',
                    orientation === 'horizontal'
                        ? '-ml-4'
                        : '-mt-4 h-full flex-col',
                    className,
                )}
                {...props}
            >
                {children}
            </div>
        </div>
    );
});
CarouselContent.displayName = 'CarouselContent';

export const CarouselItem = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
    const { orientation } = useCarousel();
    return (
        <div
            ref={ref}
            className={cn(
                'min-w-0 shrink-0 grow-0 basis-full',
                orientation === 'horizontal' ? 'pl-4' : 'pt-4',
                className,
            )}
            {...props}
        />
    );
});
CarouselItem.displayName = 'CarouselItem';

export const CarouselPrevious = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
    const { canScrollPrev, scrollPrev, orientation } = useCarousel();
    return (
        <Button
            ref={ref}
            variant="secondary"
            size="icon"
            className={cn(
                'absolute h-8 w-8 bg-black/50 text-white hover:bg-black/70',
                orientation === 'horizontal'
                    ? 'top-1/2 left-2 -translate-y-1/2'
                    : 'top-2 left-1/2 -translate-x-1/2',
                className,
            )}
            disabled={!canScrollPrev}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                scrollPrev();
            }}
            {...props}
        >
            <ChevronLeft className="h-4 w-4" />
        </Button>
    );
});
CarouselPrevious.displayName = 'CarouselPrevious';

export const CarouselNext = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
    const { canScrollNext, scrollNext, orientation } = useCarousel();
    return (
        <Button
            ref={ref}
            variant="secondary"
            size="icon"
            className={cn(
                'absolute h-8 w-8 bg-black/50 text-white hover:bg-black/70',
                orientation === 'horizontal'
                    ? 'top-1/2 right-2 -translate-y-1/2'
                    : 'bottom-2 left-1/2 -translate-x-1/2',
                className,
            )}
            disabled={!canScrollNext}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                scrollNext();
            }}
            {...props}
        >
            <ChevronRight className="h-4 w-4" />
        </Button>
    );
});
CarouselNext.displayName = 'CarouselNext';

export function CarouselDots({ className }: { className?: string }) {
    const { slideCount, selectedIndex, scrollTo } = useCarousel();
    if (slideCount <= 1) return null;
    return (
        <div
            className={cn(
                'absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-gray-800/60 px-2 py-1 text-white backdrop-blur-sm',
                className,
            )}
        >
            {Array.from({ length: slideCount }).map((_, i) => (
                <button
                    key={i}
                    aria-label={`Go to slide ${i + 1}`}
                    className={cn(
                        'h-2 w-2 rounded-full transition-colors',
                        i === selectedIndex
                            ? 'bg-white'
                            : 'bg-white/60 hover:bg-white/80',
                    )}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        scrollTo(i);
                    }}
                />
            ))}
        </div>
    );
}
