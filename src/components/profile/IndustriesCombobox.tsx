'use client';

import React, { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

// Industries list
const industries = [
    'Banking',
    'Investment Firms',
    'Legal Services',
    'Public Sector',
    'Life Sciences',
    'Information Technology',
    'Healthcare',
    'Manufacturing',
    'Retail',
    'Hospitality',
    'Education',
    'Government',
];

interface IndustriesComboboxProps {
    value: string[];
    onChange: (value: string[]) => void;
}

export function IndustriesCombobox({
    value,
    onChange,
}: IndustriesComboboxProps) {
    const [open, setOpen] = useState(false);
    const [customIndustry, setCustomIndustry] = useState('');

    const lowerIndustries = industries.map((i) => i.toLowerCase());
    const lowerSelected = value.map((i) => i.toLowerCase());
    const customTrimmed = customIndustry.trim();
    const customExists =
        !!customTrimmed &&
        !lowerIndustries.includes(customTrimmed.toLowerCase()) &&
        !lowerSelected.includes(customTrimmed.toLowerCase());

    const handleAddCustomIndustry = () => {
        if (customExists) {
            onChange([...value, customTrimmed]);
            setCustomIndustry('');
        }
    };

    const handleRemoveIndustry = (industryToRemove: string) => {
        onChange(value.filter((industry) => industry !== industryToRemove));
    };

    const handleToggleIndustry = (industry: string) => {
        if (value.includes(industry)) {
            handleRemoveIndustry(industry);
        } else {
            onChange([...value, industry]);
        }
    };

    // Filter industries by search
    const filteredIndustries = industries.filter((industry) =>
        industry.toLowerCase().includes(customIndustry.toLowerCase()),
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={open}
                    className="bg-background focus:ring-ring flex h-9 min-h-[36px] cursor-pointer flex-wrap items-center gap-1 rounded-md border px-3 focus:ring-2 focus:outline-none"
                    onClick={() => setOpen(!open)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') setOpen(!open);
                    }}
                >
                    {value.length === 0 && (
                        <span className="text-muted-foreground">
                            Select industries
                        </span>
                    )}
                    {value.map((industry) => (
                        <Badge
                            key={industry}
                            variant="secondary"
                            className="flex items-center gap-1 px-2 py-0.5"
                        >
                            {industry}
                            <span
                                role="button"
                                tabIndex={0}
                                aria-label={`Remove ${industry}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveIndustry(industry);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.stopPropagation();
                                        handleRemoveIndustry(industry);
                                    }
                                }}
                                className="hover:text-destructive ml-1 cursor-pointer focus:outline-none"
                            >
                                <X className="h-3 w-3" />
                            </span>
                        </Badge>
                    ))}
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
                <Command>
                    <CommandInput
                        placeholder="Type to add industry"
                        className="h-9"
                        value={customIndustry}
                        onValueChange={setCustomIndustry}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && customExists) {
                                e.preventDefault();
                                handleAddCustomIndustry();
                            }
                        }}
                    />
                    <CommandList>
                        <CommandGroup>
                            {filteredIndustries.map((industry) => (
                                <CommandItem
                                    key={industry}
                                    value={industry}
                                    onSelect={() =>
                                        handleToggleIndustry(industry)
                                    }
                                    className={cn(
                                        'cursor-pointer rounded px-2 py-1',
                                        'text-black dark:text-white',
                                        'dark:hover:text-black dark:data-[selected=true]:text-black',
                                        'hover:text-black data-[selected=true]:text-black',
                                    )}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            value.includes(industry)
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                    />
                                    {industry}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        {customExists && (
                            <div className="mt-2 flex justify-center border-t p-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleAddCustomIndustry}
                                    className="w-full"
                                >
                                    Add &quot;{customTrimmed}&quot;
                                </Button>
                            </div>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
