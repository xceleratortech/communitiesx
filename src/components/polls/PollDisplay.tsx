'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Check, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { Poll, PollResult } from '@/types/poll';

interface PollDisplayProps {
    poll: Poll;
    results?: PollResult[];
    userVotes?: number[];
    canVote: boolean;
    hasUserVoted: boolean;
    totalVotes: number;
    onVote: (optionIds: number[]) => void;
    onJoinCommunity?: () => void;
    isVoting?: boolean;
}

export function PollDisplay({
    poll,
    results,
    userVotes = [],
    canVote,
    hasUserVoted,
    totalVotes,
    onVote,
    onJoinCommunity,
    isVoting = false,
}: PollDisplayProps) {
    const [selectedOptions, setSelectedOptions] = useState<number[]>([]);

    const isExpired = poll.expiresAt && new Date(poll.expiresAt) < new Date();
    const isClosed = poll.isClosed || isExpired;
    const showResults = isClosed || hasUserVoted;

    const handleOptionSelect = (optionId: number) => {
        if (poll.pollType === 'single') {
            setSelectedOptions([optionId]);
        } else {
            // For multiple choice with radio buttons, toggle the option
            setSelectedOptions((prev) => {
                if (prev.includes(optionId)) {
                    // Remove the option if already selected
                    return prev.filter((id) => id !== optionId);
                } else {
                    // Add the option if not selected
                    return [...prev, optionId];
                }
            });
        }
    };

    const handleVote = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent default button behavior
        e.stopPropagation(); // Stop event from bubbling up

        if (selectedOptions.length > 0) {
            onVote(selectedOptions);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const getPollStatus = () => {
        if (poll.isClosed) return 'Closed';
        if (isExpired) return 'Expired';
        return 'Open';
    };

    const getTimeRemaining = () => {
        if (!poll.expiresAt || isExpired) return null;
        return formatDistanceToNow(new Date(poll.expiresAt), {
            addSuffix: true,
        });
    };

    const renderVotingInterface = () => {
        if (!canVote) {
            return (
                <div className="space-y-3">
                    <div className="py-4 text-center">
                        <p className="text-muted-foreground mb-2">
                            You need to be a member of this community to vote on
                            polls.
                        </p>
                        {onJoinCommunity && (
                            <Button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onJoinCommunity();
                                }}
                                onMouseDown={handleMouseDown}
                                onMouseUp={handleMouseUp}
                                size="sm"
                            >
                                Join Community
                            </Button>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-3">
                <RadioGroup
                    value={
                        poll.pollType === 'single'
                            ? selectedOptions[0]?.toString()
                            : undefined
                    }
                    onValueChange={(value) =>
                        handleOptionSelect(parseInt(value))
                    }
                >
                    {poll.options?.map((option) => (
                        <div
                            key={option.id}
                            className="flex items-center space-x-3"
                        >
                            <RadioGroupItem
                                value={option.id.toString()}
                                id={option.id.toString()}
                                checked={selectedOptions.includes(option.id)}
                                className="h-4 w-4"
                            />
                            <Label
                                htmlFor={option.id.toString()}
                                className="flex-1 cursor-pointer font-medium text-black"
                            >
                                {option.text}
                                {poll.pollType === 'multiple' &&
                                    selectedOptions.includes(option.id) && (
                                        <span className="ml-2 text-sm text-green-600">
                                            ✓
                                        </span>
                                    )}
                            </Label>
                        </div>
                    ))}
                </RadioGroup>
            </div>
        );
    };

    const renderResults = () => {
        if (!results) return null;

        return (
            <div className="space-y-3">
                {results.map((result) => (
                    <div key={result.optionId} className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <span className="font-medium text-black">
                                    {result.optionText}
                                </span>
                                {result.isUserVoted && (
                                    <Check className="h-4 w-4 text-green-600" />
                                )}
                            </div>
                            <div className="text-sm text-gray-500">
                                {result.percentage}% ({result.voteCount} votes)
                            </div>
                        </div>
                        <Progress value={result.percentage} className="h-2" />
                    </div>
                ))}
            </div>
        );
    };

    return (
        <Card
            className="w-full border-0 bg-gray-50 shadow-sm"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
        >
            <CardContent className="p-6">
                <div className="space-y-6">
                    {/* Poll Question */}
                    <div className="text-center">
                        <h3 className="text-sm font-medium text-gray-600">
                            {poll.question}
                        </h3>
                    </div>

                    {/* Poll Options */}
                    {showResults ? renderResults() : renderVotingInterface()}

                    {/* Poll Footer */}
                    <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{getPollStatus()}</span>
                            {poll.expiresAt && !isExpired && (
                                <>
                                    <span>-</span>
                                    <span>{getTimeRemaining()}</span>
                                </>
                            )}
                            <span>|</span>
                            <span>{totalVotes} total votes</span>
                        </div>

                        {!showResults && canVote && (
                            <Button
                                onClick={handleVote}
                                onMouseDown={handleMouseDown}
                                onMouseUp={handleMouseUp}
                                disabled={
                                    selectedOptions.length === 0 || isVoting
                                }
                                className="rounded-full bg-black px-6 py-2 text-sm font-medium text-white hover:bg-gray-800"
                                type="button"
                            >
                                {isVoting ? 'Voting...' : 'Vote'}
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
