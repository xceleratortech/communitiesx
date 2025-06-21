'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { useSession, signOut } from '@/server/auth/client';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Globe, Menu, X, User, LogOut, Settings } from 'lucide-react';
import { ChatButton } from '@/components/chat-button';
import { useChat } from '@/providers/chat-provider';
import { NotificationButton } from './NotificationButton';
import { ViewNotificationButton } from './ViewNotificationButton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function Navbar() {
    const { data: session } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { closeChat } = useChat();

    // Set mounted state to true after hydration
    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSignOut = async () => {
        // Close chat drawer before signing out
        closeChat();
        await signOut();
        router.push('/');
    };

    // Function to determine if a path is active
    const isActive = (path: string) => {
        if (!pathname) return false;
        return pathname.startsWith(path);
    };

    // Get the active link style - Reddit-inspired
    const getNavLinkClass = (path: string) => {
        const baseClass =
            'inline-flex items-center px-3 py-2 text-sm font-medium rounded-full transition-colors';
        const activeClass = 'bg-muted text-foreground';
        const inactiveClass =
            'text-muted-foreground hover:text-foreground hover:bg-muted/50';

        return `${baseClass} ${isActive(path) ? activeClass : inactiveClass}`;
    };

    // Get the active mobile link style
    const getMobileNavLinkClass = (path: string) => {
        const baseClass =
            'flex items-center px-4 py-3 text-base font-medium rounded-lg transition-colors';
        const activeClass = 'bg-muted text-foreground';
        const inactiveClass =
            'text-muted-foreground hover:text-foreground hover:bg-muted/50';

        return `${baseClass} ${isActive(path) ? activeClass : inactiveClass}`;
    };


    const getUserInitials = (email: string) => {
        return email.substring(0, 2).toUpperCase();
    };

    return (
        <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
            <div className="container mx-auto flex h-14 max-w-screen-2xl items-center px-4">
                {/* Logo */}
                <div className="mr-6 flex items-center space-x-2">
                    <Link href="/" className="flex items-center space-x-2">
                        <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold">
                            AU
                        </div>
                        <span className="text-foreground hidden font-bold sm:inline-block">
                            AU NEP
                        </span>
                    </Link>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden items-center space-x-1 md:flex">
                    {mounted && session && (
                        <>
                            <Link
                                href="/posts"
                                className={getNavLinkClass('/posts')}
                            >
                                Posts
                            </Link>
                            <Link
                                href="/communities"
                                className={getNavLinkClass('/communities')}
                            >
                                <Globe className="mr-1.5 h-4 w-4" />
                                Communities
                            </Link>
                            {session?.user?.role === 'admin' && (
                                <Link
                                    href="/admin"
                                    className={getNavLinkClass('/admin')}
                                >
                                    <Settings className="mr-1.5 h-4 w-4" />
                                    Admin
                                </Link>
                            )}
                        </>
                    )}
                </nav>

                {/* Right side actions */}
                <div className="flex flex-1 items-center justify-end space-x-2">
                    {/* Theme Toggle */}
                    <ThemeToggle />

                    {mounted ? (
                        session ? (
                            <>
                                {/* Desktop Actions */}
                                <div className="hidden items-center space-x-2 md:flex">
                                    <ViewNotificationButton />
                                </div>

                                {/* User Menu */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            className="relative h-8 w-8 rounded-full"
                                        >
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback className="text-xs">
                                                    {getUserInitials(
                                                        session.user.email,
                                                    )}
                                                </AvatarFallback>
                                            </Avatar>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        className="w-56"
                                        align="end"
                                        forceMount
                                    >
                                        <div className="flex items-center justify-start gap-2 p-2">
                                            <div className="flex flex-col space-y-1 leading-none">
                                                <p className="text-foreground text-sm font-medium">
                                                    {session.user.name ||
                                                        'User'}
                                                </p>
                                                <p className="text-muted-foreground text-xs">
                                                    {session.user.email}
                                                </p>
                                            </div>
                                        </div>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="cursor-pointer md:hidden"
                                            onClick={() => {
                                                /* Handle profile */
                                            }}
                                        >
                                            <User className="mr-2 h-4 w-4" />
                                            <span>Profile</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="md:hidden" />
                                        <DropdownMenuItem
                                            className="cursor-pointer text-red-600 focus:text-red-600"
                                            onClick={handleSignOut}
                                        >
                                            <LogOut className="mr-2 h-4 w-4" />
                                            <span>Sign out</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                        ) : (
                            <Button asChild size="sm">
                                <Link href="/auth/login">Sign In</Link>
                            </Button>
                        )
                    ) : (
                        <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />
                    )}

                    {/* Mobile menu button */}
                    <Button
                        variant="ghost"
                        className="h-8 w-8 p-0 md:hidden"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        <span className="sr-only">Open main menu</span>
                        {mobileMenuOpen ? (
                            <X className="h-4 w-4" />
                        ) : (
                            <Menu className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileMenuOpen && (
                <div className="md:hidden">
                    <div className="border-border bg-background space-y-2 border-t px-4 py-4">
                        {mounted && session && (
                            <>
                                <Link
                                    href="/posts"
                                    className={getMobileNavLinkClass('/posts')}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Posts
                                </Link>
                                <Link
                                    href="/communities"
                                    className={getMobileNavLinkClass(
                                        '/communities',
                                    )}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <Globe className="mr-2 h-4 w-4" />
                                    Communities
                                </Link>
                                {session?.user?.role === 'admin' && (
                                    <Link
                                        href="/admin"
                                        className={getMobileNavLinkClass(
                                            '/admin',
                                        )}
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <Settings className="mr-2 h-4 w-4" />
                                        Admin Dashboard
                                    </Link>
                                )}

                                {/* Mobile Actions */}
                                <div className="flex items-center space-x-2 px-4 py-2">
                                    <ViewNotificationButton />
                                </div>
                            </>
                        )}

                        {!session && mounted && (
                            <div className="px-4 py-2">
                                <Button asChild className="w-full">
                                    <Link
                                        href="/auth/login"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        Sign In
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
