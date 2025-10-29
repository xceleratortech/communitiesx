'use client';

import React, { useState, useEffect } from 'react';
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

    // Initialize/sync selectedOptions with userVotes when they change
    useEffect(() => {
        const normalized = Array.isArray(userVotes) ? userVotes : [];
        setSelectedOptions((prev) => {
            // Avoid state updates if arrays are equal (order-insensitive)
            if (prev.length === normalized.length) {
                const a = [...prev].sort((x, y) => x - y);
                const b = [...normalized].sort((x, y) => x - y);
                let same = true;
                for (let i = 0; i < a.length; i++) {
                    if (a[i] !== b[i]) {
                        same = false;
                        break;
                    }
                }
                if (same) return prev;
            }
            return normalized;
        });
    }, [userVotes]);

    const isExpired = poll.expiresAt && new Date(poll.expiresAt) < new Date();
    const isClosed = poll.isClosed || isExpired;
    // Show voting interface if poll is open, even if user has voted
    // Only show results-only view if poll is closed/expired
    const showResultsOnly = isClosed;
    const showVotingInterface = !isClosed && canVote;

    const handleOptionSelect = (optionId: number) => {
        if (poll.pollType === 'single') {
            // For single choice, allow toggling to deselect
            setSelectedOptions((prev) => {
                if (prev.includes(optionId)) {
                    // Deselect if already selected
                    return [];
                } else {
                    // Select the new option
                    return [optionId];
                }
            });
        } else {
            // For multiple choice, toggle the option
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

        // Allow voting with empty array (retract vote) or with selections
        onVote(selectedOptions);
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

        const resultsByOptionId = new Map(
            (results || []).map((r) => [r.optionId, r]),
        );

        if (poll.pollType === 'multiple') {
            return (
                <div className="space-y-3">
                    <RadioGroup value="" onValueChange={() => {}}>
                        {poll.options?.map((option) => {
                            const isSelected = selectedOptions.includes(
                                option.id,
                            );
                            const isUserVoted = userVotes?.includes(option.id);
                            const res = resultsByOptionId.get(option.id);
                            return (
                                <div key={option.id} className="space-y-1">
                                    <div className="flex items-center space-x-3">
                                        <RadioGroupItem
                                            value={option.id.toString()}
                                            id={option.id.toString()}
                                            checked={isSelected}
                                            className="h-4 w-4"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleOptionSelect(option.id);
                                            }}
                                        />
                                        <Label
                                            htmlFor={option.id.toString()}
                                            className="flex-1 cursor-pointer font-medium text-black"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleOptionSelect(option.id);
                                            }}
                                        >
                                            {option.text}
                                            {isUserVoted ? (
                                                <Check className="ml-2 inline h-4 w-4 text-green-600" />
                                            ) : (
                                                isSelected && (
                                                    <span className="ml-2 text-sm text-green-600">
                                                        ✓
                                                    </span>
                                                )
                                            )}
                                        </Label>
                                        {res && (
                                            <div className="text-sm text-gray-500">
                                                {res.percentage}% (
                                                {res.voteCount} votes)
                                            </div>
                                        )}
                                    </div>
                                    {res && (
                                        <Progress
                                            value={res.percentage}
                                            className="h-2"
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </RadioGroup>
                </div>
            );
        }

        // Single choice uses RadioGroup
        return (
            <div className="space-y-3">
                <RadioGroup
                    value={selectedOptions[0]?.toString()}
                    onValueChange={(value) =>
                        handleOptionSelect(parseInt(value))
                    }
                >
                    {poll.options?.map((option) => {
                        const isSelected = selectedOptions.includes(option.id);
                        const isUserVoted = userVotes?.includes(option.id);
                        const handleClick = (e: React.MouseEvent) => {
                            // For single choice, allow deselection by clicking the selected option again
                            if (isSelected) {
                                e.preventDefault();
                                e.stopPropagation();
                                handleOptionSelect(option.id);
                            }
                        };
                        const res = resultsByOptionId.get(option.id);
                        return (
                            <div key={option.id} className="space-y-1">
                                <div className="flex items-center space-x-3">
                                    <RadioGroupItem
                                        value={option.id.toString()}
                                        id={option.id.toString()}
                                        checked={isSelected}
                                        className="h-4 w-4"
                                        onClick={handleClick}
                                    />
                                    <Label
                                        htmlFor={option.id.toString()}
                                        className="flex-1 cursor-pointer font-medium text-black"
                                        onClick={handleClick}
                                    >
                                        {option.text}
                                        {isUserVoted && (
                                            <Check className="ml-2 inline h-4 w-4 text-green-600" />
                                        )}
                                    </Label>
                                    {res && (
                                        <div className="text-sm text-gray-500">
                                            {res.percentage}% ({res.voteCount}{' '}
                                            votes)
                                        </div>
                                    )}
                                </div>
                                {res && (
                                    <Progress
                                        value={res.percentage}
                                        className="h-2"
                                    />
                                )}
                            </div>
                        );
                    })}
                </RadioGroup>
            </div>
        );
    };

    const renderResults = () => {
        if (!results) return null;

        const userVotedIds = userVotes ?? [];
        const radioValue =
            poll.pollType === 'single' && userVotedIds.length > 0
                ? userVotedIds[0]?.toString()
                : undefined;

        return (
            <RadioGroup value={radioValue} className="space-y-3">
                {results.map((result) => (
                    <div key={result.optionId} className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <RadioGroupItem
                                    value={result.optionId.toString()}
                                    id={`result-${result.optionId}`}
                                    checked={userVotedIds.includes(
                                        result.optionId,
                                    )}
                                    disabled
                                    className="h-4 w-4"
                                />
                                <Label
                                    htmlFor={`result-${result.optionId}`}
                                    className="cursor-default font-medium text-black"
                                >
                                    {result.optionText}
                                </Label>
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
            </RadioGroup>
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
                    {showResultsOnly
                        ? renderResults()
                        : showVotingInterface
                          ? renderVotingInterface()
                          : renderResults()}

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

                        {showVotingInterface && (
                            <Button
                                onClick={handleVote}
                                onMouseDown={handleMouseDown}
                                onMouseUp={handleMouseUp}
                                disabled={
                                    isVoting ||
                                    (selectedOptions.length === 0 &&
                                        !hasUserVoted)
                                }
                                className="bg-black px-6 py-2 text-sm font-medium text-white hover:bg-gray-800"
                            >
                                {isVoting
                                    ? 'Voting...'
                                    : selectedOptions.length === 0
                                      ? hasUserVoted
                                          ? 'Retract Vote'
                                          : 'Vote'
                                      : hasUserVoted
                                        ? 'Update Vote'
                                        : 'Vote'}
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
