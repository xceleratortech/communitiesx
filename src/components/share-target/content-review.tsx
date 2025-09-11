'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { sanitizeHtml } from '@/lib/sanitize';
import { Loader2, Link, ArrowLeft, ExternalLink } from 'lucide-react';
import {
    fetchLinkPreview,
    isValidUrl,
    type LinkPreview,
} from '@/lib/link-preview';

interface SharedData {
    title?: string;
    text?: string;
    url?: string;
}

interface Community {
    id: number;
    name: string;
    slug: string;
    organization?: {
        id: string;
        name: string;
        createdAt: Date;
        slug: string;
        allowCrossOrgDM: boolean;
    } | null;
}

interface ContentReviewProps {
    sharedData: SharedData;
    selectedCommunities: Community[];
    onBack: () => void;
    onNext: (title: string, content: string) => void;
}

// Build initial content from shared data
const buildInitialContent = (data: SharedData) => {
    let builtContent = '';

    if (data.text) {
        builtContent += data.text;
    }

    if (data.url) {
        if (builtContent) {
            builtContent += '\n\n';
        }
        builtContent += `Shared from: ${data.url}`;
    }

    return builtContent;
};

// Convert URLs in text to HTML links (for sanitization)
const convertUrlsToHtmlLinks = (text: string): string => {
    const urlRegex =
        /(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?/gi;

    return text.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
};

export function ContentReview({
    sharedData,
    selectedCommunities,
    onBack,
    onNext,
}: ContentReviewProps) {
    const [title, setTitle] = useState(sharedData.title || '');
    const [content, setContent] = useState(buildInitialContent(sharedData));
    const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        // Update content when sharedData changes
        const newContent = buildInitialContent(sharedData);
        setContent(newContent);
    }, [sharedData]);

    useEffect(() => {
        // Fetch link preview if there's a URL
        if (sharedData.url && isValidUrl(sharedData.url)) {
            setIsLoadingPreview(true);
            fetchLinkPreview(sharedData.url)
                .then(setLinkPreview)
                .catch(console.error)
                .finally(() => setIsLoadingPreview(false));
        }
    }, [sharedData.url]);

    const handleSubmit = async () => {
        if (!title.trim()) return;

        setIsSubmitting(true);
        try {
            const contentWithLinks = convertUrlsToHtmlLinks(content.trim());
            onNext(title.trim(), sanitizeHtml(contentWithLinks));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="space-y-6 pb-20">
                <div className="text-center">
                    <h2 className="text-2xl font-bold">Review Content</h2>
                    <p className="text-muted-foreground mt-2">
                        Review and edit the content before posting
                    </p>

                    {/* Data received indicator */}
                    <div className="bg-muted/50 mt-4 rounded-lg p-3">
                        <div className="text-muted-foreground text-sm">
                            <strong>Received data:</strong>
                            <div className="mt-1 space-y-1">
                                {sharedData.title && (
                                    <div className="flex items-center space-x-2">
                                        <span className="text-green-600">
                                            ✓
                                        </span>
                                        <span>Title: "{sharedData.title}"</span>
                                    </div>
                                )}
                                {sharedData.text && (
                                    <div className="flex items-center space-x-2">
                                        <span className="text-green-600">
                                            ✓
                                        </span>
                                        <span>
                                            Text: "
                                            {sharedData.text.substring(0, 50)}
                                            {sharedData.text.length > 50
                                                ? '...'
                                                : ''}
                                            "
                                        </span>
                                    </div>
                                )}
                                {sharedData.url && (
                                    <div className="flex items-center space-x-2">
                                        <span className="text-green-600">
                                            ✓
                                        </span>
                                        <span>URL: {sharedData.url}</span>
                                    </div>
                                )}
                                {!sharedData.title &&
                                    !sharedData.text &&
                                    !sharedData.url && (
                                        <div className="flex items-center space-x-2">
                                            <span className="text-amber-600">
                                                ⚠
                                            </span>
                                            <span>
                                                No shared content detected
                                            </span>
                                        </div>
                                    )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Selected Communities */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                            Posting to Communities
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {selectedCommunities.map((community) => (
                                <Badge
                                    key={community.id}
                                    variant="secondary"
                                    className="text-sm"
                                >
                                    {community.name}
                                    {community.organization && (
                                        <span className="text-muted-foreground ml-1">
                                            ({community.organization.name})
                                        </span>
                                    )}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Title Input */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Post Title</CardTitle>
                        <CardDescription>
                            Give your post a descriptive title
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter post title..."
                            className="text-lg"
                        />
                    </CardContent>
                </Card>

                {/* Content Preview */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Content</CardTitle>
                        <CardDescription>
                            This content will be posted to the selected
                            communities
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Content Preview with Clickable Links */}
                        <div className="bg-muted/20 rounded-lg border p-4">
                            <div className="mb-2 flex items-center space-x-2">
                                <span className="text-muted-foreground text-sm font-medium">
                                    Preview (with clickable links):
                                </span>
                            </div>
                            <div
                                className="text-sm whitespace-pre-wrap [&_a]:break-all [&_a]:text-blue-600 [&_a]:hover:underline"
                                dangerouslySetInnerHTML={{
                                    __html: sanitizeHtml(
                                        convertUrlsToHtmlLinks(content),
                                    ),
                                }}
                            />
                        </div>

                        {/* Editable Content */}
                        <div>
                            <Label
                                htmlFor="content"
                                className="text-sm font-medium"
                            >
                                Edit Content:
                            </Label>
                            <Textarea
                                id="content"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder={
                                    sharedData.title ||
                                    sharedData.text ||
                                    sharedData.url
                                        ? 'Content from shared data will appear here...'
                                        : 'Enter post content...'
                                }
                                rows={6}
                                className="mt-2 resize-none"
                            />
                        </div>

                        {/* Link Preview */}
                        {sharedData.url && (
                            <div className="bg-muted/50 rounded-lg border p-4">
                                <div className="mb-2 flex items-center space-x-2">
                                    <Link className="text-muted-foreground h-4 w-4" />
                                    <span className="text-sm font-medium">
                                        Link Preview
                                    </span>
                                    {isLoadingPreview && (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    )}
                                </div>

                                {linkPreview ? (
                                    <div className="space-y-2">
                                        <div className="flex items-start justify-between">
                                            <div className="min-w-0 flex-1">
                                                <h4 className="line-clamp-2 text-sm font-medium">
                                                    {linkPreview.title}
                                                </h4>
                                                {linkPreview.description && (
                                                    <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                                                        {
                                                            linkPreview.description
                                                        }
                                                    </p>
                                                )}
                                                <p className="text-muted-foreground mt-1 text-xs">
                                                    {linkPreview.domain}
                                                </p>
                                            </div>
                                            {linkPreview.image && (
                                                <img
                                                    src={linkPreview.image}
                                                    alt="Preview"
                                                    className="ml-2 h-16 w-16 rounded object-cover"
                                                />
                                            )}
                                        </div>
                                        <a
                                            href={sharedData.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center text-xs text-blue-600 hover:underline"
                                        >
                                            {sharedData.url}
                                            <ExternalLink className="ml-1 h-3 w-3" />
                                        </a>
                                    </div>
                                ) : (
                                    <div className="text-muted-foreground text-sm">
                                        <a
                                            href={sharedData.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center text-blue-600 hover:underline"
                                        >
                                            {sharedData.url}
                                            <ExternalLink className="ml-1 h-3 w-3" />
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Navigation */}
            <div className="fixed bottom-4 left-4 z-50">
                <Button
                    variant="outline"
                    onClick={onBack}
                    disabled={isSubmitting}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
            </div>
            <div className="fixed right-4 bottom-4 z-50">
                <Button
                    onClick={handleSubmit}
                    disabled={!title.trim() || isSubmitting}
                    className="min-w-24"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                        </>
                    ) : (
                        'Create Post'
                    )}
                </Button>
            </div>
        </>
    );
}
