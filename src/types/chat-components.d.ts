declare module './chat-thread-list' {
    export function ChatThreadList(): JSX.Element;
    const ChatThreadListComponent: React.ComponentType;
    export default ChatThreadListComponent;
}

declare module './chat-message-view' {
    export interface ChatMessageViewProps {
        threadId: number;
    }
    export function ChatMessageView(props: ChatMessageViewProps): JSX.Element;
    const ChatMessageViewComponent: React.ComponentType<ChatMessageViewProps>;
    export default ChatMessageViewComponent;
}

declare module './new-chat-dialog' {
    export function NewChatDialog(): JSX.Element;
    const NewChatDialogComponent: React.ComponentType;
    export default NewChatDialogComponent;
}
