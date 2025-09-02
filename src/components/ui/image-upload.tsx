'use client';

import React, { useState, useRef } from 'react';
import { useTypedSession } from '@/server/auth/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, X, ImageIcon, Link as LinkIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageCropDialog } from './image-crop-dialog';

interface ImageUploadProps {
    currentImageUrl?: string | null;
    onImageUpdate?: (imageUrl: string | null) => void;
    label?: string;
    placeholder?: string;
    description?: string;
    maxSize?: number; // in MB
    acceptedTypes?: string[];
    className?: string;
    enableCropping?: boolean;
    cropAspectRatio?: number;
}

export function ImageUpload({
    currentImageUrl,
    onImageUpdate,
    label = 'Image',
    placeholder = 'https://example.com/image.png',
    description,
    maxSize = 5,
    acceptedTypes = ['image/*'],
    className = '',
    enableCropping = true,
    cropAspectRatio = 1,
}: ImageUploadProps) {
    const { data: session } = useTypedSession();
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(
        currentImageUrl || null,
    );
    const [urlInput, setUrlInput] = useState(currentImageUrl || '');
    const [cropDialogOpen, setCropDialogOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const displayImageUrl = previewUrl || currentImageUrl;

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!session?.user?.email) {
            toast.error('You must be logged in to upload files');
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        // Validate file size
        if (file.size > maxSize * 1024 * 1024) {
            toast.error(`File size must be less than ${maxSize}MB`);
            return;
        }

        // If cropping is enabled, show crop dialog
        if (enableCropping) {
            setSelectedFile(file);
            setCropDialogOpen(true);
        } else {
            // Upload directly without cropping
            uploadFile(file);
        }

        // Reset the file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const uploadFile = async (file: File) => {
        if (!session?.user?.email) {
            toast.error('You must be logged in to upload files');
            return;
        }

        try {
            setIsUploading(true);

            // Generate file key for community images
            const fileExtension = file.name.split('.').pop();
            const key = `${session.user.email.toLowerCase()}/community-images/${Date.now()}.${fileExtension}`;

            // Get presigned URL
            const presignedResponse = await fetch(
                `/api/images/presigned-url?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(file.type)}`,
            );

            if (!presignedResponse.ok) {
                const error = await presignedResponse.text();
                throw new Error(`Failed to get presigned URL: ${error}`);
            }

            const { url: presignedUrl } = await presignedResponse.json();

            // Create proxy URL
            const proxyUrl = `https://edx-storage-proxy.xcelerator.co.in?proxyUrl=${encodeURIComponent(presignedUrl)}`;

            // Upload directly to proxy (bypassing Vercel's 5MB limit)
            const uploadResponse = await fetch(proxyUrl, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type,
                },
            });

            if (!uploadResponse.ok) {
                const error = await uploadResponse.text();
                throw new Error(`Failed to upload file: ${error}`);
            }

            // Confirm upload
            const confirmResponse = await fetch('/api/images/confirm-upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: key,
                    url: presignedUrl,
                    mimetype: file.type,
                    type: 'image',
                }),
            });

            if (!confirmResponse.ok) {
                const error = await confirmResponse.text();
                throw new Error(`Failed to confirm upload: ${error}`);
            }

            const result = await confirmResponse.json();

            // Update image URL
            const newImageUrl = `/api/images/${result.attachment.id}`;
            setPreviewUrl(newImageUrl);
            setUrlInput(newImageUrl);

            // Notify parent component of the update
            if (onImageUpdate) {
                onImageUpdate(newImageUrl);
            }

            toast.success('Image uploaded successfully');
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to upload image. Please try again.',
            );
        } finally {
            setIsUploading(false);
        }
    };

    const handleCropComplete = (croppedFile: File) => {
        uploadFile(croppedFile);
    };

    const handleUrlChange = (url: string) => {
        setUrlInput(url);
        setPreviewUrl(url);
        if (onImageUpdate) {
            onImageUpdate(url || null);
        }
    };

    const handleRemoveImage = () => {
        setPreviewUrl(null);
        setUrlInput('');
        if (onImageUpdate) {
            onImageUpdate(null);
        }
        toast.success('Image removed');
    };

    const hasImage = displayImageUrl;

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="space-y-2">
                <Label className="text-sm font-medium">{label}</Label>
                {description && (
                    <p className="text-muted-foreground text-sm">
                        {description}
                    </p>
                )}
            </div>

            <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger
                        value="upload"
                        className="flex items-center gap-2"
                    >
                        <Upload className="h-4 w-4" />
                        Upload
                    </TabsTrigger>
                    <TabsTrigger
                        value="url"
                        className="flex items-center gap-2"
                    >
                        <LinkIcon className="h-4 w-4" />
                        URL
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="flex-1"
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            {isUploading ? 'Uploading...' : 'Choose File'}
                        </Button>

                        {hasImage && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleRemoveImage}
                                disabled={isUploading}
                                className="px-3"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>

                    <Input
                        ref={fileInputRef}
                        type="file"
                        accept={acceptedTypes.join(',')}
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    <p className="text-muted-foreground text-xs">
                        JPG, PNG, GIF up to {maxSize}MB
                    </p>
                </TabsContent>

                <TabsContent value="url" className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder={placeholder}
                            value={urlInput}
                            onChange={(e) => handleUrlChange(e.target.value)}
                            className="flex-1"
                        />
                        <ImageIcon className="text-muted-foreground h-5 w-5" />
                    </div>

                    {hasImage && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRemoveImage}
                            className="w-full"
                        >
                            <X className="mr-2 h-4 w-4" />
                            Remove Image
                        </Button>
                    )}
                </TabsContent>
            </Tabs>

            {hasImage && (
                <div className="mt-4">
                    <div className="relative overflow-hidden rounded-lg border">
                        <img
                            src={displayImageUrl}
                            alt="Preview"
                            className="h-32 w-full object-cover"
                        />
                        {isUploading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white"></div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Image Crop Dialog */}
            {selectedFile && (
                <ImageCropDialog
                    isOpen={cropDialogOpen}
                    onClose={() => {
                        setCropDialogOpen(false);
                        setSelectedFile(null);
                    }}
                    onCropComplete={handleCropComplete}
                    imageFile={selectedFile}
                    aspectRatio={cropAspectRatio}
                    title={`Crop ${label}`}
                    description="Adjust the crop area and click Apply to continue."
                />
            )}
        </div>
    );
}
