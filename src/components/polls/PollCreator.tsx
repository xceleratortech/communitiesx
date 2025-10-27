'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PollCreationState, CreatePollData } from '@/types/poll';

interface PollCreatorProps {
    onPollChange: (poll: CreatePollData | null) => void;
    initialPoll?: PollCreationState;
}

export function PollCreator({ onPollChange, initialPoll }: PollCreatorProps) {
    const [pollState, setPollState] = useState<PollCreationState>(
        initialPoll || {
            isCreating: false,
            question: '',
            pollType: 'single',
            options: ['', ''],
            expiresAt: null,
            hasExpiration: false,
            expirationValue: 24,
            expirationUnit: 'hours',
        },
    );

    const handleQuestionChange = (question: string) => {
        const newState = { ...pollState, question };
        setPollState(newState);
        updatePollData(newState);
    };

    const handlePollTypeChange = (pollType: 'single' | 'multiple') => {
        const newState = { ...pollState, pollType };
        setPollState(newState);
        updatePollData(newState);
    };

    const handleOptionChange = (index: number, text: string) => {
        const newOptions = [...pollState.options];
        newOptions[index] = text;
        const newState = { ...pollState, options: newOptions };
        setPollState(newState);
        updatePollData(newState);
    };

    const addOption = () => {
        if (pollState.options.length < 10) {
            const newOptions = [...pollState.options, ''];
            const newState = { ...pollState, options: newOptions };
            setPollState(newState);
            updatePollData(newState);
        }
    };

    const removeOption = (index: number) => {
        if (pollState.options.length > 2) {
            const newOptions = pollState.options.filter((_, i) => i !== index);
            const newState = { ...pollState, options: newOptions };
            setPollState(newState);
            updatePollData(newState);
        }
    };

    const handleExpirationToggle = (hasExpiration: boolean) => {
        const newState = {
            ...pollState,
            hasExpiration,
            expiresAt: hasExpiration
                ? calculateExpirationDate(
                      pollState.expirationValue,
                      pollState.expirationUnit,
                  )
                : null,
        };
        setPollState(newState);
        updatePollData(newState);
    };

    const calculateExpirationDate = (
        value: number,
        unit: 'hours' | 'days',
    ): Date => {
        const now = new Date();
        const milliseconds =
            unit === 'hours'
                ? value * 60 * 60 * 1000
                : value * 24 * 60 * 60 * 1000;
        return new Date(now.getTime() + milliseconds);
    };

    const handleExpirationValueChange = (value: number) => {
        const newState = {
            ...pollState,
            expirationValue: value,
            expiresAt: pollState.hasExpiration
                ? calculateExpirationDate(value, pollState.expirationUnit)
                : null,
        };
        setPollState(newState);
        updatePollData(newState);
    };

    const handleExpirationUnitChange = (unit: 'hours' | 'days') => {
        const newState = {
            ...pollState,
            expirationUnit: unit,
            expiresAt: pollState.hasExpiration
                ? calculateExpirationDate(pollState.expirationValue, unit)
                : null,
        };
        setPollState(newState);
        updatePollData(newState);
    };

    const updatePollData = (state: PollCreationState) => {
        if (
            state.isCreating &&
            state.question.trim() &&
            state.options.every((opt) => opt.trim())
        ) {
            const pollData: CreatePollData = {
                question: state.question.trim(),
                pollType: state.pollType,
                options: state.options
                    .map((opt) => opt.trim())
                    .filter((opt) => opt),
                expiresAt: state.hasExpiration
                    ? state.expiresAt || undefined
                    : undefined,
            };
            onPollChange(pollData);
        } else {
            onPollChange(null);
        }
    };

    const togglePollCreation = () => {
        const newState = { ...pollState, isCreating: !pollState.isCreating };
        setPollState(newState);
        if (!newState.isCreating) {
            onPollChange(null);
        }
    };

    const isValidPoll =
        pollState.question.trim() &&
        pollState.options.filter((opt) => opt.trim()).length >= 2;

    return (
        <Card className="w-full">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Poll</CardTitle>
                    <Button
                        type="button"
                        variant={
                            pollState.isCreating ? 'destructive' : 'outline'
                        }
                        size="sm"
                        onClick={togglePollCreation}
                    >
                        {pollState.isCreating ? 'Remove Poll' : 'Add Poll'}
                    </Button>
                </div>
            </CardHeader>

            {pollState.isCreating && (
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="poll-question">Poll Question</Label>
                        <Input
                            id="poll-question"
                            placeholder="What would you like to ask?"
                            value={pollState.question}
                            onChange={(e) =>
                                handleQuestionChange(e.target.value)
                            }
                            className="mt-1"
                        />
                    </div>

                    <div>
                        <Label>Poll Type</Label>
                        <RadioGroup
                            value={pollState.pollType}
                            onValueChange={handlePollTypeChange}
                            className="mt-2"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="single" id="single" />
                                <Label htmlFor="single">Single Choice</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                    value="multiple"
                                    id="multiple"
                                />
                                <Label htmlFor="multiple">
                                    Multiple Choice
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div>
                        <Label>Options</Label>
                        <div className="mt-2 space-y-2">
                            {pollState.options.map((option, index) => (
                                <div
                                    key={index}
                                    className="flex items-center space-x-2"
                                >
                                    <Input
                                        placeholder={`Option ${index + 1}`}
                                        value={option}
                                        onChange={(e) =>
                                            handleOptionChange(
                                                index,
                                                e.target.value,
                                            )
                                        }
                                        className="flex-1"
                                    />
                                    {pollState.options.length > 2 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeOption(index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                            {pollState.options.length < 10 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addOption}
                                    className="w-full"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Option
                                </Button>
                            )}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="has-expiration"
                                checked={pollState.hasExpiration}
                                onCheckedChange={handleExpirationToggle}
                            />
                            <Label htmlFor="has-expiration">
                                Set expiration time
                            </Label>
                        </div>

                        {pollState.hasExpiration && (
                            <div className="mt-2 space-y-3">
                                <div className="flex items-center space-x-2">
                                    <Input
                                        type="number"
                                        min="1"
                                        max={
                                            pollState.expirationUnit === 'hours'
                                                ? 168
                                                : 30
                                        } // Max 1 week in hours, 30 days
                                        value={pollState.expirationValue}
                                        onChange={(e) =>
                                            handleExpirationValueChange(
                                                parseInt(e.target.value) || 1,
                                            )
                                        }
                                        className="w-20"
                                    />
                                    <Select
                                        value={pollState.expirationUnit}
                                        onValueChange={
                                            handleExpirationUnitChange
                                        }
                                    >
                                        <SelectTrigger className="w-24">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="hours">
                                                Hours
                                            </SelectItem>
                                            <SelectItem value="days">
                                                Days
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="text-muted-foreground text-sm">
                                    Poll will expire on{' '}
                                    <span className="font-medium">
                                        {pollState.expiresAt?.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {!isValidPoll && (
                        <div className="text-muted-foreground text-sm">
                            Please provide a question and at least 2 options to
                            create a poll.
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
