'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

export function PWAInstaller() {
    const [deferredPrompt, setDeferredPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);

    useEffect(() => {
        // Check if app is already installed
        const checkInstalled = () => {
            if (window.matchMedia('(display-mode: standalone)').matches) {
                setIsInstalled(true);
                return;
            }

            // Check if running in standalone mode on iOS
            if ((window.navigator as any).standalone === true) {
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
                    console.log(
                        'Service Worker registered successfully:',
                        registration,
                    );
                } catch (error) {
                    console.error('Service Worker registration failed:', error);
                }
            }
        };

        // Listen for beforeinstallprompt event
        const handleBeforeInstallPrompt = (e: Event) => {
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
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        try {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
        } catch (error) {
            console.error('Error during installation:', error);
            toast.error('Failed to install the app');
        }
    };

    const handleDismiss = () => {
        setShowInstallPrompt(false);
    };

    // Don't show if already installed or no prompt available
    if (isInstalled || !showInstallPrompt || !deferredPrompt) {
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
