'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Monitor, ChevronRight } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ThemeToggleProps {
    variant?: 'popover' | 'default' | 'toggle';
}

export function ThemeToggle({ variant = 'default' }: ThemeToggleProps) {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const getThemeIcon = () => {
        if (!mounted) return <div className="h-4 w-4" aria-hidden="true" />;
        switch (resolvedTheme) {
            case 'dark':
                return <Moon className="h-4 w-4" />;
            case 'light':
                return <Sun className="h-4 w-4" />;
            default:
                return <Monitor className="h-4 w-4" />;
        }
    };

    const getThemeLabel = () => {
        if (!mounted) return 'System';
        switch (resolvedTheme) {
            case 'light':
                return 'Light';
            case 'dark':
                return 'Dark';
            default:
                return 'System';
        }
    };

    const handleToggle = () => {
        if (!mounted) return;
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    };

    if (variant === 'toggle') {
        return (
            <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleToggle}
                aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
            >
                {getThemeIcon()}
            </Button>
        );
    }

    if (variant === 'popover') {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="flex w-full items-center justify-between space-x-2 rounded-md p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
                        <div className="flex items-center space-x-2">
                            {getThemeIcon()}
                            <span>Theme: {getThemeLabel()}</span>
                        </div>
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="right">
                    <DropdownMenuItem onClick={() => setTheme('light')}>
                        <Sun className="mr-2 h-4 w-4" />
                        Light
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme('dark')}>
                        <Moon className="mr-2 h-4 w-4" />
                        Dark
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme('system')}>
                        <Monitor className="mr-2 h-4 w-4" />
                        System
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                >
                    {getThemeIcon()}
                    <span>{getThemeLabel()}</span>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme('light')}>
                    <Sun className="mr-2 h-4 w-4" />
                    Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}>
                    <Moon className="mr-2 h-4 w-4" />
                    Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')}>
                    <Monitor className="mr-2 h-4 w-4" />
                    System
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
