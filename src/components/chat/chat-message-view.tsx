'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSession } from '@/server/auth/client';
import { trpc } from '@/providers/trpc-provider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, ArrowDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { UserProfilePopover } from '@/components/ui/user-profile-popover';
import { Loading } from '@/components/ui/loading';

type ChatMessageViewProps = {
    threadId: number;
};

export function ChatMessageView({ threadId }: ChatMessageViewProps) {
    const { data: session } = useSession();
    const [message, setMessage] = useState('');
    const [lastPolled, setLastPolled] = useState<Date>(new Date());
    const [showScrollButton, setShowScrollButton] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [paginatedMessages, setPaginatedMessages] = useState<any[]>([]); // For older messages
    const [oldestMessageId, setOldestMessageId] = useState<number | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loadingOlder, setLoadingOlder] = useState(false);

    // Get thread details to identify participants
    const { data: threadData } = trpc.chat.getThreadById.useQuery(
        { threadId },
        {
            enabled: !!threadId,
        },
    );

    // Get messages for the thread
    const {
        data: messagesData,
        isLoading,
        refetch,
    } = trpc.chat.getMessages.useQuery(
        { threadId, limit: 50 },
        { refetchInterval: 0 }, // We'll handle polling manually
    );

    // Get new messages via polling
    const { data: newMessages = [] } = trpc.chat.getNewMessages.useQuery(
        { threadId, since: lastPolled },
        { refetchInterval: 2000 }, // Poll every 2 seconds
    );

    // Check if user is at the bottom of the chat
    const isAtBottom = () => {
        if (messagesContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } =
                messagesContainerRef.current;
            return scrollHeight - scrollTop - clientHeight < 50; // Within 50px of bottom
        }
        return true;
    };

    // Handle new messages
    useEffect(() => {
        if (newMessages && newMessages.length > 0) {
            setLastPolled(new Date());
            refetch();

            // Only auto-scroll if user is already at the bottom
            if (isAtBottom()) {
                setTimeout(() => scrollToBottom(true), 50);
            }
        }
    }, [newMessages, refetch]);

    // Send message mutation
    const sendMessageMutation = trpc.chat.sendMessage.useMutation({
        onSuccess: () => {
            setMessage('');
            refetch();
            setLastPolled(new Date());
            setTimeout(() => {
                scrollToBottom(true);
                if (textareaRef.current) {
                    textareaRef.current.focus();
                }
            }, 100);
        },
    });

    // Function to get initials from name
    const getInitials = (name: string) => {
        if (!name) return '?';
        return name
            .split(' ')
            .map((part) => part[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    // Function to format the timestamp
    const formatTime = (timestamp: string | Date) => {
        try {
            return formatDistanceToNow(new Date(timestamp), {
                addSuffix: true,
            });
        } catch (error) {
            return '';
        }
    };

    // Determine the recipient ID
    const getRecipientId = (): string | null => {
        if (!session?.user) return null;

        // If we have thread data, use it to determine the recipient
        if (threadData) {
            return threadData.user1Id === session.user.id
                ? threadData.user2Id
                : threadData.user1Id;
        }

        // If we have messages, use the first message to determine the recipient
        if (messagesData?.messages && messagesData.messages.length > 0) {
            const firstMessage = messagesData.messages[0];
            return firstMessage.senderId === session.user.id
                ? firstMessage.recipientId
                : firstMessage.senderId;
        }

        return null;
    };

    // Get the other user's data
    const getOtherUserData = () => {
        if (!session?.user || !threadData) return null;

        return threadData.user1Id === session.user.id
            ? threadData.user2
            : threadData.user1;
    };

    // Handle sending a message
    const handleSendMessage = () => {
        if (!message.trim() || !session?.user) return;

        const recipientId = getRecipientId();

        if (!recipientId) {
            console.error('Could not determine recipient ID');
            return;
        }

        sendMessageMutation.mutate({
            threadId,
            recipientId,
            content: message.trim(),
        });
    };

    // Handle pressing Enter to send (Shift+Enter for new line)
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Scroll to bottom of messages (which is now the newest messages)
    const scrollToBottom = (immediate = false) => {
        if (messagesContainerRef.current) {
            const scrollHeight = messagesContainerRef.current.scrollHeight;

            if (immediate) {
                messagesContainerRef.current.style.scrollBehavior = 'auto';
                messagesContainerRef.current.scrollTop = scrollHeight;
                messagesContainerRef.current.style.scrollBehavior = 'smooth';
            } else {
                messagesContainerRef.current.scrollTop = scrollHeight;
            }
        }
    };

    // Scroll to bottom on initial load
    useEffect(() => {
        if (messagesData && !isLoading) {
            // Use a small timeout to ensure DOM is fully rendered
            setTimeout(() => scrollToBottom(true), 50);
        }
    }, [messagesData, isLoading]);

    // Make sure we scroll to bottom on component mount and after resize
    useEffect(() => {
        scrollToBottom(true);

        // Add a slight delay to ensure everything is rendered and positioned correctly
        const timer = setTimeout(() => scrollToBottom(true), 300);

        // Also handle window resize events
        const handleResize = () => scrollToBottom(true);
        window.addEventListener('resize', handleResize);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [message]);

    // Focus textarea on mount
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    }, []);

    // Get the other user in the conversation
    const otherUser = getOtherUserData();

    // Check if user has scrolled away from bottom
    const handleScroll = () => {
        if (messagesContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } =
                messagesContainerRef.current;
            const isScrolledUp = scrollHeight - scrollTop - clientHeight > 100;
            setShowScrollButton(isScrolledUp);
        }
    };

    // Add scroll event listener
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => {
                container.removeEventListener('scroll', handleScroll);
            };
        }
    }, []);

    const utils = trpc.useUtils();
    // Fetch older messages
    const fetchOlderMessages = async () => {
        if (!oldestMessageId || !hasMore) return;
        setLoadingOlder(true);
        const prevScrollHeight =
            messagesContainerRef.current?.scrollHeight || 0;
        const prevScrollTop = messagesContainerRef.current?.scrollTop || 0;
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
        if (messagesData?.messages && messagesData.messages.length > 0) {
            setOldestMessageId(messagesData.nextCursor); // Use backend's nextCursor
            setHasMore(!!messagesData.nextCursor);
        } else {
            setOldestMessageId(null);
            setHasMore(false);
        }
        setTimeout(() => scrollToBottom(true), 100);
    }, [threadId, messagesData]);

    // Add scroll event listener for infinite scroll
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;
        const handleInfiniteScroll = () => {
            if (container.scrollTop === 0 && hasMore && !loadingOlder) {
                fetchOlderMessages();
            }
            handleScroll(); // keep existing scroll button logic
        };
        container.addEventListener('scroll', handleInfiniteScroll);
        return () => {
            container.removeEventListener('scroll', handleInfiniteScroll);
        };
    }, [hasMore, loadingOlder, fetchOlderMessages]);

    // Always sort and merge paginated + latest messages, filter duplicates
    const paginatedIds = new Set(paginatedMessages.map((m) => m.id));
    const uniqueLatest = (messagesData?.messages || []).filter(
        (m) => !paginatedIds.has(m.id),
    );
    const allMessages = [...paginatedMessages, ...uniqueLatest];

    return (
        <div className="flex h-full w-full flex-col">
            {/* Chat Header */}
            <div className="flex items-center border-b p-3">
                {isLoading || !otherUser ? (
                    <div className="flex items-center space-x-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                ) : (
                    <div className="flex items-center space-x-2">
                        <UserProfilePopover userId={otherUser.id}>
                            <Avatar className="h-8 w-8 cursor-pointer">
                                <AvatarImage
                                    src={otherUser.image || undefined}
                                />
                                <AvatarFallback>
                                    {getInitials(otherUser.name || '')}
                                </AvatarFallback>
                            </Avatar>
                        </UserProfilePopover>
                        <div>
                            <p className="text-sm font-medium">
                                {otherUser.name}
                            </p>
                            <p className="text-muted-foreground text-xs">
                                {otherUser.email}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Messages Area */}
            <div
                ref={messagesContainerRef}
                className="relative flex-1 overflow-y-auto scroll-smooth p-4"
                style={{ scrollbarGutter: 'stable' }}
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
                {/* Scroll to bottom button */}
                {showScrollButton && (
                    <Button
                        size="icon"
                        className="absolute right-4 bottom-4 z-10 rounded-full shadow-md"
                        onClick={() => scrollToBottom(true)}
                    >
                        <ArrowDown className="h-4 w-4" />
                    </Button>
                )}

                {isLoading ? (
                    <div className="flex flex-col space-y-4">
                        {Array(5)
                            .fill(0)
                            .map((_, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        'flex items-start space-x-2',
                                        i % 2 === 0
                                            ? 'justify-start'
                                            : 'flex-row-reverse',
                                    )}
                                >
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                    <div
                                        className={cn(
                                            'max-w-[70%] rounded-lg p-3',
                                            i % 2 === 0
                                                ? 'bg-muted'
                                                : 'bg-primary text-primary-foreground',
                                        )}
                                    >
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="mt-1 h-3 w-40" />
                                    </div>
                                </div>
                            ))}
                    </div>
                ) : allMessages && allMessages.length > 0 ? (
                    <div className="flex min-h-full flex-col space-y-4">
                        {allMessages.map((msg) => {
                            const isCurrentUser =
                                msg.senderId === session?.user?.id;
                            return (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        'flex items-start space-x-2',
                                        isCurrentUser
                                            ? 'flex-row-reverse space-x-reverse'
                                            : 'justify-start',
                                    )}
                                >
                                    {!isCurrentUser ? (
                                        <UserProfilePopover
                                            userId={msg.senderId}
                                        >
                                            <Avatar className="h-8 w-8 cursor-pointer">
                                                <AvatarImage
                                                    src={
                                                        msg.sender?.image ||
                                                        undefined
                                                    }
                                                />
                                                <AvatarFallback>
                                                    {getInitials(
                                                        msg.sender?.name || '',
                                                    )}
                                                </AvatarFallback>
                                            </Avatar>
                                        </UserProfilePopover>
                                    ) : (
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage
                                                src={
                                                    msg.sender?.image ||
                                                    undefined
                                                }
                                            />
                                            <AvatarFallback>
                                                {getInitials(
                                                    msg.sender?.name || '',
                                                )}
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                    <div>
                                        <div
                                            className={cn(
                                                'max-w-[300px] rounded-lg p-3',
                                                isCurrentUser
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted text-muted-foreground',
                                            )}
                                        >
                                            <p className="text-sm break-words whitespace-pre-wrap">
                                                {msg.content}
                                            </p>
                                        </div>
                                        <p className="text-muted-foreground mt-1 text-xs">
                                            {formatTime(msg.createdAt)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                        <p className="text-sm font-medium">No messages yet</p>
                        <p className="text-muted-foreground text-xs">
                            Send a message to start the conversation
                        </p>
                    </div>
                )}
            </div>

            {/* Message Input */}
            <div className="border-t p-3">
                <div className="flex items-end space-x-2">
                    <Textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="max-h-[120px] min-h-[40px] resize-none"
                        rows={1}
                    />
                    <Button
                        size="icon"
                        onClick={handleSendMessage}
                        disabled={
                            !message.trim() ||
                            sendMessageMutation.isPending ||
                            !getRecipientId()
                        }
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
                {sendMessageMutation.isError && (
                    <p className="text-destructive mt-1 text-xs">
                        Failed to send message. Please try again.
                    </p>
                )}
            </div>
        </div>
    );
}

// Default export for dynamic imports
export default ChatMessageView;
