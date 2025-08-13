'use client';

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
} from 'react';
import { trpc } from '@/providers/trpc-provider';
import { useSession } from '@/server/auth/client';
import { is } from 'drizzle-orm';

// Define the chat context type
type ChatContextType = {
    isOpen: boolean;
    toggleChat: () => void;
    closeChat: () => void;
    openChat: () => void;
    activeThreadId: number | null;
    setActiveThreadId: (id: number | null) => void;
    unreadCount: number;
    isMinimized: boolean;
    toggleMinimize: () => void;
    isNewChatOpen: boolean;
    openNewChat: () => void;
    closeNewChat: () => void;
    isMobile?: boolean;
};

// Create the context with default values
const ChatContext = createContext<ChatContextType>({
    isOpen: false,
    toggleChat: () => {},
    closeChat: () => {},
    openChat: () => {},
    activeThreadId: null,
    setActiveThreadId: () => {},
    unreadCount: 0,
    isMinimized: false,
    toggleMinimize: () => {},
    isNewChatOpen: false,
    openNewChat: () => {},
    closeNewChat: () => {},
    isMobile: false,
});

// Hook to use the chat context
export const useChat = () => useContext(ChatContext);

// Chat provider component
export function ChatProvider({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const [activeThreadId, setActiveThreadId] = useState<number | null>(null);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Get unread count - commented out as chat is not currently being used
    // const { data: unreadCount = 0, refetch: refetchUnreadCount } =
    //     trpc.chat.getUnreadCount.useQuery(
    //         undefined,
    //         { enabled: !!session, refetchInterval: 4000 }, // Refetch every 4 seconds
    //     );

    // Toggle chat open/closed
    const toggleChat = useCallback(() => {
        if (!isMobile) {
            setIsOpen((prev) => !prev);
            if (isMinimized) {
                setIsMinimized(false);
            }
        }
    }, [isMinimized, isMobile]);

    // Close chat
    const closeChat = useCallback(() => {
        setIsOpen(false);
    }, []);

    // Open chat
    const openChat = useCallback(() => {
        if (!isMobile) {
            setIsOpen(true);
            setIsMinimized(false);
        }
    }, [isMobile]);

    // Toggle minimize
    const toggleMinimize = useCallback(() => {
        setIsMinimized((prev) => !prev);
    }, []);

    // Open new chat dialog
    const openNewChat = useCallback(() => {
        setIsNewChatOpen(true);
    }, []);

    // Close new chat dialog
    const closeNewChat = useCallback(() => {
        setIsNewChatOpen(false);
    }, []);

    // Reset active thread when chat is closed
    useEffect(() => {
        if (!isOpen) {
            setActiveThreadId(null);
        }
    }, [isOpen]);

    // Close chat when user signs out
    useEffect(() => {
        if (!session && isOpen) {
            setIsOpen(false);
            setIsMinimized(false);
            setActiveThreadId(null);
            setIsNewChatOpen(false);
        }
    }, [session, isOpen]);

    useEffect(() => {
        if (isMobile && isOpen) {
            setIsOpen(false);
            setIsMinimized(false);
        }
    }, [isMobile, isOpen]);

    // Provide the chat context
    return (
        <ChatContext.Provider
            value={{
                isOpen,
                toggleChat,
                closeChat,
                openChat,
                activeThreadId,
                setActiveThreadId,
                unreadCount: 0,
                isMinimized,
                toggleMinimize,
                isNewChatOpen,
                openNewChat,
                closeNewChat,
                isMobile,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
}
