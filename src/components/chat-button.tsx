'use client';

import React, { use, useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChat } from '@/providers/chat-provider';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

export function ChatButton() {
    const { toggleChat, unreadCount } = useChat();
    const router = useRouter();
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleChatClick = () => {
        if (isMobile) {
            // Navigate to chat page on mobile
            router.push('/chat');
        } else {
            // Open drawer on desktop
            toggleChat();
        }
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            className="relative"
            // onClick={toggleChat}
            onClick={handleChatClick}
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
