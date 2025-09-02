'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarIcon, ChevronDown, X, Clock } from 'lucide-react';
import {
    format,
    subDays,
    startOfDay,
    endOfDay,
    isAfter,
    isBefore,
} from 'date-fns';

export type DateFilterType = 'all' | 'today' | 'week' | 'month' | 'custom';

export interface DateFilterState {
    type: DateFilterType;
    startDate?: Date;
    endDate?: Date;
}

interface DateFilterProps {
    value: DateFilterState;
    onChange: (filter: DateFilterState) => void;
    disabled?: boolean;
}

export function DateFilter({
    value,
    onChange,
    disabled = false,
}: DateFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');

    // Initialize custom dates when switching to custom type
    useEffect(() => {
        if (value.type === 'custom' && value.startDate && value.endDate) {
            setCustomStartDate(format(value.startDate, 'yyyy-MM-dd'));
            setCustomEndDate(format(value.endDate, 'yyyy-MM-dd'));
        }
    }, [value.type, value.startDate, value.endDate]);

    const handleQuickFilter = (type: DateFilterType) => {
        let startDate: Date | undefined;
        let endDate: Date | undefined;

        switch (type) {
            case 'today':
                startDate = startOfDay(new Date());
                endDate = endOfDay(new Date());
                break;
            case 'week':
                startDate = startOfDay(subDays(new Date(), 7));
                endDate = endOfDay(new Date());
                break;
            case 'month':
                startDate = startOfDay(subDays(new Date(), 30));
                endDate = endOfDay(new Date());
                break;
            case 'all':
                startDate = undefined;
                endDate = undefined;
                break;
        }

        onChange({ type, startDate, endDate });
        setIsOpen(false);
    };

    const handleCustomDateChange = () => {
        if (customStartDate && customEndDate) {
            const start = new Date(customStartDate);
            const end = new Date(customEndDate);

            if (isAfter(start, end)) {
                // Swap dates if start is after end
                onChange({
                    type: 'custom',
                    startDate: end,
                    endDate: start,
                });
            } else {
                onChange({
                    type: 'custom',
                    startDate: start,
                    endDate: end,
                });
            }
        }
        setIsOpen(false);
    };

    const clearFilter = () => {
        onChange({ type: 'all' });
        setCustomStartDate('');
        setCustomEndDate('');
    };

    const getFilterLabel = () => {
        switch (value.type) {
            case 'today':
                return 'Today';
            case 'week':
                return 'Last Week';
            case 'month':
                return 'Last Month';
            case 'custom':
                if (value.startDate && value.endDate) {
                    return `${format(value.startDate, 'MMM d')} - ${format(value.endDate, 'MMM d')}`;
                }
                return 'Custom Range';
            default:
                return 'All Time';
        }
    };

    const isFilterActive = value.type !== 'all';

    return (
        <div className="space-y-2">
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        className="h-9 border-dashed bg-transparent"
                        disabled={disabled}
                    >
                        <Clock className="mr-2 h-4 w-4" />
                        {getFilterLabel()}
                        {isFilterActive && (
                            <Badge
                                variant="secondary"
                                className="ml-2 flex h-5 w-5 items-center justify-center"
                            >
                                <Clock className="h-3 w-3" />
                            </Badge>
                        )}
                        <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80" align="end">
                    {/* Quick Filters */}
                    <div className="p-2">
                        <Label className="text-muted-foreground text-xs font-medium">
                            Quick Filters
                        </Label>
                    </div>

                    <DropdownMenuItem onClick={() => handleQuickFilter('all')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        All Time
                        {value.type === 'all' && (
                            <Badge
                                variant="secondary"
                                className="ml-auto text-xs"
                            >
                                Active
                            </Badge>
                        )}
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onClick={() => handleQuickFilter('today')}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        Today
                        {value.type === 'today' && (
                            <Badge
                                variant="secondary"
                                className="ml-auto text-xs"
                            >
                                Active
                            </Badge>
                        )}
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => handleQuickFilter('week')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        Last Week
                        {value.type === 'week' && (
                            <Badge
                                variant="secondary"
                                className="ml-auto text-xs"
                            >
                                Active
                            </Badge>
                        )}
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onClick={() => handleQuickFilter('month')}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        Last Month
                        {value.type === 'month' && (
                            <Badge
                                variant="secondary"
                                className="ml-auto text-xs"
                            >
                                Active
                            </Badge>
                        )}
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {/* Custom Date Range */}
                    <div className="p-2">
                        <Label className="text-muted-foreground text-xs font-medium">
                            Custom Range
                        </Label>
                    </div>

                    <div className="space-y-2 p-2">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label htmlFor="start-date" className="text-xs">
                                    Start Date
                                </Label>
                                <Input
                                    id="start-date"
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) =>
                                        setCustomStartDate(e.target.value)
                                    }
                                    className="h-8 text-xs"
                                />
                            </div>
                            <div>
                                <Label htmlFor="end-date" className="text-xs">
                                    End Date
                                </Label>
                                <Input
                                    id="end-date"
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) =>
                                        setCustomEndDate(e.target.value)
                                    }
                                    className="h-8 text-xs"
                                />
                            </div>
                        </div>
                        <Button
                            size="sm"
                            onClick={handleCustomDateChange}
                            disabled={!customStartDate || !customEndDate}
                            className="w-full"
                        >
                            Apply Custom Range
                        </Button>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Active Filter Display */}
            {isFilterActive && (
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {getFilterLabel()}
                        <button
                            onClick={clearFilter}
                            className="ml-1 rounded-full p-0.5 hover:bg-gray-200"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                </div>
            )}
        </div>
    );
}
