'use client';

import React, { useEffect, Suspense } from 'react';
import { useChat } from '@/providers/chat-provider';
import { X, Minus, Plus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

// Define types for the dynamically imported components
interface ChatMessageViewProps {
    threadId: number;
}

// Dynamically import components
// @ts-ignore - Module resolution will happen at runtime
const ChatThreadList = dynamic(() => import('./chat-thread-list'), {
    ssr: false,
    loading: () => (
        <div className="flex h-full w-full items-center justify-center">
            Loading conversations...
        </div>
    ),
});

// @ts-ignore - Module resolution will happen at runtime
const ChatMessageView = dynamic<ChatMessageViewProps>(
    () => import('./chat-message-view'),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-full w-full items-center justify-center">
                Loading messages...
            </div>
        ),
    },
);

// @ts-ignore - Module resolution will happen at runtime
const NewChatDialog = dynamic(() => import('./new-chat-dialog'), {
    ssr: false,
});

export function ChatContainer() {
    const {
        isOpen,
        closeChat,
        activeThreadId,
        setActiveThreadId,
        isMinimized,
        toggleMinimize,
        isNewChatOpen,
    } = useChat();

    // Close chat with Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                closeChat();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => {
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, closeChat]);

    if (!isOpen) return null;

    return (
        <div
            className={cn(
                'border-border bg-background fixed right-4 bottom-0 z-50 flex flex-col rounded-t-lg border shadow-lg transition-all duration-200',
                isMinimized ? 'h-12 w-80' : 'h-[500px] w-[350px] md:w-[650px]',
            )}
        >
            {/* Chat Header */}
            <div className="flex h-12 items-center justify-between border-b px-4">
                <div className="flex items-center">
                    {activeThreadId && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mr-2 h-8 w-8 p-0"
                            onClick={() => setActiveThreadId(null)}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    )}
                    <h3 className="text-sm font-medium">
                        {activeThreadId ? 'Chat' : 'Messages'}
                    </h3>
                </div>
                <div className="flex items-center space-x-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={toggleMinimize}
                    >
                        {isMinimized ? (
                            <Plus className="h-4 w-4" />
                        ) : (
                            <Minus className="h-4 w-4" />
                        )}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={closeChat}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Chat Content */}
            {!isMinimized && (
                <div className="flex h-[calc(100%-48px)] overflow-hidden">
                    <Suspense
                        fallback={
                            <div className="flex h-full w-full items-center justify-center">
                                Loading...
                            </div>
                        }
                    >
                        {!activeThreadId ? (
                            <ChatThreadList />
                        ) : (
                            <ChatMessageView threadId={activeThreadId} />
                        )}
                    </Suspense>
                </div>
            )}

            {/* New Chat Dialog */}
            {isNewChatOpen && <NewChatDialog />}
        </div>
    );
}
