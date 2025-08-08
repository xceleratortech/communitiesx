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
import NewChatDialog from '@/components/chat/new-chat-dialog';
import { Loading } from '@/components/ui/loading';

export default function ChatPage() {
    const router = useRouter();
    const sessionData = useSession();
    const session = sessionData.data;
    const { activeThreadId, setActiveThreadId, openNewChat } = useChat();
    const [searchQuery, setSearchQuery] = useState('');
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Don't render anything meaningful during SSR to avoid hydration mismatches
    if (!isClient) {
        return null;
    }
    if (session === undefined) {
        return null;
    }
    if (!session) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="mx-auto max-w-md p-4 text-center">
                    <h1 className="mb-4 text-3xl font-bold dark:text-white">
                        Access Denied
                    </h1>
                    <p className="mb-4 text-gray-600 dark:text-gray-400">
                        Please sign in to view your messages.
                    </p>
                    <Button asChild>
                        <a href="/auth/login">Sign In</a>
                    </Button>
                </div>
            </div>
        );
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
            <NewChatDialog />
        </div>
    );
}

// Chat List Component
function ChatList({ searchQuery }: { searchQuery: string }) {
    const { setActiveThreadId } = useChat();
    const { data: threads, isLoading, error } = trpc.chat.getThreads.useQuery();

    if (isLoading) {
        return <Loading message="Loading chats..." />;
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
    const [paginatedMessages, setPaginatedMessages] = useState<any[]>([]); // For older messages
    const [oldestMessageId, setOldestMessageId] = useState<number | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const utils = trpc.useUtils();
    const messagesContainerRef = useRef<HTMLDivElement>(null);

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
    const sendMessageMutation = trpc.chat.sendMessage.useMutation({
        onSuccess: async () => {
            setMessage('');
            await refetch();
            utils.chat.getThreads.invalidate();
        },
    });

    // Fetch older messages
    const fetchOlderMessages = async () => {
        if (!oldestMessageId || !hasMore) return;
        if (!messagesContainerRef.current) return;
        setLoadingOlder(true);
        // Save current scroll position from the top
        const prevScrollHeight = messagesContainerRef.current.scrollHeight;
        const prevScrollTop = messagesContainerRef.current.scrollTop;
        const older = await utils.chat.getMessages.fetch({
            threadId,
            limit: 20,
            cursor: oldestMessageId,
        });
        if (older.messages && older.messages.length > 0) {
            setPaginatedMessages((prev) => {
                const existingIds = new Set(prev.map((m) => m.id));
                const newMessages = older.messages.filter(
                    (m) => !existingIds.has(m.id),
                );
                return [...newMessages, ...prev];
            });
            setOldestMessageId(older.nextCursor); // Use backend's nextCursor
            if (!older.nextCursor) setHasMore(false);
            // After DOM updates, restore scroll position
            setTimeout(() => {
                if (messagesContainerRef.current) {
                    const newScrollHeight =
                        messagesContainerRef.current.scrollHeight;
                    messagesContainerRef.current.scrollTop =
                        newScrollHeight - prevScrollHeight + prevScrollTop;
                }
            }, 0);
        } else {
            setHasMore(false);
        }
        setLoadingOlder(false);
    };

    // On mount or thread change, reset paginated messages and set oldestMessageId
    useEffect(() => {
        setPaginatedMessages([]);
        if (data?.messages && data.messages.length > 0) {
            setOldestMessageId(data.nextCursor); // Use backend's nextCursor
            setHasMore(!!data.nextCursor);
        } else {
            setOldestMessageId(null);
            setHasMore(false);
        }
        setTimeout(
            () =>
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }),
            100,
        );
    }, [threadId, data]);

    // Always merge paginated + latest messages, filter duplicates
    const paginatedIds = new Set(paginatedMessages.map((m) => m.id));
    const uniqueLatest = (data?.messages || []).filter(
        (m) => !paginatedIds.has(m.id),
    );
    const allMessages = [...paginatedMessages, ...uniqueLatest];

    // Scroll to bottom only after sending a message or on initial load
    useEffect(() => {
        if (data?.messages?.length && paginatedMessages.length === 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [data?.messages?.length, paginatedMessages.length]);

    if (isLoading || !thread) {
        return <Loading message="Loading messages..." />;
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

    // Compute otherUser based on the current user and thread.user1/user2
    let otherUser;
    if (currentUserId && thread) {
        otherUser =
            thread.user1Id === currentUserId ? thread.user2 : thread.user1;
    }

    return (
        <div className="flex h-full flex-col">
            {/* Thread Header */}
            <div className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/60 border-b backdrop-blur">
                <div className="flex h-14 items-center justify-between px-4">
                    <div className="flex items-center space-x-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveThreadId(null)}
                            className="h-8 w-8 p-0"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex flex-col">
                            <span className="text-foreground text-sm font-medium">
                                {otherUser?.name || 'Unknown'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages List */}
            <div
                className="flex-1 overflow-auto p-4"
                ref={messagesContainerRef}
                onScroll={() => {
                    if (
                        messagesContainerRef.current &&
                        messagesContainerRef.current.scrollTop === 0 &&
                        hasMore &&
                        !loadingOlder
                    ) {
                        fetchOlderMessages();
                    }
                }}
            >
                {/* Top loader or no more messages info */}
                {loadingOlder && (
                    <div className="text-muted-foreground mb-2 flex justify-center text-xs">
                        <Loading
                            message="Loading older messages..."
                            size="sm"
                        />
                    </div>
                )}
                {!hasMore && paginatedMessages.length > 0 && (
                    <div className="text-muted-foreground mb-2 flex justify-center text-xs">
                        No more messages
                    </div>
                )}
                {/* No Load Older Messages Button, infinite scroll only */}
                {/* Render all messages */}
                {allMessages.length === 0 && (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-muted-foreground text-center">
                            No messages yet. Send the first message!
                        </div>
                    </div>
                )}
                {allMessages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`my-2 flex ${
                            msg.senderId === currentUserId
                                ? 'justify-end'
                                : 'justify-start'
                        }`}
                    >
                        <div
                            className={`max-w-xs rounded-lg px-4 py-2 text-sm ${
                                msg.senderId === currentUserId
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-foreground'
                            }`}
                        >
                            {msg.content}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-border bg-background/95 border-t p-4">
                <div className="flex items-center">
                    <Input
                        placeholder="Type your message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="flex-1"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                    />
                    <Button
                        variant="default"
                        size="sm"
                        onClick={handleSendMessage}
                        className="ml-2"
                    >
                        Send
                    </Button>
                </div>
            </div>
        </div>
    );
}
