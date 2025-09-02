'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Clock, MessageSquare } from 'lucide-react';

export type SortOption = 'latest' | 'oldest' | 'most-commented';

interface SortSelectProps {
    value: SortOption;
    onValueChange: (value: SortOption) => void;
    className?: string;
}

const sortOptions = [
    {
        value: 'latest' as const,
        label: 'Latest posts first',
        icon: Clock,
    },
    {
        value: 'oldest' as const,
        label: 'Oldest posts first',
        icon: Clock,
    },
    {
        value: 'most-commented' as const,
        label: 'Most commented first',
        icon: MessageSquare,
    },
];

export function SortSelect({
    value,
    onValueChange,
    className,
}: SortSelectProps) {
    const [isOpen, setIsOpen] = useState(false);

    const currentOption = sortOptions.find((option) => option.value === value);

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={`min-w-[140px] justify-between ${className || ''}`}
                >
                    <div className="flex items-center gap-2">
                        {currentOption?.icon === MessageSquare ? (
                            <MessageSquare className="h-4 w-4" />
                        ) : (
                            <Clock className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">
                            {currentOption?.label}
                        </span>
                        <span className="sm:hidden">
                            {value === 'latest'
                                ? 'Latest'
                                : value === 'oldest'
                                  ? 'Oldest'
                                  : 'Most Commented'}
                        </span>
                    </div>
                    <ChevronDown className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                {sortOptions.map((option) => (
                    <DropdownMenuItem
                        key={option.value}
                        onClick={() => {
                            onValueChange(option.value);
                            setIsOpen(false);
                        }}
                        className="cursor-pointer"
                    >
                        <option.icon className="mr-2 h-4 w-4" />
                        {option.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
