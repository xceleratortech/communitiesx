'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { useSession, signOut } from '@/server/auth/client';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Settings,
    User,
    Building,
    LogOut,
    Menu,
    Home,
    Users,
    Globe,
    Bookmark,
    Bell,
    Plus,
} from 'lucide-react';
import { usePermission } from '@/hooks/use-permission';
import { trpc } from '@/providers/trpc-provider';
import { CreatePostDialog } from '@/components/create-post-dialog';

export function Topbar() {
    const { data: session } = useSession();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [navOpen, setNavOpen] = useState(false);
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

    const handleSignOut = async () => {
        setPopoverOpen(false);
        await signOut();
        router.push('/auth/login');
    };

    const getUserInitials = (email: string) => {
        return email.split('@')[0].charAt(0).toUpperCase();
    };

    if (!mounted) return null;

    return (
        <div className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 w-full border-b backdrop-blur md:hidden">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-2">
                    <Popover open={navOpen} onOpenChange={setNavOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                className="p-2"
                                aria-label="Open navigation"
                            >
                                <Menu className="h-5 w-5" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2" align="start">
                            <nav className="grid gap-1">
                                <Link
                                    href="/posts"
                                    className="hover:bg-accent flex items-center rounded-md p-2 text-sm"
                                    onClick={() => setNavOpen(false)}
                                >
                                    <Home className="mr-2 h-4 w-4" /> My Feed
                                </Link>
                                <Link
                                    href="/communities"
                                    className="hover:bg-accent flex items-center rounded-md p-2 text-sm"
                                    onClick={() => setNavOpen(false)}
                                >
                                    <Users className="mr-2 h-4 w-4" /> My
                                    Communities
                                </Link>
                                <Link
                                    href="/communities/explore"
                                    className="hover:bg-accent flex items-center rounded-md p-2 text-sm"
                                    onClick={() => setNavOpen(false)}
                                >
                                    <Globe className="mr-2 h-4 w-4" /> Explore
                                    Communities
                                </Link>
                                <Link
                                    href="/saved"
                                    className="hover:bg-accent flex items-center rounded-md p-2 text-sm"
                                    onClick={() => setNavOpen(false)}
                                >
                                    <Bookmark className="mr-2 h-4 w-4" /> Saved
                                    Items
                                </Link>
                                <Link
                                    href="/notifications"
                                    className="hover:bg-accent flex items-center rounded-md p-2 text-sm"
                                    onClick={() => setNavOpen(false)}
                                >
                                    <Bell className="mr-2 h-4 w-4" />{' '}
                                    Notifications
                                </Link>
                                <CreatePostDialog>
                                    <Button
                                        variant="outline"
                                        className="mt-1 w-full justify-start"
                                    >
                                        <Plus className="mr-2 h-4 w-4" /> Create
                                        Post
                                    </Button>
                                </CreatePostDialog>
                            </nav>
                        </PopoverContent>
                    </Popover>
                    <Link href="/posts" className="text-lg font-semibold">
                        CommunityX
                    </Link>
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggle variant="toggle" />
                    {session ? (
                        <Popover
                            open={popoverOpen}
                            onOpenChange={setPopoverOpen}
                        >
                            <PopoverTrigger asChild>
                                <Button variant="ghost" className="p-1">
                                    <Avatar className="h-8 w-8">
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
                                            onClick={() =>
                                                setPopoverOpen(false)
                                            }
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
                    ) : (
                        <Button asChild>
                            <Link href="/auth/login">Sign In</Link>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
