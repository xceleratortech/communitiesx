import React from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import NextTopLoader from 'nextjs-toploader';
import { ThemeProvider } from '@/providers/theme-provider';
import { TRPCProvider } from '@/providers/trpc-provider';
import { Navbar } from '@/components/navbar';
import { Toaster } from '@/components/ui/sonner';
import { ProfileCompletionGuard } from '@/components/profile-completion-guard';
import { PWAInstaller } from '@/components/pwa-installer';
import Script from 'next/script';
import { SentryUserProvider } from '@/providers/sentry-user-provider';


const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata = {
    title: 'Community-X',
    description: 'Community to connect and engage yourself for your interests',
    manifest: '/manifest.json',
    applicationName: 'Community-X',
    themeColor: '#000000',
    viewport: 'width=device-width, initial-scale=1',
    formatDetection: {
        telephone: false,
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'Community-X',
    },
    icons: {
        icon: '/favicon.ico',
        shortcut: '/favicon.ico',
        apple: [
            { url: '/diamond-192.png', sizes: '192x192', type: 'image/png' },
            { url: '/diamond-192.png', sizes: '152x152', type: 'image/png' },
            { url: '/diamond-192.png', sizes: '180x180', type: 'image/png' },
            { url: '/diamond-192.png', sizes: '167x167', type: 'image/png' },
        ],
    },
    other: {
        'mobile-web-app-capable': 'yes',
        'msapplication-TileColor': '#000000',
        'msapplication-tap-highlight': 'no',
        'msapplication-navbutton-color': '#000000',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className={cn(
                    geistSans.variable,
                    geistMono.variable,
                    'bg-background min-h-screen font-sans antialiased',
                )}
            >
                {process.env.NODE_ENV === 'production' &&
                    process.env.NEXT_PUBLIC_PLAUSIBLE_SRC &&
                    process.env.NEXT_PUBLIC_PLAUSIBLE_DATA_DOMAIN && (
                        <Script
                            src={process.env.NEXT_PUBLIC_PLAUSIBLE_SRC}
                            data-domain={
                                process.env.NEXT_PUBLIC_PLAUSIBLE_DATA_DOMAIN
                            }
                            strategy="afterInteractive"
                        />
                    )}
                <ThemeProvider
                    attribute="class"
                    defaultTheme="light"
                    disableTransitionOnChange
                >
                    <TRPCProvider>
                        <SentryUserProvider>
                            {/* <ChatProvider> */}
                            <Navbar />
                            <ProfileCompletionGuard>
                                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                                    <NextTopLoader />
                                    <main>{children}</main>
                                    <Toaster />
                                </div>
                            </ProfileCompletionGuard>
                            {/* <ChatContainer />
                            </ChatProvider> */}
                        </SentryUserProvider>
                    </TRPCProvider>
                </ThemeProvider>
                <PWAInstaller />
            </body>
        </html>
    );
}
