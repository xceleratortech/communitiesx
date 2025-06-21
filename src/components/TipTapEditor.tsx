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
                paragraph: {
                    HTMLAttributes: {
                        class: 'whitespace-pre-wrap',
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
                showOnlyWhenEditable: true,
                showOnlyCurrent: false,
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
            attributes: {
                class: 'whitespace-pre-wrap outline-none w-full',
                spellcheck: 'true',
            },
            handleKeyDown: (view, event) => {
                // Fix for space bar issue
                if (event.key === ' ') {
                    view.dispatch(view.state.tr.insertText(' '));
                    return true;
                }
                return false;
            },
            handleClick: () => {
                // This helps ensure the editor is focused when clicked anywhere
                if (editor && !editor.isFocused) {
                    editor.commands.focus('end');
                }
                return false; // Don't prevent default behavior
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

    // Add custom CSS to improve the editor experience
    useEffect(() => {
        if (editor) {
            // Add a custom class to the editor to style it
            const editorElement = document.querySelector('.ProseMirror');
            if (editorElement) {
                editorElement.classList.add('tiptap-editor-content');

                // Add custom styles
                const style = document.createElement('style');
                style.textContent = `
                    .tiptap-editor-content {
                        min-height: ${variant === 'compact' ? '80px' : '180px'};
                        width: 100%;
                        cursor: text;
                        transition: background-color 0.2s;
                        padding: 0.5rem;
                        margin: -0.5rem;
                        border-radius: 0.25rem;
                    }
                    .tiptap-editor-content:focus, .tiptap-editor-content:focus-within {
                        outline: none;
                        background-color: rgba(0, 0, 0, 0.02);
                    }
                    .tiptap-editor-content p {
                        margin-bottom: 0.5em;
                    }
                    .tiptap-editor-content p:last-child {
                        margin-bottom: 0;
                    }
                    .dark .tiptap-editor-content:focus, .dark .tiptap-editor-content:focus-within {
                        background-color: rgba(255, 255, 255, 0.02);
                    }
                    /* Improve selection appearance */
                    .tiptap-editor-content ::selection {
                        background-color: rgba(59, 130, 246, 0.3);
                    }
                    .dark .tiptap-editor-content ::selection {
                        background-color: rgba(96, 165, 250, 0.3);
                    }
                    /* Make the editor feel more like a text area */
                    .tiptap-editor-content:hover {
                        background-color: rgba(0, 0, 0, 0.01);
                    }
                    .dark .tiptap-editor-content:hover {
                        background-color: rgba(255, 255, 255, 0.01);
                    }
                `;
                document.head.appendChild(style);

                return () => {
                    document.head.removeChild(style);
                };
            }
        }
    }, [editor, variant]);

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

    /* -------------------------------------------------------------------------------------------------
     * shadcn-inspired styles
     * ------------------------------------------------------------------------------------------------*/

    const editorClasses = cn(
        'border border-input rounded-md overflow-hidden',
        'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        variant === 'compact' ? 'min-h-[100px]' : 'min-h-[200px]',
    );

    const toolbarClasses = cn(
        'flex flex-wrap items-center gap-1 border-b border-input bg-muted px-2 py-1',
    );

    const contentClasses = cn(
        'p-3 prose prose-sm max-w-none dark:prose-invert',
        'focus:outline-none',
        variant === 'compact' ? 'max-h-[150px]' : 'max-h-[300px]',
        'overflow-y-auto whitespace-pre-wrap',
    );

    const buttonClasses = cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground',
        'hover:bg-accent hover:text-foreground',
        'transition-colors',
    );

    const activeButtonClasses = cn('bg-accent text-foreground');

    return (
        <div
            className={editorClasses}
            onClick={() => {
                if (editor && !editor.isFocused) {
                    editor.commands.focus();
                }
            }}
        >
            <div
                className={toolbarClasses}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        editor.chain().focus().toggleBold().run();
                    }}
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
                    onClick={(e) => {
                        e.stopPropagation();
                        editor.chain().focus().toggleItalic().run();
                    }}
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
                    onClick={(e) => {
                        e.stopPropagation();
                        editor.chain().focus().toggleStrike().run();
                    }}
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
                    onClick={(e) => {
                        e.stopPropagation();
                        editor
                            .chain()
                            .focus()
                            .toggleHeading({ level: 1 })
                            .run();
                    }}
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
                    onClick={(e) => {
                        e.stopPropagation();
                        editor
                            .chain()
                            .focus()
                            .toggleHeading({ level: 2 })
                            .run();
                    }}
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
                    onClick={(e) => {
                        e.stopPropagation();
                        editor.chain().focus().toggleBulletList().run();
                    }}
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
                    onClick={(e) => {
                        e.stopPropagation();
                        editor.chain().focus().toggleOrderedList().run();
                    }}
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
                    onClick={(e) => {
                        e.stopPropagation();
                        editor.chain().focus().toggleBlockquote().run();
                    }}
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
                    onClick={(e) => {
                        e.stopPropagation();
                        editor.chain().focus().toggleCodeBlock().run();
                    }}
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
                    onClick={(e) => {
                        e.stopPropagation();
                        setLink();
                    }}
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
                    onClick={(e) => {
                        e.stopPropagation();
                        addImage();
                    }}
                    className={buttonClasses}
                    type="button"
                    title="Image"
                >
                    <ImageIcon className="h-4 w-4" />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        editor.chain().focus().setParagraph().run();
                    }}
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
                    onClick={(e) => {
                        e.stopPropagation();
                        editor.chain().focus().undo().run();
                    }}
                    className={buttonClasses}
                    type="button"
                    title="Undo"
                    disabled={!editor.can().undo()}
                >
                    <Undo className="h-4 w-4" />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        editor.chain().focus().redo().run();
                    }}
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
