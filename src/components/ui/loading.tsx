/* eslint-disable @next/next/no-img-element */
'use client';

interface LoadingProps {
    message?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function Loading({
    message = 'Loading...',
    size = 'md',
    className = '',
}: LoadingProps) {
    const sizeClasses = {
        sm: 'h-6 w-6',
        md: 'h-12 w-12',
        lg: 'h-16 w-16',
    };

    return (
        <div
            className={`bg-background flex min-h-screen items-center justify-center p-4 ${className}`}
        >
            <div className="flex w-full max-w-[400px] flex-col items-center gap-4">
                <div className="relative">
                    <div className="animate-pulse">
                        <img
                            src={
                                'https://bucket.xcelerator.co.in/maskable-icon-192.png'
                            }
                            alt={'logo'}
                            className={`${sizeClasses[size]} animate-bounce object-contain`}
                        />
                    </div>
                </div>
                <p className="text-muted-foreground text-center text-sm">
                    {message}
                </p>
            </div>
        </div>
    );
}
