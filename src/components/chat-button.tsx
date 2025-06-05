'use client';

import React from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChat } from '@/providers/chat-provider';
import { Badge } from '@/components/ui/badge';

export function ChatButton() {
    const { toggleChat, unreadCount } = useChat();

    return (
        <Button
            variant="ghost"
            size="sm"
            className="relative"
            onClick={toggleChat}
            aria-label="Chat"
        >
            <MessageSquare className="h-5 w-5" />
            {unreadCount > 0 && (
                <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
                >
                    {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
            )}
        </Button>
    );
}
