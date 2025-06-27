// app/chat/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquare, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChat } from '@/providers/chat-provider';
import { useSession } from '@/server/auth/client';
import { trpc } from '@/providers/trpc-provider';

export default function ChatPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const { activeThreadId, setActiveThreadId, openNewChat } = useChat();
    const [searchQuery, setSearchQuery] = useState('');

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!session) {
            router.push('/auth/login');
        }
    }, [session, router]);

    // Redirect to home on desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                router.push('/');
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [router]);

    if (!session) {
        return null;
    }

    return (
        <div className="bg-background flex h-screen flex-col">
            {/* Header */}
            <div className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/60 border-b backdrop-blur">
                <div className="flex h-14 items-center justify-between px-4">
                    <div className="flex items-center space-x-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.back()}
                            className="h-8 w-8 p-0"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h1 className="text-lg font-semibold">Messages</h1>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={openNewChat}
                        className="h-8 w-8 p-0"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="border-border border-b p-4">
                <div className="relative">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                    <Input
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Chat Content */}
            <div className="flex-1 overflow-hidden">
                {activeThreadId ? (
                    <ChatThread threadId={activeThreadId} />
                ) : (
                    <ChatList searchQuery={searchQuery} />
                )}
            </div>
        </div>
    );
}

// Chat List Component
function ChatList({ searchQuery }: { searchQuery: string }) {
    const { setActiveThreadId } = useChat();
    const { data: threads, isLoading, error } = trpc.chat.getThreads.useQuery();

    if (isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <div className="text-muted-foreground text-center">
                    Loading....
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <div>Error Loading Threads</div>
            </div>
        );
    }

    const filteredThreads = (threads || []).filter(
        (thread) =>
            thread.otherUser?.name
                ?.toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
            thread.lastMessagePreview
                ?.toLowerCase()
                .includes(searchQuery.toLowerCase()),
    );

    if (filteredThreads.length === 0) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <div className="text-center">
                    <MessageSquare className="text-muted-foreground mx-auto h-12 w-12" />
                    <h3 className="mt-4 text-lg font-medium">
                        No conversations
                    </h3>
                    <p className="text-muted-foreground mt-2 text-sm">
                        Start a new conversation to get started
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="divide-border divide-y">
            {filteredThreads.map((thread) => (
                <div
                    key={thread.id}
                    className="hover:bg-muted/50 flex cursor-pointer items-center space-x-3 p-4"
                    onClick={() => setActiveThreadId(thread.id)}
                >
                    <div className="bg-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium">
                        {thread.otherUser?.name
                            ? thread.otherUser.name
                                  .split(' ')
                                  .map((n: string) => n[0])
                                  .join('')
                                  .toUpperCase()
                            : '??'}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                            <p className="text-foreground truncate text-sm font-medium">
                                {thread.otherUser?.name || 'Unknown'}
                            </p>
                            <p className="text-muted-foreground text-xs">
                                {thread.lastMessageAt
                                    ? new Date(
                                          thread.lastMessageAt,
                                      ).toLocaleString()
                                    : ''}
                            </p>
                        </div>
                        <div className="flex items-center justify-between">
                            <p className="text-muted-foreground truncate text-sm">
                                {thread.lastMessagePreview}
                            </p>
                            {thread.unreadCount > 0 && (
                                <div className="bg-primary text-primary-foreground ml-2 flex h-5 w-5 items-center justify-center rounded-full text-xs">
                                    {thread.unreadCount}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// Chat Thread Component
function ChatThread({ threadId }: { threadId: number }) {
    const { setActiveThreadId } = useChat();
    const [message, setMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch messages for this thread
    const { data, isLoading, error, refetch } = trpc.chat.getMessages.useQuery({
        threadId,
        limit: 50,
    });

    // Fetch thread details for header and recipientId
    const { data: thread } = trpc.chat.getThreadById.useQuery({ threadId });

    // Get current user session
    const { data: session } = useSession();

    // For sending messages
    const utils = trpc.useUtils?.();
    const sendMessageMutation = trpc.chat.sendMessage.useMutation({
        onSuccess: async () => {
            setMessage('');
            await refetch();
            utils?.chat.getThreads.invalidate();
        },
    });

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [data?.messages?.length]);

    if (isLoading || !thread) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <div className="text-muted-foreground text-center">
                    Loading...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <div className="text-destructive text-center">
                    Error loading messages
                </div>
            </div>
        );
    }

    const messages = data?.messages ?? [];

    // Compute recipientId (the other user in the thread)
    const currentUserId = session?.user?.id;
    let recipientId: string | undefined;
    if (currentUserId && thread) {
        recipientId =
            thread.user1Id === currentUserId ? thread.user2Id : thread.user1Id;
    }

    const handleSendMessage = () => {
        if (message.trim() && recipientId) {
            sendMessageMutation.mutate({
                recipientId,
                content: message,
                threadId,
            });
        }
    };

    // For header display
    const otherUser =
        currentUserId === thread.user1Id ? thread.user2 : thread.user1;

    return (
        <div className="flex h-full flex-col">
            {/* Thread Header */}
            <div className="border-border border-b p-4">
                <div className="flex items-center space-x-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveThreadId(null)}
                        className="h-8 w-8 p-0"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium">
                        {otherUser?.name
                            ? otherUser.name
                                  .split(' ')
                                  .map((n: string) => n[0])
                                  .join('')
                                  .toUpperCase()
                            : '??'}
                    </div>
                    <div>
                        <h2 className="text-sm font-medium">
                            {otherUser?.name}
                        </h2>
                        <p className="text-muted-foreground text-xs">Online</p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${
                            msg.senderId === currentUserId
                                ? 'justify-end'
                                : 'justify-start'
                        }`}
                    >
                        <div
                            className={`max-w-[75%] rounded-lg p-3 ${
                                msg.senderId === currentUserId
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-foreground'
                            }`}
                        >
                            <p className="text-sm">{msg.content}</p>
                            <p
                                className={`mt-1 text-xs ${
                                    msg.senderId === currentUserId
                                        ? 'text-primary-foreground/70'
                                        : 'text-muted-foreground'
                                }`}
                            >
                                {msg.createdAt
                                    ? new Date(
                                          msg.createdAt,
                                      ).toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                      })
                                    : ''}
                            </p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-border border-t p-4">
                <div className="flex space-x-2">
                    <Input
                        placeholder="Type a message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) =>
                            e.key === 'Enter' && handleSendMessage()
                        }
                        className="flex-1"
                    />
                    <Button
                        onClick={handleSendMessage}
                        disabled={
                            !message.trim() || sendMessageMutation.isPending
                        }
                    >
                        Send
                    </Button>
                </div>
            </div>
        </div>
    );
}
