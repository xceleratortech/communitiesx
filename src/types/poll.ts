export type PollType = 'single' | 'multiple';

export interface PollOption {
    id: number;
    pollId: number;
    text: string;
    orderIndex: number;
    createdAt: string;
}

export interface Poll {
    id: number;
    postId: number;
    question: string;
    pollType: PollType;
    expiresAt: string | null;
    isClosed: boolean;
    createdAt: string;
    updatedAt: string;
    options?: PollOption[];
}

export interface PollVote {
    id: number;
    pollId: number;
    pollOptionId: number;
    userId: string;
    createdAt: string;
}

export interface PollResult {
    optionId: number;
    optionText: string;
    voteCount: number;
    percentage: number;
    isUserVoted: boolean;
}

export interface PollWithResults extends Poll {
    results?: PollResult[];
    userVotes?: PollVote[];
    totalVotes: number;
    canVote: boolean;
    hasUserVoted: boolean;
}

export interface CreatePollData {
    question: string;
    pollType: PollType;
    options: string[];
    expiresAt?: Date;
}

export interface PollCreationState {
    isCreating: boolean;
    question: string;
    pollType: PollType;
    options: string[];
    expiresAt: Date | null;
    hasExpiration: boolean;
    expirationValue: number;
    expirationUnit: 'hours' | 'days';
}
