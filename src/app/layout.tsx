import React from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import NextTopLoader from 'nextjs-toploader';
import { ThemeProvider } from '@/providers/theme-provider';
import { TRPCProvider } from '@/providers/trpc-provider';
import { ChatProvider } from '@/providers/chat-provider';
import { Navbar } from '@/components/navbar';
import { ChatContainer } from '@/components/chat/chat-container';
import { Toaster } from '@/components/ui/sonner';

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
                <ThemeProvider
                    attribute="class"
                    defaultTheme="light"
                    disableTransitionOnChange
                >
                    <TRPCProvider>
                        <ChatProvider>
                            <Navbar />
                            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                                <NextTopLoader />
                                <main>{children}</main>
                                <Toaster />
                            </div>
                            <ChatContainer />
                        </ChatProvider>
                    </TRPCProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
