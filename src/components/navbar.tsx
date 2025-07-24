'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { useSession, signOut } from '@/server/auth/client';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
    Globe,
    Menu,
    X,
    User,
    Settings,
    LogOut,
    Eye,
    Building,
} from 'lucide-react';
import { ChatButton } from '@/components/chat-button';
import { useChat } from '@/providers/chat-provider';
import { NotificationButton } from './NotificationButton';
import { ViewNotificationButton } from './ViewNotificationButton';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePermission } from '@/hooks/use-permission';
import { trpc } from '@/providers/trpc-provider';

export function Navbar() {
    const { data: session } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const { closeChat } = useChat();

    const { appRole, orgRole, userDetails } = usePermission();
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
        closeChat();
        setPopoverOpen(false);
        await signOut();
        router.push('/');
    };

    const isActive = (path: string) => {
        if (!pathname) return false;
        return pathname.startsWith(path);
    };

    const getNavLinkClass = (path: string) => {
        const baseClass = 'inline-flex items-center px-1 pt-1 border-b-2';
        const activeClass =
            'border-black text-black font-medium dark:border-white dark:text-white';
        const inactiveClass =
            'border-transparent text-gray-900 dark:text-gray-100 hover:border-gray-300 dark:hover:border-gray-700';

        return `${baseClass} ${isActive(path) ? activeClass : inactiveClass}`;
    };

    const getMobileNavLinkClass = (path: string) => {
        const baseClass = 'block px-3 py-2 rounded-md text-base font-medium';
        const activeClass =
            'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-white';
        const inactiveClass =
            'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800';

        return `${baseClass} ${isActive(path) ? activeClass : inactiveClass}`;
    };

    const getUserInitials = (email: string) => {
        return email.split('@')[0].charAt(0).toUpperCase();
    };

    return (
        <nav className="bg-white shadow-sm dark:bg-gray-800 dark:shadow-gray-800">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-14 justify-between">
                    <div className="flex">
                        <Link
                            href={mounted && session ? '/posts' : '/'}
                            className="flex items-center"
                        >
                            <span className="text-xl font-bold dark:text-white">
                                Community-
                                <span className="text-blue-600 dark:text-blue-400">
                                    X
                                </span>
                            </span>
                        </Link>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
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
                                        className={getNavLinkClass(
                                            '/communities',
                                        )}
                                    >
                                        Communities
                                    </Link>
                                    {isAppAdmin && (
                                        <Link
                                            href="/admin"
                                            className={getNavLinkClass(
                                                '/admin',
                                            )}
                                        >
                                            Manage App
                                        </Link>
                                    )}
                                    {isOrgAdmin &&
                                        userOrgs &&
                                        userOrgs.length > 0 && (
                                            <Link
                                                href={`/organization/${userOrgs[0].slug}`}
                                                className={getNavLinkClass(
                                                    `/organization/${userOrgs[0].slug}`,
                                                )}
                                            >
                                                Manage Org
                                            </Link>
                                        )}
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        {mounted && session && (
                            <>
                                <div className="flex sm:hidden">
                                    <ChatButton />
                                </div>
                                <div className="flex sm:hidden">
                                    <ViewNotificationButton />
                                </div>
                            </>
                        )}

                        {mounted ? (
                            session ? (
                                <>
                                    <div className="hidden items-center space-x-4 sm:flex">
                                        <ChatButton />
                                        <ViewNotificationButton />

                                        <Popover
                                            open={popoverOpen}
                                            onOpenChange={setPopoverOpen}
                                        >
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    className="relative h-8 w-8 rounded-full p-0"
                                                >
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage
                                                            src={
                                                                session.user
                                                                    ?.image ||
                                                                ''
                                                            }
                                                            alt={
                                                                session.user
                                                                    ?.email ||
                                                                ''
                                                            }
                                                        />
                                                        <AvatarFallback>
                                                            {getUserInitials(
                                                                session.user
                                                                    ?.email ||
                                                                    '',
                                                            )}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent
                                                className="w-56"
                                                align="end"
                                            >
                                                <div className="grid gap-4">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center space-x-2">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage
                                                                    src={
                                                                        session
                                                                            .user
                                                                            ?.image ||
                                                                        ''
                                                                    }
                                                                    alt={
                                                                        session
                                                                            .user
                                                                            ?.email ||
                                                                        ''
                                                                    }
                                                                />
                                                                <AvatarFallback>
                                                                    {getUserInitials(
                                                                        session
                                                                            .user
                                                                            ?.email ||
                                                                            '',
                                                                    )}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex flex-col space-y-1">
                                                                <p className="text-sm leading-none font-medium">
                                                                    {session
                                                                        .user
                                                                        ?.name ||
                                                                        session.user?.email?.split(
                                                                            '@',
                                                                        )[0]}
                                                                </p>
                                                                <p className="text-muted-foreground text-xs leading-none">
                                                                    {session
                                                                        .user
                                                                        ?.email &&
                                                                    session.user
                                                                        .email
                                                                        .length >
                                                                        28
                                                                        ? session.user.email.slice(
                                                                              0,
                                                                              25,
                                                                          ) +
                                                                          '...'
                                                                        : session
                                                                              .user
                                                                              ?.email}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <div className="grid gap-1 border-b border-gray-200 pb-2 sm:hidden dark:border-gray-700">
                                                            <Link
                                                                href="/posts"
                                                                className="flex items-center space-x-2 rounded-md p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                                                                onClick={() =>
                                                                    setPopoverOpen(
                                                                        false,
                                                                    )
                                                                }
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                                <span>
                                                                    Posts
                                                                </span>
                                                            </Link>
                                                            <Link
                                                                href="/communities"
                                                                className="flex items-center space-x-2 rounded-md p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                                                                onClick={() =>
                                                                    setPopoverOpen(
                                                                        false,
                                                                    )
                                                                }
                                                            >
                                                                <Globe className="h-4 w-4" />
                                                                <span>
                                                                    Communities
                                                                </span>
                                                            </Link>
                                                        </div>

                                                        <ThemeToggle variant="popover" />

                                                        <NotificationButton variant="popover" />

                                                        <Link
                                                            href="/organization"
                                                            className="flex items-center space-x-2 rounded-md p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                                                            onClick={() =>
                                                                setPopoverOpen(
                                                                    false,
                                                                )
                                                            }
                                                        >
                                                            <Building className="h-4 w-4" />
                                                            <span>
                                                                My Organization
                                                            </span>
                                                        </Link>

                                                        {isAppAdmin && (
                                                            <Link
                                                                href="/admin"
                                                                className="flex items-center space-x-2 rounded-md p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                                                                onClick={() =>
                                                                    setPopoverOpen(
                                                                        false,
                                                                    )
                                                                }
                                                            >
                                                                <Settings className="h-4 w-4" />
                                                                <span>
                                                                    Manage App
                                                                </span>
                                                            </Link>
                                                        )}
                                                        {isOrgAdmin &&
                                                            userOrgs &&
                                                            userOrgs.length >
                                                                0 && (
                                                                <Link
                                                                    href={`/organization/${userOrgs[0].slug}`}
                                                                    className="flex items-center space-x-2 rounded-md p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                                                                    onClick={() =>
                                                                        setPopoverOpen(
                                                                            false,
                                                                        )
                                                                    }
                                                                >
                                                                    <Settings className="h-4 w-4" />
                                                                    <span>
                                                                        Manage
                                                                        Org
                                                                    </span>
                                                                </Link>
                                                            )}
                                                        <button
                                                            onClick={
                                                                handleSignOut
                                                            }
                                                            className="flex items-center space-x-2 rounded-md p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                                                        >
                                                            <LogOut className="h-4 w-4" />
                                                            <span>
                                                                Sign Out
                                                            </span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    <div className="flex items-center sm:hidden">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    className="relative h-8 w-8 rounded-full p-0"
                                                >
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage
                                                            src={
                                                                session.user
                                                                    ?.image ||
                                                                ''
                                                            }
                                                            alt={
                                                                session.user
                                                                    ?.email ||
                                                                ''
                                                            }
                                                        />
                                                        <AvatarFallback>
                                                            {getUserInitials(
                                                                session.user
                                                                    ?.email ||
                                                                    '',
                                                            )}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent
                                                className="w-56"
                                                align="end"
                                            >
                                                <div className="grid gap-4">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center space-x-2">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage
                                                                    src={
                                                                        session
                                                                            .user
                                                                            ?.image ||
                                                                        ''
                                                                    }
                                                                    alt={
                                                                        session
                                                                            .user
                                                                            ?.email ||
                                                                        ''
                                                                    }
                                                                />
                                                                <AvatarFallback>
                                                                    {getUserInitials(
                                                                        session
                                                                            .user
                                                                            ?.email ||
                                                                            '',
                                                                    )}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex flex-col space-y-1">
                                                                <p className="text-sm leading-none font-medium">
                                                                    {session
                                                                        .user
                                                                        ?.name ||
                                                                        session.user?.email?.split(
                                                                            '@',
                                                                        )[0]}
                                                                </p>
                                                                <p className="text-muted-foreground text-xs leading-none">
                                                                    {
                                                                        session
                                                                            .user
                                                                            ?.email
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <div className="grid gap-1 border-b border-gray-200 pb-2 dark:border-gray-700">
                                                            <Link
                                                                href="/posts"
                                                                className="flex items-center space-x-2 rounded-md p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                                <span>
                                                                    Posts
                                                                </span>
                                                            </Link>
                                                            <Link
                                                                href="/communities"
                                                                className="flex items-center space-x-2 rounded-md p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                                                            >
                                                                <Globe className="h-4 w-4" />
                                                                <span>
                                                                    Communities
                                                                </span>
                                                            </Link>
                                                        </div>

                                                        <ThemeToggle variant="popover" />

                                                        <NotificationButton variant="popover" />

                                                        <Link
                                                            href="/organization"
                                                            className="flex items-center space-x-2 rounded-md p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                                                        >
                                                            <Building className="h-4 w-4" />
                                                            <span>
                                                                My Organization
                                                            </span>
                                                        </Link>

                                                        {isAppAdmin && (
                                                            <Link
                                                                href="/admin"
                                                                className="flex items-center space-x-2 rounded-md p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                                                            >
                                                                <Settings className="h-4 w-4" />
                                                                <span>
                                                                    Manage App
                                                                </span>
                                                            </Link>
                                                        )}
                                                        {isOrgAdmin &&
                                                            userOrgs &&
                                                            userOrgs.length >
                                                                0 && (
                                                                <Link
                                                                    href={`/organization/${userOrgs[0].slug}`}
                                                                    className="flex items-center space-x-2 rounded-md p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                                                                >
                                                                    <Settings className="h-4 w-4" />
                                                                    <span>
                                                                        Manage
                                                                        Org
                                                                    </span>
                                                                </Link>
                                                            )}
                                                        <button
                                                            onClick={
                                                                handleSignOut
                                                            }
                                                            className="flex items-center space-x-2 rounded-md p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                                                        >
                                                            <LogOut className="h-4 w-4" />
                                                            <span>
                                                                Sign Out
                                                            </span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center space-x-4">
                                    <ThemeToggle />
                                    <Button asChild className="hidden sm:flex">
                                        <Link
                                            href="/auth/login"
                                            className="text-sm"
                                        >
                                            Sign In
                                        </Link>
                                    </Button>
                                    <Button asChild className="flex sm:hidden">
                                        <Link
                                            href="/auth/login"
                                            className="text-sm"
                                        >
                                            Sign In
                                        </Link>
                                    </Button>
                                </div>
                            )
                        ) : (
                            <div className="hidden h-9 w-[100px] sm:block" />
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
