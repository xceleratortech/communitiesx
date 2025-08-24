'use client';

import React, { useState } from 'react';
import { format, parse, isValid } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface MonthYearPickerProps {
    value: string | null;
    onChange: (value: string) => void;
    placeholder: string;
    disabled?: boolean;
}

export function MonthYearPicker({
    value,
    onChange,
    placeholder,
    disabled = false,
}: MonthYearPickerProps) {
    const [date, setDate] = useState<Date | undefined>(() => {
        if (value && value.trim()) {
            const parsed = parse(`${value}-01`, 'yyyy-MM-dd', new Date());
            return isValid(parsed) ? parsed : undefined;
        }
        return undefined;
    });

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 81 }, (_, i) => currentYear - i + 10);

    const handleSelect = (newDate: Date) => {
        setDate(newDate);
        onChange(format(newDate, 'yyyy-MM'));
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    className={cn(
                        'w-[130px] justify-start text-left font-normal',
                        !date && 'text-muted-foreground',
                        disabled && 'cursor-not-allowed opacity-50',
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date && isValid(date) ? (
                        format(date, 'MM/yyyy')
                    ) : (
                        <span>{placeholder}</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <div className="flex flex-col space-y-2 p-2">
                    <div className="flex items-center justify-between border-b px-3 py-2">
                        <p className="text-sm font-medium">Select Date</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-2">
                        <div>
                            <Label className="mb-1 block text-xs">Month</Label>
                            <Select
                                value={date ? date.getMonth().toString() : ''}
                                onValueChange={(value) => {
                                    const newMonth = Number.parseInt(value);
                                    if (date) {
                                        const newDate = new Date(date);
                                        newDate.setMonth(newMonth);
                                        handleSelect(newDate);
                                    } else {
                                        const newDate = new Date();
                                        newDate.setMonth(newMonth);
                                        handleSelect(newDate);
                                    }
                                }}
                            >
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Month" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">January</SelectItem>
                                    <SelectItem value="1">February</SelectItem>
                                    <SelectItem value="2">March</SelectItem>
                                    <SelectItem value="3">April</SelectItem>
                                    <SelectItem value="4">May</SelectItem>
                                    <SelectItem value="5">June</SelectItem>
                                    <SelectItem value="6">July</SelectItem>
                                    <SelectItem value="7">August</SelectItem>
                                    <SelectItem value="8">September</SelectItem>
                                    <SelectItem value="9">October</SelectItem>
                                    <SelectItem value="10">November</SelectItem>
                                    <SelectItem value="11">December</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="mb-1 block text-xs">Year</Label>
                            <Select
                                value={
                                    date ? date.getFullYear().toString() : ''
                                }
                                onValueChange={(value) => {
                                    const newYear = Number.parseInt(value);
                                    if (date) {
                                        const newDate = new Date(date);
                                        newDate.setFullYear(newYear);
                                        handleSelect(newDate);
                                    } else {
                                        const newDate = new Date();
                                        newDate.setFullYear(newYear);
                                        handleSelect(newDate);
                                    }
                                }}
                            >
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Year" />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {years.map((year) => (
                                        <SelectItem
                                            key={year}
                                            value={year.toString()}
                                        >
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
