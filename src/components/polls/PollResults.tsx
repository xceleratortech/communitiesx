'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, Clock, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Poll, PollResult } from '@/types/poll';

interface PollResultsProps {
    poll: Poll;
    results: PollResult[];
    totalVotes: number;
    userVotes?: number[];
}

export function PollResults({
    poll,
    results,
    totalVotes,
    userVotes = [],
}: PollResultsProps) {
    const isExpired = poll.expiresAt && new Date(poll.expiresAt) < new Date();
    const isClosed = poll.isClosed || isExpired;

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

    // Sort results by vote count (highest first)
    const sortedResults = [...results].sort(
        (a, b) => b.voteCount - a.voteCount,
    );

    return (
        <Card className="w-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">{poll.question}</CardTitle>
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Badge variant={isClosed ? 'secondary' : 'default'}>
                        {getPollStatus()}
                    </Badge>
                    {poll.expiresAt && !isExpired && (
                        <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{getTimeRemaining()}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{totalVotes} votes</span>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {sortedResults.map((result, index) => (
                    <div key={result.optionId} className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium">
                                    {result.optionText}
                                </span>
                                {result.isUserVoted && (
                                    <Check className="h-4 w-4 text-green-600" />
                                )}
                                {index === 0 && result.voteCount > 0 && (
                                    <Badge
                                        variant="outline"
                                        className="text-xs"
                                    >
                                        Most Popular
                                    </Badge>
                                )}
                            </div>
                            <div className="text-muted-foreground text-sm">
                                {result.percentage}% ({result.voteCount} votes)
                            </div>
                        </div>
                        <Progress value={result.percentage} className="h-2" />
                    </div>
                ))}

                <div className="text-muted-foreground border-t pt-2 text-center text-sm">
                    {totalVotes} total votes
                </div>
            </CardContent>
        </Card>
    );
}
