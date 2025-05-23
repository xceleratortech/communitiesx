'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { trpc } from '@/providers/trpc-provider';
import { useSession } from '@/server/auth/client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TipTapEditor from '@/components/TipTapEditor';

export default function NewPostPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    const createPost = trpc.community.createPost.useMutation({
        onSuccess: (post) => {
            router.push(`/posts/${post.id}`);
        },
    });

    if (!session) {
        return (
            <div className="mx-auto max-w-4xl p-4">
                <h1 className="mb-4 text-3xl font-bold">Access Denied</h1>
                <p className="mb-4 text-gray-600">
                    Please sign in to create a new post.
                </p>
                <Button asChild>
                    <Link href="/auth/login">Sign In</Link>
                </Button>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            return;
        }

        await createPost.mutate({
            title: title.trim(),
            content: content.trim(),
        });
    };

    return (
        <div className="mx-auto max-w-4xl p-4">
            <h1 className="mb-6 text-3xl font-bold">Create New Post</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label
                        htmlFor="title"
                        className="mb-1 block text-sm font-medium text-gray-700"
                    >
                        Title
                    </label>
                    <Input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label
                        htmlFor="content"
                        className="mb-1 block text-sm font-medium text-gray-700"
                    >
                        Content
                    </label>
                    <TipTapEditor
                        content={content}
                        onChange={setContent}
                        placeholder="Write your post content here..."
                    />
                </div>

                <Button type="submit" disabled={createPost.isPending}>
                    {createPost.isPending ? 'Creating...' : 'Create Post'}
                </Button>
            </form>
        </div>
    );
}
