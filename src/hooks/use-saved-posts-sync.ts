import { useEffect, useRef } from 'react';
import { trpc } from '@/providers/trpc-provider';

/**
 * Custom hook to handle cross-page synchronization of saved posts
 * This ensures that when posts are saved/unsaved on other pages,
 * the saved posts list updates automatically without showing loading states
 */
export function useSavedPostsSync() {
    const utils = trpc.useUtils();
    const lastSyncRef = useRef<number>(Date.now());

    useEffect(() => {
        // Set up a periodic check for saved posts updates
        // This runs in the background without affecting UI loading states
        const interval = setInterval(() => {
            // Only refetch if enough time has passed to avoid excessive requests
            const now = Date.now();
            if (now - lastSyncRef.current > 2000) {
                // 2 seconds minimum between checks
                utils.community.getSavedPosts
                    .refetch()
                    .then(() => {
                        lastSyncRef.current = now;
                    })
                    .catch(() => {
                        // Silently handle errors to avoid disrupting user experience
                    });
            }
        }, 5000); // Check every 5 seconds

        return () => clearInterval(interval);
    }, [utils.community.getSavedPosts]);

    // Also listen for window focus events to sync when user returns to tab
    useEffect(() => {
        const handleFocus = () => {
            const now = Date.now();
            if (now - lastSyncRef.current > 1000) {
                // 1 second minimum on focus
                utils.community.getSavedPosts
                    .refetch()
                    .then(() => {
                        lastSyncRef.current = now;
                    })
                    .catch(() => {
                        // Silently handle errors
                    });
            }
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [utils.community.getSavedPosts]);

    return {
        // Expose a manual sync function if needed
        syncSavedPosts: () => {
            return utils.community.getSavedPosts.refetch();
        },
    };
}
