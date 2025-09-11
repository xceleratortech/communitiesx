'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { toast } from 'sonner';

const PWA_DISMISSED_KEY = 'pwa-install-dismissed';
const PWA_DISMISSED_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Check if user previously dismissed the prompt
const wasDismissed = () => {
    if (typeof window === 'undefined') return false;

    const dismissedAt = localStorage.getItem(PWA_DISMISSED_KEY);
    if (!dismissedAt) return false;

    const dismissedTime = parseInt(dismissedAt, 10);
    const now = Date.now();

    // If dismissed more than 7 days ago, show again
    return now - dismissedTime < PWA_DISMISSED_DURATION;
};

// Check if device is mobile
const checkIsMobile = () => {
    if (typeof window === 'undefined') return false;

    // Check for mobile user agent
    const isMobileUA =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent,
        );

    // Check for touch capability and small screen
    const isTouchDevice =
        'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;

    return isMobileUA || (isTouchDevice && isSmallScreen);
};

export function PWAInstaller() {
    const [deferredPrompt, setDeferredPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Check if device is mobile
        setIsMobile(checkIsMobile());

        // Check if app is already installed
        const checkInstalled = () => {
            if (window.matchMedia('(display-mode: standalone)').matches) {
                setIsInstalled(true);
                return;
            }

            // Check if running in standalone mode on iOS
            if (window.navigator.standalone === true) {
                setIsInstalled(true);
                return;
            }
        };

        // Register service worker
        const registerServiceWorker = async () => {
            if ('serviceWorker' in navigator) {
                try {
                    const registration =
                        await navigator.serviceWorker.register('/sw.js');
                } catch (error) {
                    console.error('Service Worker registration failed:', error);
                }
            }
        };

        // Listen for beforeinstallprompt event
        const handleBeforeInstallPrompt = (e: Event) => {
            // Only show on mobile devices and if not previously dismissed
            if (!isMobile || wasDismissed()) {
                return;
            }

            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setShowInstallPrompt(true);
        };

        // Listen for appinstalled event
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setShowInstallPrompt(false);
            setDeferredPrompt(null);
            toast.success('Community-X has been installed!');
        };

        checkInstalled();
        registerServiceWorker();

        window.addEventListener(
            'beforeinstallprompt',
            handleBeforeInstallPrompt,
        );
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener(
                'beforeinstallprompt',
                handleBeforeInstallPrompt,
            );
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, [isMobile]);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        try {
            // Show the install prompt
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                toast.success('Installing Community-X...');
            }

            // Clear the deferred prompt after use
            setDeferredPrompt(null);
            setShowInstallPrompt(false);
        } catch (error) {
            console.error('Error during installation:', error);
            toast.error('Failed to install the app');
        }
    };

    const handleDismiss = () => {
        // Store dismissal timestamp in localStorage
        try {
            localStorage.setItem(PWA_DISMISSED_KEY, Date.now().toString());
        } catch (error) {
            console.error('Failed to write to localStorage:', error);
        }
        setShowInstallPrompt(false);
        toast.info("Install prompt dismissed. We'll ask again in 7 days.");
    };

    // Don't show if:
    // - Already installed
    // - Not mobile device
    // - Previously dismissed (within 7 days)
    // - No prompt available
    if (isInstalled || !isMobile || !showInstallPrompt || !deferredPrompt) {
        return null;
    }

    return (
        <div className="fixed right-4 bottom-4 left-4 z-50 mx-auto max-w-md">
            <div className="bg-background border-border rounded-lg border p-4 shadow-lg">
                <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                        <Download className="text-primary h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-foreground text-sm font-medium">
                            Install Community-X
                        </h3>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Install our app for a better experience and to share
                            content easily!
                        </p>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="text-muted-foreground hover:text-foreground flex-shrink-0"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="mt-3 flex space-x-2">
                    <Button
                        onClick={handleInstall}
                        size="sm"
                        className="flex-1"
                    >
                        Install
                    </Button>
                    <Button onClick={handleDismiss} variant="outline" size="sm">
                        Not now
                    </Button>
                </div>
            </div>
        </div>
    );
}
