import { useState, useCallback } from 'react';

interface ShareData {
    title?: string;
    text?: string;
    url?: string;
    files?: File[];
}

interface UseWebShareReturn {
    isSupported: boolean;
    isSharing: boolean;
    share: (data: ShareData) => Promise<boolean>;
    error: string | null;
}

export function useWebShare(): UseWebShareReturn {
    const [isSharing, setIsSharing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isSupported =
        typeof navigator !== 'undefined' && 'share' in navigator;

    const share = useCallback(
        async (data: ShareData): Promise<boolean> => {
            if (!isSupported) {
                setError('Web Share API is not supported in this browser');
                return false;
            }

            setIsSharing(true);
            setError(null);

            try {
                // Prepare share data
                const shareData: any = {
                    title: data.title,
                    text: data.text,
                    url: data.url,
                };

                // Add files if supported and provided
                if (
                    data.files &&
                    data.files.length > 0 &&
                    'canShare' in navigator
                ) {
                    // Check if files can be shared
                    const canShareFiles = await navigator.canShare({
                        ...shareData,
                        files: data.files,
                    });
                    if (canShareFiles) {
                        shareData.files = data.files;
                    }
                }

                await navigator.share(shareData);
                return true;
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : 'Failed to share';

                // Don't treat user cancellation as an error
                if (
                    errorMessage.includes('AbortError') ||
                    errorMessage.includes('cancelled')
                ) {
                    return false;
                }

                setError(errorMessage);
                return false;
            } finally {
                setIsSharing(false);
            }
        },
        [isSupported],
    );

    return {
        isSupported,
        isSharing,
        share,
        error,
    };
}
