'use client';

import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from 'lucide-react';

interface CommunityBannerProps {
    community: any;
}

export function CommunityBanner({ community }: CommunityBannerProps) {
    return (
        <div className="mb-8">
            {/* Banner Image */}
            <div className="relative h-32 w-full overflow-hidden rounded-lg bg-gradient-to-r from-blue-400 to-blue-600 sm:h-40 md:h-48 lg:h-56">
                {community.banner && (
                    <Image
                        src={community.banner || '/placeholder.svg'}
                        alt={`${community.name} banner`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        priority
                        quality={85}
                    />
                )}
                {/* Overlay for better text readability */}
                <div className="absolute inset-0 bg-black/20" />
            </div>

            {/* Overlapping Content Container */}
            <div className="relative -mt-8 px-4 sm:-mt-10 sm:px-6 md:-mt-12 md:px-8 lg:-mt-10">
                {/* Mobile Layout */}
                <div className="block lg:hidden">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                            <Avatar className="border-background h-16 w-16 border-4 shadow-lg sm:h-20 sm:w-20">
                                <AvatarImage
                                    src={community.avatar || undefined}
                                    alt={community.name}
                                />
                                <AvatarFallback className="bg-primary text-lg font-semibold sm:text-xl">
                                    {community.name
                                        .substring(0, 2)
                                        .toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </div>

                        {/* Community Info */}
                        <div className="min-w-0 flex-1 sm:pb-2">
                            <h1 className="text-foreground mb-2 truncate text-xl font-bold sm:text-2xl">
                                {community.name}
                            </h1>
                            {/* <div className="text-muted-foreground space-y-1 text-sm">
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                        Created{' '}
                                        {new Date(
                                            community.createdAt,
                                        ).toLocaleDateString()}
                                    </span>
                                </div>
                            </div> */}
                        </div>
                    </div>
                </div>

                {/* Desktop Layout */}
                <div className="hidden lg:flex lg:items-end lg:justify-between">
                    {/* Left side - Avatar and Info */}
                    <div className="flex items-end gap-6">
                        <Avatar className="border-background h-24 w-24 border-4 shadow-lg xl:h-28 xl:w-28">
                            <AvatarImage
                                src={community.avatar || undefined}
                                alt={community.name}
                            />
                            <AvatarFallback className="bg-primary text-2xl font-semibold xl:text-3xl">
                                {community.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="pb-6">
                            <h1 className="text-foreground text-3xl font-bold xl:text-4xl">
                                {community.name}
                            </h1>
                            {/* <div className="text-muted-foreground flex items-center gap-6 text-sm">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span>
                                        Created{' '}
                                        {new Date(
                                            community.createdAt,
                                        ).toLocaleDateString()}
                                    </span>
                                </div>
                            </div> */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
