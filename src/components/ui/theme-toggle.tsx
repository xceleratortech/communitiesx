'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Laptop } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    // Only show the theme toggle after hydration to avoid hydration mismatch
    React.useEffect(() => {
        setMounted(true);
    }, []);

    // Use a simpler approach to avoid hydration issues
    // Don't render the theme-specific content until after hydration
    const renderThemeIcon = () => {
        if (!mounted) return <div className="h-5 w-5" aria-hidden="true" />;

        if (resolvedTheme === 'dark') {
            return <Moon className="h-5 w-5" />;
        }

        return <Sun className="h-5 w-5" />;
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-md"
                >
                    {renderThemeIcon()}
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            {mounted && (
                <DropdownMenuContent align="end">
                    <DropdownMenuItem
                        onClick={() => setTheme('light')}
                        className="flex items-center gap-2"
                    >
                        <Sun className="h-4 w-4" />
                        <span>Light</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => setTheme('dark')}
                        className="flex items-center gap-2"
                    >
                        <Moon className="h-4 w-4" />
                        <span>Dark</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => setTheme('system')}
                        className="flex items-center gap-2"
                    >
                        <Laptop className="h-4 w-4" />
                        <span>System</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            )}
        </DropdownMenu>
    );
}
