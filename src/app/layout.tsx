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
    themeColor: '#000000',
    viewport:
        'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'Community-X',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                {/* PWA Meta Tags */}
                <meta name="application-name" content="Community-X" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta
                    name="apple-mobile-web-app-status-bar-style"
                    content="default"
                />
                <meta name="apple-mobile-web-app-title" content="Community-X" />
                <meta name="format-detection" content="telephone=no" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="msapplication-TileColor" content="#000000" />
                <meta name="msapplication-tap-highlight" content="no" />

                {/* Apple Touch Icons */}
                <link rel="apple-touch-icon" href="/diamond-192.png" />
                <link
                    rel="apple-touch-icon"
                    sizes="152x152"
                    href="/diamond-192.png"
                />
                <link
                    rel="apple-touch-icon"
                    sizes="180x180"
                    href="/diamond-192.png"
                />
                <link
                    rel="apple-touch-icon"
                    sizes="167x167"
                    href="/diamond-192.png"
                />

                {/* Favicons */}
                <link rel="icon" href="/favicon.ico" />
                <link rel="shortcut icon" href="/favicon.ico" />

                {/* Theme Colors */}
                <meta name="theme-color" content="#000000" />
                <meta name="msapplication-navbutton-color" content="#000000" />
            </head>
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
                    </TRPCProvider>
                </ThemeProvider>
                <PWAInstaller />
            </body>
        </html>
    );
}
