'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Loader2, Check } from 'lucide-react';
import { useWebShare } from '@/hooks/use-web-share';
import { toast } from 'sonner';

interface ShareButtonProps {
    title?: string;
    text?: string;
    url?: string;
    files?: File[];
    variant?:
        | 'default'
        | 'destructive'
        | 'outline'
        | 'secondary'
        | 'ghost'
        | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    className?: string;
    children?: React.ReactNode;
    onShareSuccess?: () => void;
    onShareError?: (error: string) => void;
    showLabel?: boolean;
    label?: string;
}

export function ShareButton({
    title,
    text,
    url,
    files,
    variant = 'outline',
    size = 'default',
    className,
    children,
    onShareSuccess,
    onShareError,
    showLabel = true,
    label = 'Share',
}: ShareButtonProps) {
    const { isSupported, isSharing, share, error } = useWebShare();
    const [showSuccess, setShowSuccess] = useState(false);

    const handleShare = async () => {
        if (!isSupported) {
            toast.error('Sharing is not supported in this browser');
            return;
        }

        const success = await share({ title, text, url, files });

        if (success) {
            setShowSuccess(true);
            onShareSuccess?.();
            toast.success('Content shared successfully!');

            // Reset success state after 2 seconds
            setTimeout(() => setShowSuccess(false), 2000);
        } else if (error) {
            onShareError?.(error);
            toast.error(`Failed to share: ${error}`);
        }
    };

    if (!isSupported) {
        return null; // Don't render if not supported
    }

    return (
        <Button
            variant={variant}
            size={size}
            className={className}
            onClick={handleShare}
            disabled={isSharing}
            aria-label={label}
        >
            {isSharing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : showSuccess ? (
                <Check className="h-4 w-4" />
            ) : (
                <Share2 className="h-4 w-4" />
            )}
            {showLabel && (
                <span className="ml-2 hidden md:inline">
                    {children ?? label}
                </span>
            )}
        </Button>
    );
}
