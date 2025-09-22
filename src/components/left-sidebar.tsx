'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { useSession, signOut } from '@/server/auth/client';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
    Home,
    Users,
    Globe,
    Bookmark,
    Bell,
    Plus,
    User,
    LogOut,
    Building,
    Settings,
} from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePermission } from '@/hooks/use-permission';
import { trpc } from '@/providers/trpc-provider';
import { cn } from '@/lib/utils';
import { CreatePostDialog } from '@/components/create-post-dialog';

export function LeftSidebar() {
    const { data: session } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const { appRole, orgRole } = usePermission();
    const isAppAdmin = appRole?.includes('admin');
    const isOrgAdmin = orgRole?.includes('admin');

    const { data: userOrgs } =
        trpc.organizations.getOrganizationByUserId.useQuery(
            { userId: session?.user?.id || '' },
            { enabled: !!session?.user?.id && isOrgAdmin },
        );

    useEffect(() => {
        setMounted(true);
    }, []);

    // Hide sidebar on auth pages
    if (pathname?.startsWith('/auth/')) {
        return null;
    }

    const handleSignOut = async () => {
        setPopoverOpen(false);
        await signOut();
        router.push('/auth/login');
    };

    const isActive = (path: string) => {
        if (!pathname) return false;
        return pathname.startsWith(path);
    };

    const getNavLinkClass = (path: string) => {
        const baseClass =
            'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors';
        const activeClass = 'bg-accent text-accent-foreground';
        const inactiveClass =
            'text-muted-foreground hover:bg-accent hover:text-accent-foreground';

        return cn(baseClass, isActive(path) ? activeClass : inactiveClass);
    };

    const getUserInitials = (email: string) => {
        return email.split('@')[0].charAt(0).toUpperCase();
    };

    if (!mounted) {
        return null;
    }

    if (!session) {
        return (
            <div className="bg-background flex h-screen w-64 flex-col border-r">
                <div className="flex h-16 items-center px-4">
                    <Link href="/" className="flex items-center">
                        <span className="text-xl font-bold">CommunityX</span>
                    </Link>
                </div>
                <div className="flex-1 px-4 py-4">
                    <div className="space-y-2">
                        <Button asChild className="w-full">
                            <Link href="/auth/login">Sign In</Link>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-background flex h-screen w-64 flex-col border-r">
            {/* Logo */}
            <div className="flex h-16 items-center px-4">
                <Link href="/posts" className="flex items-center">
                    <span className="text-xl font-bold">CommunityX</span>
                </Link>
            </div>

            {/* Navigation */}
            <div className="flex-1 px-4 py-4">
                <nav className="space-y-2">
                    {/* My Feed */}
                    <div>
                        <Link
                            href="/posts"
                            className={getNavLinkClass('/posts')}
                        >
                            <Home className="mr-3 h-5 w-5" />
                            My Feed
                        </Link>
                    </div>

                    {/* My Communities */}
                    <Link
                        href="/communities"
                        className={getNavLinkClass('/communities')}
                    >
                        <Users className="mr-3 h-5 w-5" />
                        My Communities
                    </Link>

                    {/* Explore Communities */}
                    <Link
                        href="/communities/explore"
                        className={getNavLinkClass('/communities/explore')}
                    >
                        <Globe className="mr-3 h-5 w-5" />
                        Explore Communities
                    </Link>

                    {/* Saved Items */}
                    <Link href="/saved" className={getNavLinkClass('/saved')}>
                        <Bookmark className="mr-3 h-5 w-5" />
                        Saved Items
                    </Link>

                    {/* Notifications */}
                    <Link
                        href="/notifications"
                        className={getNavLinkClass('/notifications')}
                    >
                        <Bell className="mr-3 h-5 w-5" />
                        Notifications
                    </Link>

                    {/* Create Post */}
                    <CreatePostDialog>
                        <Button
                            variant="outline"
                            className="w-full justify-start"
                        >
                            <Plus className="mr-3 h-5 w-5" />
                            Create Post
                        </Button>
                    </CreatePostDialog>
                </nav>
            </div>

            {/* Bottom section */}
            <div className="mb-4 border-t p-4">
                <div className="space-y-2">
                    {/* Theme Toggle */}
                    <div className="flex items-center justify-between rounded-md px-3 py-2">
                        <span className="text-muted-foreground text-sm">
                            Theme
                        </span>
                        <ThemeToggle variant="toggle" />
                    </div>

                    {/* User Profile */}
                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                className="w-full justify-start p-2"
                            >
                                <Avatar className="mr-3 h-8 w-8">
                                    <AvatarImage
                                        src={session.user?.image || ''}
                                        alt={session.user?.email || ''}
                                    />
                                    <AvatarFallback>
                                        {getUserInitials(
                                            session.user?.email || '',
                                        )}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col items-start">
                                    <span className="text-sm font-medium">
                                        {session.user?.name ||
                                            session.user?.email?.split('@')[0]}
                                    </span>
                                    <span className="text-muted-foreground text-xs">
                                        {session.user?.email}
                                    </span>
                                </div>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56" align="end">
                            <div className="grid gap-2">
                                <Link
                                    href="/profile"
                                    className="hover:bg-accent flex items-center space-x-2 rounded-md p-2 text-sm"
                                    onClick={() => setPopoverOpen(false)}
                                >
                                    <User className="h-4 w-4" />
                                    <span>My Profile</span>
                                </Link>

                                <Link
                                    href="/organization"
                                    className="hover:bg-accent flex items-center space-x-2 rounded-md p-2 text-sm"
                                    onClick={() => setPopoverOpen(false)}
                                >
                                    <Building className="h-4 w-4" />
                                    <span>My Organization</span>
                                </Link>

                                {isAppAdmin && (
                                    <Link
                                        href="/admin"
                                        className="hover:bg-accent flex items-center space-x-2 rounded-md p-2 text-sm"
                                        onClick={() => setPopoverOpen(false)}
                                    >
                                        <Settings className="h-4 w-4" />
                                        <span>Manage App</span>
                                    </Link>
                                )}

                                {isOrgAdmin &&
                                    userOrgs &&
                                    userOrgs.length > 0 && (
                                        <Link
                                            href={`/organization/${userOrgs[0].slug}`}
                                            className="hover:bg-accent flex items-center space-x-2 rounded-md p-2 text-sm"
                                            onClick={() =>
                                                setPopoverOpen(false)
                                            }
                                        >
                                            <Settings className="h-4 w-4" />
                                            <span>Manage Org</span>
                                        </Link>
                                    )}

                                <button
                                    onClick={handleSignOut}
                                    className="hover:bg-accent flex items-center space-x-2 rounded-md p-2 text-sm"
                                >
                                    <LogOut className="h-4 w-4" />
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
        </div>
    );
}
