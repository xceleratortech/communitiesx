'use client';

import React, { useState } from 'react';
import { useChat } from '@/providers/chat-provider';
import { trpc } from '@/providers/trpc-provider';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Search, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserProfilePopover } from '@/components/ui/user-profile-popover';

export function NewChatDialog() {
    const { isNewChatOpen, closeNewChat, setActiveThreadId } = useChat();
    const [searchQuery, setSearchQuery] = useState('');

    // Get users from the same org
    const { data: orgUsers, isLoading } = trpc.chat.getOrgUsers.useQuery();

    // Send message mutation to create a new thread
    const sendMessageMutation = trpc.chat.sendMessage.useMutation({
        onSuccess: (data) => {
            setActiveThreadId(data.threadId);
            closeNewChat();
        },
    });

    // Filter users based on search query
    const filteredUsers = orgUsers?.filter((user) => {
        if (!searchQuery.trim()) return true;

        const query = searchQuery.toLowerCase();
        return (
            user.name?.toLowerCase().includes(query) ||
            user.email?.toLowerCase().includes(query)
        );
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

    // Start a new chat with a user
    const startChat = (userId: string) => {
        sendMessageMutation.mutate({
            recipientId: userId,
            content: 'Hi there!', // Initial message
        });
    };

    return (
        <Dialog
            open={isNewChatOpen}
            onOpenChange={(open) => !open && closeNewChat()}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>New Message</DialogTitle>
                    <DialogDescription>
                        Select a user from your organization to start a
                        conversation
                    </DialogDescription>
                </DialogHeader>

                {/* Search Input */}
                <div className="relative">
                    <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                    <Input
                        placeholder="Search users..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* User List */}
                <ScrollArea className="h-72">
                    {isLoading ? (
                        <div className="flex h-full items-center justify-center">
                            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                        </div>
                    ) : filteredUsers && filteredUsers.length > 0 ? (
                        <div className="space-y-1">
                            {filteredUsers.map((user) => (
                                <Button
                                    key={user.id}
                                    variant="ghost"
                                    className="w-full justify-start"
                                    onClick={() => startChat(user.id)}
                                    disabled={sendMessageMutation.isPending}
                                >
                                    <div className="flex items-center space-x-3">
                                        <UserProfilePopover userId={user.id}>
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage
                                                    src={
                                                        user.image || undefined
                                                    }
                                                />
                                                <AvatarFallback>
                                                    {getInitials(
                                                        user.name || '',
                                                    )}
                                                </AvatarFallback>
                                            </Avatar>
                                        </UserProfilePopover>
                                        <div>
                                            <UserProfilePopover
                                                userId={user.id}
                                            >
                                                <p className="text-sm font-medium">
                                                    {user.name}
                                                </p>
                                            </UserProfilePopover>
                                            <p className="text-muted-foreground text-xs">
                                                {user.email}
                                            </p>
                                        </div>
                                    </div>
                                </Button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                            <p className="text-sm font-medium">
                                No users found
                            </p>
                            <p className="text-muted-foreground text-xs">
                                {searchQuery
                                    ? 'Try a different search term'
                                    : 'There are no other users in your organization'}
                            </p>
                        </div>
                    )}
                </ScrollArea>

                {sendMessageMutation.isError && (
                    <p className="text-destructive text-xs">
                        Failed to start conversation. Please try again.
                    </p>
                )}

                <div className="flex justify-end">
                    <Button variant="outline" onClick={closeNewChat}>
                        Cancel
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Default export for dynamic imports
export default NewChatDialog;
