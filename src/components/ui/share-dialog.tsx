'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Share2, Loader2, Check, Copy, ExternalLink } from 'lucide-react';
import { useWebShare } from '@/hooks/use-web-share';
import { toast } from 'sonner';

interface ShareDialogProps {
    title?: string;
    text?: string;
    url?: string;
    files?: File[];
    trigger?: React.ReactNode;
    onShareSuccess?: () => void;
    onShareError?: (error: string) => void;
}

export function ShareDialog({
    title: initialTitle,
    text: initialText,
    url: initialUrl,
    files,
    trigger,
    onShareSuccess,
    onShareError,
}: ShareDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState(initialTitle || '');
    const [text, setText] = useState(initialText || '');
    const [url, setUrl] = useState(initialUrl || '');
    const [showSuccess, setShowSuccess] = useState(false);

    const { isSupported, isSharing, share, error } = useWebShare();

    const handleShare = async () => {
        if (!isSupported) {
            toast.error('Sharing is not supported in this browser');
            return;
        }

        const success = await share({
            title: title.trim() || undefined,
            text: text.trim() || undefined,
            url: url.trim() || undefined,
            files,
        });

        if (success) {
            setShowSuccess(true);
            onShareSuccess?.();
            toast.success('Content shared successfully!');

            // Close dialog and reset success state
            setTimeout(() => {
                setIsOpen(false);
                setShowSuccess(false);
            }, 1500);
        } else if (error) {
            onShareError?.(error);
            toast.error(`Failed to share: ${error}`);
        }
    };

    const handleCopyUrl = async () => {
        if (url) {
            try {
                await navigator.clipboard.writeText(url);
                toast.success('URL copied to clipboard!');
            } catch (err) {
                toast.error('Failed to copy URL');
            }
        }
    };

    const handleOpenUrl = () => {
        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    if (!isSupported) {
        return null; // Don't render if not supported
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm">
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Share Content</DialogTitle>
                    <DialogDescription>
                        Share this content with other apps on your device
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="share-title">Title</Label>
                        <Input
                            id="share-title"
                            placeholder="Enter a title..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="share-text">Text</Label>
                        <Textarea
                            id="share-text"
                            placeholder="Enter text to share..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            rows={3}
                        />
                    </div>

                    {url && (
                        <div className="space-y-2">
                            <Label>URL</Label>
                            <div className="flex space-x-2">
                                <Input
                                    value={url}
                                    readOnly
                                    className="flex-1"
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCopyUrl}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleOpenUrl}
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {files && files.length > 0 && (
                        <div className="space-y-2">
                            <Label>Files</Label>
                            <div className="text-muted-foreground text-sm">
                                {files.length} file(s) will be shared
                            </div>
                        </div>
                    )}

                    <div className="flex space-x-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setIsOpen(false)}
                            disabled={isSharing}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleShare}
                            disabled={
                                isSharing ||
                                (!title.trim() && !text.trim() && !url.trim())
                            }
                            className="flex-1"
                        >
                            {isSharing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sharing...
                                </>
                            ) : showSuccess ? (
                                <>
                                    <Check className="mr-2 h-4 w-4" />
                                    Shared!
                                </>
                            ) : (
                                <>
                                    <Share2 className="mr-2 h-4 w-4" />
                                    Share
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
