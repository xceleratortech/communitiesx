'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Share2, FileText, Image, Link } from 'lucide-react';
import { trpc } from '@/providers/trpc-provider';

interface SharedData {
    title?: string;
    text?: string;
    url?: string;
    files?: File[];
}

export default function ShareTargetPage() {
    const router = useRouter();
    const [sharedData, setSharedData] = useState<SharedData>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // tRPC mutations
    const createPostMutation = trpc.community.createPost.useMutation();
    const getCommunitiesMutation =
        trpc.communities.getUserCommunities.useQuery();

    useEffect(() => {
        // Handle shared data from Web Share Target API
        const handleSharedData = () => {
            if (typeof window !== 'undefined' && 'navigator' in window) {
                // Check if we have shared data in URL parameters (for non-PWA sharing)
                const urlParams = new URLSearchParams(window.location.search);
                const title = urlParams.get('title');
                const text = urlParams.get('text');
                const url = urlParams.get('url');

                if (title || text || url) {
                    setSharedData({
                        title: title || '',
                        text: text || '',
                        url: url || '',
                    });
                }
            }
        };

        // Listen for service worker messages
        const handleServiceWorkerMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === 'SHARE_TARGET_DATA') {
                const data = event.data.data;
                setSharedData({
                    title: data.title || '',
                    text: data.text || '',
                    url: data.url || '',
                    files: data.files || [],
                });
            }
        };

        // Listen for form data from share target
        const handleFormData = () => {
            // This will be handled by the form submission
            const form = document.querySelector('form');
            if (form) {
                const formData = new FormData(form);
                const title = formData.get('title') as string;
                const text = formData.get('text') as string;
                const url = formData.get('url') as string;
                const files = formData.getAll('file') as File[];

                if (title || text || url || files.length > 0) {
                    setSharedData({
                        title: title || '',
                        text: text || '',
                        url: url || '',
                        files: files.length > 0 ? files : undefined,
                    });
                }
            }
        };

        handleSharedData();
        handleFormData();

        window.addEventListener('message', handleServiceWorkerMessage);

        return () => {
            window.removeEventListener('message', handleServiceWorkerMessage);
        };
    }, []);

    // Handle file preview
    useEffect(() => {
        if (sharedData.files && sharedData.files.length > 0) {
            const file = sharedData.files[0];
            if (file.type.startsWith('image/')) {
                const url = URL.createObjectURL(file);
                setPreviewUrl(url);
                return () => URL.revokeObjectURL(url);
            }
        }
    }, [sharedData.files]);

    const handleInputChange = (field: keyof SharedData, value: string) => {
        setSharedData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            setSharedData((prev) => ({
                ...prev,
                files: Array.from(files),
            }));
        }
    };

    const handleCreatePost = async () => {
        if (!sharedData.title?.trim() && !sharedData.text?.trim()) {
            setError('Please provide a title or content for your post.');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            // Create post content
            let content = sharedData.text || '';

            // Add URL if provided
            if (sharedData.url) {
                content += `\n\nShared from: ${sharedData.url}`;
            }

            // Add file information if provided
            if (sharedData.files && sharedData.files.length > 0) {
                content += `\n\nAttached files: ${sharedData.files.map((f) => f.name).join(', ')}`;
            }

            await createPostMutation.mutateAsync({
                title: sharedData.title || 'Shared Content',
                content: content.trim(),
                communityId: null, // Post to general feed
            });

            // Redirect to posts page
            router.push('/posts');
        } catch (err) {
            console.error('Error creating post:', err);
            setError('Failed to create post. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const getFileIcon = (file: File) => {
        if (file.type.startsWith('image/'))
            return <Image className="h-4 w-4" />;
        if (file.type.startsWith('text/'))
            return <FileText className="h-4 w-4" />;
        return <FileText className="h-4 w-4" />;
    };

    return (
        <div className="bg-background min-h-screen p-4">
            <div className="mx-auto max-w-2xl space-y-6">
                <div className="text-center">
                    <Share2 className="text-primary mx-auto h-12 w-12" />
                    <h1 className="mt-4 text-2xl font-bold">Share Content</h1>
                    <p className="text-muted-foreground">
                        Create a post from shared content
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Create Post</CardTitle>
                        <CardDescription>
                            Review and edit the shared content before posting
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                placeholder="Enter post title..."
                                value={sharedData.title || ''}
                                onChange={(e) =>
                                    handleInputChange('title', e.target.value)
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="content">Content</Label>
                            <Textarea
                                id="content"
                                placeholder="Enter post content..."
                                value={sharedData.text || ''}
                                onChange={(e) =>
                                    handleInputChange('text', e.target.value)
                                }
                                rows={6}
                            />
                        </div>

                        {sharedData.url && (
                            <div className="space-y-2">
                                <Label>Shared URL</Label>
                                <div className="flex items-center space-x-2 rounded-md border p-3">
                                    <Link className="text-muted-foreground h-4 w-4" />
                                    <a
                                        href={sharedData.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 truncate text-sm text-blue-600 hover:underline"
                                    >
                                        {sharedData.url}
                                    </a>
                                </div>
                            </div>
                        )}

                        {sharedData.files && sharedData.files.length > 0 && (
                            <div className="space-y-2">
                                <Label>Attached Files</Label>
                                <div className="space-y-2">
                                    {sharedData.files.map((file, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center space-x-2 rounded-md border p-3"
                                        >
                                            {getFileIcon(file)}
                                            <span className="flex-1 text-sm">
                                                {file.name}
                                            </span>
                                            <span className="text-muted-foreground text-xs">
                                                {(file.size / 1024).toFixed(1)}{' '}
                                                KB
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                {previewUrl && (
                                    <div className="mt-2">
                                        <img
                                            src={previewUrl}
                                            alt="Preview"
                                            className="max-h-48 w-full rounded-md object-cover"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="files">
                                Add More Files (Optional)
                            </Label>
                            <Input
                                id="files"
                                type="file"
                                multiple
                                accept="image/*,text/*,application/pdf"
                                onChange={handleFileChange}
                            />
                        </div>

                        <div className="flex space-x-2 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => router.back()}
                                disabled={isProcessing}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreatePost}
                                disabled={
                                    isProcessing ||
                                    (!sharedData.title?.trim() &&
                                        !sharedData.text?.trim())
                                }
                                className="flex-1"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating Post...
                                    </>
                                ) : (
                                    'Create Post'
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
