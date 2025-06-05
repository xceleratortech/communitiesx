'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSession } from '@/server/auth/client';
import { trpc } from '@/providers/trpc-provider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { UserProfilePopover } from '@/components/ui/user-profile-popover';

type ChatMessageViewProps = {
    threadId: number;
};

export function ChatMessageView({ threadId }: ChatMessageViewProps) {
    const { data: session } = useSession();
    const [message, setMessage] = useState('');
    const [lastPolled, setLastPolled] = useState<Date>(new Date());
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    // Handle new messages
    useEffect(() => {
        if (newMessages && newMessages.length > 0) {
            setLastPolled(new Date());
            refetch();
        }
    }, [newMessages, refetch]);

    // Send message mutation
    const sendMessageMutation = trpc.chat.sendMessage.useMutation({
        onSuccess: () => {
            setMessage('');
            refetch();
            setLastPolled(new Date());
            setTimeout(() => {
                scrollToBottom();
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

    // Scroll to bottom of messages
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Scroll to bottom on initial load and when new messages arrive
    useEffect(() => {
        if (messagesData && !isLoading) {
            scrollToBottom();
        }
    }, [messagesData, isLoading]);

    // Also scroll when new messages arrive via polling
    useEffect(() => {
        if (newMessages && newMessages.length > 0) {
            scrollToBottom();
        }
    }, [newMessages]);

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
            <div className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                    <div className="space-y-4">
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
                ) : messagesData?.messages &&
                  messagesData.messages.length > 0 ? (
                    <div className="space-y-4">
                        {messagesData.messages.map((msg) => {
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
