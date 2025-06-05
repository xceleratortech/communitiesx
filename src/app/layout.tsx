import React from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/providers/theme-provider';
import { TRPCProvider } from '@/providers/trpc-provider';
import { ChatProvider } from '@/providers/chat-provider';
import { Navbar } from '@/components/navbar';
import { ChatContainer } from '@/components/chat/chat-container';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata = {
    title: 'Community App',
    description: 'A place to share and discuss with the community',
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
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <TRPCProvider>
                        <ChatProvider>
                            <Navbar />
                            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                                <main>{children}</main>
                            </div>
                            <ChatContainer />
                        </ChatProvider>
                    </TRPCProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
