'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { trpc } from '@/providers/trpc-provider';
import { useSession } from '@/server/auth/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import TipTapEditor from '@/components/TipTapEditor';

export default function EditPostPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const postId = parseInt(params.id as string);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [error, setError] = useState('');

    const { data: post, isLoading } = trpc.community.getPost.useQuery(
        { postId },
        { enabled: !!session },
    );

    const editPost = trpc.community.editPost.useMutation({
        onSuccess: () => {
            router.push(`/posts/${postId}`);
        },
        onError: (err: any) => {
            setError(err.message || 'Failed to update post');
        },
    });

    useEffect(() => {
        if (post) {
            setTitle(post.title);
            setContent(post.content);
        }
    }, [post]);

    if (!session) {
        return (
            <div className="mx-auto max-w-4xl p-4">
                <h1 className="mb-4 text-3xl font-bold">Access Denied</h1>
                <p className="mb-4 text-gray-600">
                    Please sign in to edit this post.
                </p>
            </div>
        );
    }

    if (isLoading) {
        return <div className="p-4">Loading post...</div>;
    }

    if (!post) {
        return <div className="p-4">Post not found</div>;
    }

    if (post.isDeleted) {
        router.push(`/posts/${postId}`);
        return null;
    }

    if (post.authorId !== session.user.id) {
        return (
            <div className="mx-auto max-w-4xl p-4">
                <h1 className="mb-4 text-3xl font-bold">Access Denied</h1>
                <p className="mb-4 text-gray-600">
                    You are not authorized to edit this post.
                </p>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!title.trim() || !content.trim()) {
            setError('Title and content are required.');
            return;
        }
        editPost.mutate({
            postId,
            title: title.trim(),
            content: content,
        });
    };

    return (
        <div className="mx-auto max-w-4xl p-4">
            <h1 className="mb-6 text-3xl font-bold">Edit Post</h1>
            {error && <div className="mb-4 text-red-500">{error}</div>}
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
                        key={`editor-${post?.id}-${post?.updatedAt}`}
                        content={content}
                        onChange={setContent}
                        placeholder="Edit your post content here..."
                    />
                </div>
                <Button type="submit" disabled={editPost.isPending}>
                    {editPost.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
            </form>
        </div>
    );
}
