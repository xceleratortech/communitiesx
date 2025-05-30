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
import { cn } from '@/lib/utils';

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

    // Create a class string based on the variant
    const editorClasses = cn(
        'border border-input rounded-md focus-within:ring-1 focus-within:ring-ring overflow-hidden',
        'prose prose-sm max-w-none dark:prose-invert dark:prose-headings:text-white',
        variant === 'compact' ? 'min-h-[100px]' : 'min-h-[200px]',
    );

    // Create a class string for the toolbar
    const toolbarClasses = cn(
        'border-b border-input flex flex-wrap items-center gap-1 p-1 bg-muted/50 dark:bg-gray-800 dark:border-gray-700',
    );

    // Create a class string for the content
    const contentClasses = cn(
        'p-3 focus:outline-none dark:bg-gray-800 dark:text-gray-100',
        variant === 'compact' ? 'max-h-[150px]' : 'max-h-[300px]',
        'overflow-y-auto',
    );

    // Create a class string for the toolbar buttons
    const buttonClasses = cn(
        'p-1 rounded hover:bg-muted dark:hover:bg-gray-700 transition-colors',
        'text-gray-700 dark:text-gray-300',
    );

    // Create a class string for active toolbar buttons
    const activeButtonClasses = cn(
        'p-1 rounded transition-colors',
        'bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-white',
    );

    return (
        <div className={editorClasses}>
            <div className={toolbarClasses}>
                <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={
                        editor.isActive('bold')
                            ? activeButtonClasses
                            : buttonClasses
                    }
                    type="button"
                    title="Bold"
                >
                    <Bold className="h-4 w-4" />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={
                        editor.isActive('italic')
                            ? activeButtonClasses
                            : buttonClasses
                    }
                    type="button"
                    title="Italic"
                >
                    <Italic className="h-4 w-4" />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={
                        editor.isActive('strike')
                            ? activeButtonClasses
                            : buttonClasses
                    }
                    type="button"
                    title="Strikethrough"
                >
                    <Strikethrough className="h-4 w-4" />
                </button>
                <button
                    onClick={() =>
                        editor.chain().focus().toggleHeading({ level: 1 }).run()
                    }
                    className={
                        editor.isActive('heading', { level: 1 })
                            ? activeButtonClasses
                            : buttonClasses
                    }
                    type="button"
                    title="Heading 1"
                >
                    <Heading1 className="h-4 w-4" />
                </button>
                <button
                    onClick={() =>
                        editor.chain().focus().toggleHeading({ level: 2 }).run()
                    }
                    className={
                        editor.isActive('heading', { level: 2 })
                            ? activeButtonClasses
                            : buttonClasses
                    }
                    type="button"
                    title="Heading 2"
                >
                    <Heading2 className="h-4 w-4" />
                </button>
                <button
                    onClick={() =>
                        editor.chain().focus().toggleBulletList().run()
                    }
                    className={
                        editor.isActive('bulletList')
                            ? activeButtonClasses
                            : buttonClasses
                    }
                    type="button"
                    title="Bullet List"
                >
                    <List className="h-4 w-4" />
                </button>
                <button
                    onClick={() =>
                        editor.chain().focus().toggleOrderedList().run()
                    }
                    className={
                        editor.isActive('orderedList')
                            ? activeButtonClasses
                            : buttonClasses
                    }
                    type="button"
                    title="Ordered List"
                >
                    <ListOrdered className="h-4 w-4" />
                </button>
                <button
                    onClick={() =>
                        editor.chain().focus().toggleBlockquote().run()
                    }
                    className={
                        editor.isActive('blockquote')
                            ? activeButtonClasses
                            : buttonClasses
                    }
                    type="button"
                    title="Quote"
                >
                    <Quote className="h-4 w-4" />
                </button>
                <button
                    onClick={() =>
                        editor.chain().focus().toggleCodeBlock().run()
                    }
                    className={
                        editor.isActive('codeBlock')
                            ? activeButtonClasses
                            : buttonClasses
                    }
                    type="button"
                    title="Code Block"
                >
                    <Code className="h-4 w-4" />
                </button>
                <button
                    onClick={setLink}
                    className={
                        editor.isActive('link')
                            ? activeButtonClasses
                            : buttonClasses
                    }
                    type="button"
                    title="Link"
                >
                    <LinkIcon className="h-4 w-4" />
                </button>
                <button
                    onClick={addImage}
                    className={buttonClasses}
                    type="button"
                    title="Image"
                >
                    <ImageIcon className="h-4 w-4" />
                </button>
                <button
                    onClick={() => editor.chain().focus().setParagraph().run()}
                    className={
                        editor.isActive('paragraph')
                            ? activeButtonClasses
                            : buttonClasses
                    }
                    type="button"
                    title="Paragraph"
                >
                    <Pilcrow className="h-4 w-4" />
                </button>
                <button
                    onClick={() => editor.chain().focus().undo().run()}
                    className={buttonClasses}
                    type="button"
                    title="Undo"
                    disabled={!editor.can().undo()}
                >
                    <Undo className="h-4 w-4" />
                </button>
                <button
                    onClick={() => editor.chain().focus().redo().run()}
                    className={buttonClasses}
                    type="button"
                    title="Redo"
                    disabled={!editor.can().redo()}
                >
                    <Redo className="h-4 w-4" />
                </button>
            </div>
            <EditorContent editor={editor} className={contentClasses} />
        </div>
    );
};

export default TipTapEditor;
