'use client';

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { Button } from '@/components/ui/button';
import {
    Bold,
    Italic,
    List,
    ListOrdered,
    Link as LinkIcon,
    Image as ImageIcon,
    Heading1,
    Heading2,
    Undo,
    Redo,
    Quote,
    Code,
    Strikethrough,
    Pilcrow,
} from 'lucide-react';

interface TipTapEditorProps {
    content: string;
    onChange: (richText: string) => void;
    placeholder?: string;
    variant?: 'default' | 'compact';
}

const TipTapEditor: React.FC<TipTapEditorProps> = ({
    content,
    onChange,
    placeholder = 'Write something...',
    variant = 'default',
}) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2],
                },
                bulletList: {
                    keepMarks: true,
                    keepAttributes: false,
                    HTMLAttributes: {
                        class: 'list-disc ml-4',
                    },
                },
                orderedList: {
                    keepMarks: true,
                    keepAttributes: false,
                    HTMLAttributes: {
                        class: 'list-decimal ml-4',
                    },
                },
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-500 underline',
                },
            }),
            Placeholder.configure({
                placeholder,
            }),
            Image.configure({
                HTMLAttributes: {
                    class: 'max-w-full rounded-md',
                },
            }),
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            handleKeyDown: (view, event) => {
                // Fix for space bar issue
                if (event.key === ' ') {
                    view.dispatch(view.state.tr.insertText(' '));
                    return true;
                }
                return false;
            },
        },
    });

    useEffect(() => {
        if (editor) {
            // Only update content if it's different from current editor content
            // to avoid cursor jumping issues
            const currentContent = editor.getHTML();

            // Special case for empty content - always clear the editor
            if (content === '') {
                if (currentContent !== '<p></p>' && currentContent !== '') {
                    editor.commands.clearContent(true);
                }
                return;
            }

            // For non-empty content, only update if different
            if (currentContent !== content) {
                editor.commands.setContent(content);
            }
        }
    }, [content, editor]);

    if (!editor) {
        return null;
    }

    const addImage = () => {
        const url = prompt('Enter image URL');
        if (url) {
            editor.chain().focus().setImage({ src: url }).run();
        }
    };

    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = prompt('URL', previousUrl);

        // cancelled
        if (url === null) {
            return;
        }

        // empty
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        // update link
        editor
            .chain()
            .focus()
            .extendMarkRange('link')
            .setLink({ href: url })
            .run();
    };

    return (
        <div className="rounded-md border border-gray-300">
            <div className="flex flex-wrap gap-1 border-b border-gray-300 bg-gray-50 p-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={editor.isActive('bold') ? 'bg-gray-200' : ''}
                    type="button"
                    title="Bold"
                >
                    <Bold className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={editor.isActive('italic') ? 'bg-gray-200' : ''}
                    type="button"
                    title="Italic"
                >
                    <Italic className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={editor.isActive('strike') ? 'bg-gray-200' : ''}
                    type="button"
                    title="Strikethrough"
                >
                    <Strikethrough className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                        editor.chain().focus().toggleHeading({ level: 1 }).run()
                    }
                    className={
                        editor.isActive('heading', { level: 1 })
                            ? 'bg-gray-200'
                            : ''
                    }
                    type="button"
                    title="Heading 1"
                >
                    <Heading1 className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                        editor.chain().focus().toggleHeading({ level: 2 }).run()
                    }
                    className={
                        editor.isActive('heading', { level: 2 })
                            ? 'bg-gray-200'
                            : ''
                    }
                    type="button"
                    title="Heading 2"
                >
                    <Heading2 className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                        editor.chain().focus().toggleBulletList().run()
                    }
                    className={
                        editor.isActive('bulletList') ? 'bg-gray-200' : ''
                    }
                    type="button"
                    title="Bullet List"
                >
                    <List className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                        editor.chain().focus().toggleOrderedList().run()
                    }
                    className={
                        editor.isActive('orderedList') ? 'bg-gray-200' : ''
                    }
                    type="button"
                    title="Ordered List"
                >
                    <ListOrdered className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                        editor.chain().focus().toggleBlockquote().run()
                    }
                    className={
                        editor.isActive('blockquote') ? 'bg-gray-200' : ''
                    }
                    type="button"
                    title="Quote"
                >
                    <Quote className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                        editor.chain().focus().toggleCodeBlock().run()
                    }
                    className={
                        editor.isActive('codeBlock') ? 'bg-gray-200' : ''
                    }
                    type="button"
                    title="Code Block"
                >
                    <Code className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={setLink}
                    className={editor.isActive('link') ? 'bg-gray-200' : ''}
                    type="button"
                    title="Link"
                >
                    <LinkIcon className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={addImage}
                    type="button"
                    title="Image"
                >
                    <ImageIcon className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setParagraph().run()}
                    className={
                        editor.isActive('paragraph') ? 'bg-gray-200' : ''
                    }
                    type="button"
                    title="Paragraph"
                >
                    <Pilcrow className="h-4 w-4" />
                </Button>
                <div className="ml-auto flex gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                        type="button"
                        title="Undo"
                    >
                        <Undo className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        type="button"
                        title="Redo"
                    >
                        <Redo className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <EditorContent
                editor={editor}
                className={`prose prose-ul:list-disc prose-ol:list-decimal max-w-none p-4 focus:outline-none ${
                    variant === 'compact'
                        ? 'min-h-[120px] text-sm'
                        : 'min-h-[200px]'
                }`}
            />
        </div>
    );
};

export default TipTapEditor;
