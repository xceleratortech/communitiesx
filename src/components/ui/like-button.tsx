'use client';

import { useState, useEffect } from 'react';
import { ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/providers/trpc-provider';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface LikeButtonProps {
    postId: number;
    initialLikeCount: number;
    initialIsLiked: boolean;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'ghost' | 'outline';
    disabled?: boolean;
    showCount?: boolean;
    showLabel?: boolean;
    label?: string;
}

export function LikeButton({
    postId,
    initialLikeCount,
    initialIsLiked,
    className,
    size = 'sm',
    variant = 'ghost',
    disabled = false,
    showCount = true,
    showLabel = true,
    label = 'Like',
}: LikeButtonProps) {
    const [isLiked, setIsLiked] = useState(initialIsLiked);
    const [likeCount, setLikeCount] = useState(initialLikeCount);
    const [showFloat, setShowFloat] = useState(false);

    // Update state when props change (e.g., on refresh)
    useEffect(() => {
        setIsLiked(initialIsLiked);
        setLikeCount(initialLikeCount);
    }, [initialIsLiked, initialLikeCount]);

    const utils = trpc.useUtils();

    const likeMutation = trpc.community.likePost.useMutation({
        onMutate: () => {
            const previousState = { isLiked, likeCount };
            setIsLiked(true);
            setLikeCount((prev) => prev + 1);

            // Trigger floating animation
            setShowFloat(true);
            setTimeout(() => setShowFloat(false), 1000);

            return { previousState };
        },
        onSuccess: (data) => {
            setLikeCount(data.likeCount);
        },
        onError: (_error, _variables, context) => {
            if (context?.previousState) {
                setIsLiked(context.previousState.isLiked);
                setLikeCount(context.previousState.likeCount);
            }
        },
    });

    const unlikeMutation = trpc.community.unlikePost.useMutation({
        onMutate: () => {
            setIsLiked(false);
            setLikeCount((prev) => Math.max(0, prev - 1));
        },
        onSuccess: (data) => {
            setLikeCount(data.likeCount);
            // Remove invalidations to prevent loading states
            // utils.community.getPostLikeCounts.invalidate();
            // utils.community.getUserReactions.invalidate();
        },
        onError: () => {
            setIsLiked(true);
            setLikeCount((prev) => prev + 1);
        },
    });

    const isLoading = likeMutation.isPending || unlikeMutation.isPending;

    const handleLike = () => {
        if (isLoading || disabled) return;

        if (isLiked) {
            unlikeMutation.mutate({ postId });
        } else {
            likeMutation.mutate({ postId });
        }
    };

    const sizeClasses = {
        sm: 'h-8 w-8 p-1',
        md: 'h-9 w-9 p-1.5',
        lg: 'h-10 w-10 p-2',
    };

    const iconSizes = {
        sm: 'h-4 w-4',
        md: 'h-4 w-4',
        lg: 'h-5 w-5',
    };

    // Map component size to Button's size prop
    const buttonSize = size === 'sm' ? 'sm' : size === 'md' ? 'default' : 'lg';

    return (
        <div className="relative flex items-center">
            <Button
                variant={variant}
                size={buttonSize}
                onClick={handleLike}
                disabled={isLoading || disabled}
                className={cn(
                    'text-muted-foreground hover:bg-accent hover:text-foreground inline-flex items-center justify-center gap-2 transition-colors',
                    isLiked && 'text-blue-500 hover:text-blue-600',
                    className,
                )}
                aria-label={label}
            >
                <ThumbsUp
                    className={cn(
                        iconSizes[size],
                        'transition-all duration-200 md:mr-2',
                        isLiked && 'fill-current',
                    )}
                />
                {showLabel && (
                    <span className="hidden text-sm md:inline">
                        {isLiked ? 'Liked' : label}
                    </span>
                )}
            </Button>

            {/* Floating thumbs-up animation */}
            <AnimatePresence>
                {showFloat && (
                    <motion.div
                        initial={{ opacity: 1, y: 0, scale: 1 }}
                        animate={{ opacity: 0, y: -60, scale: 1.5 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="absolute left-1/2 -translate-x-1/2"
                    >
                        <ThumbsUp className="h-6 w-6 fill-blue-500 text-blue-500" />
                        <span className="text-sm font-bold text-blue-500">
                            Liked
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {showCount && likeCount > 0 && (
                <span className="text-muted-foreground ml-1 text-xs font-medium">
                    {likeCount}
                </span>
            )}
        </div>
    );
}
