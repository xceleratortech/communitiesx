'use client';

import React, { useState, useRef } from 'react';
import { useTypedSession } from '@/server/auth/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Camera, Upload, X } from 'lucide-react';
import { trpc } from '@/providers/trpc-provider';

interface ProfilePictureUploadProps {
    currentImageUrl?: string | null;
    userName?: string;
    onImageUpdate?: (imageUrl: string) => void;
}

export function ProfilePictureUpload({
    currentImageUrl,
    userName,
    onImageUpdate,
}: ProfilePictureUploadProps) {
    const { data: session } = useTypedSession();
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(
        currentImageUrl || null,
    );
    const fileInputRef = useRef<HTMLInputElement>(null);

    const updateProfilePicture = trpc.profiles.updateProfilePicture.useMutation(
        {
            onSuccess: (data: {
                success: boolean;
                imageUrl: string | null;
            }) => {
                toast.success('Profile picture updated successfully');
                if (onImageUpdate && data.imageUrl) {
                    onImageUpdate(data.imageUrl);
                }
            },
            onError: (error: { message?: string }) => {
                toast.error(
                    error.message || 'Failed to update profile picture',
                );
            },
        },
    );

    // Show current image from session if available
    const displayImageUrl = previewUrl || currentImageUrl;

    const handleFileSelect = async (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
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

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size must be less than 5MB');
            return;
        }

        try {
            setIsUploading(true);

            // Generate file key for profile picture
            const fileExtension = file.name.split('.').pop();
            const key = `${session.user.email.toLowerCase()}/profile-pictures/${Date.now()}.${fileExtension}`;

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

            // Update profile picture in database
            const updateResult = await updateProfilePicture.mutateAsync({
                imageUrl: `/api/images/${result.attachment.id}`,
            });

            // Update preview
            const newImageUrl = `/api/images/${result.attachment.id}`;
            setPreviewUrl(newImageUrl);

            // Notify parent component of the update
            if (onImageUpdate) {
                onImageUpdate(newImageUrl);
            }

            // Force refresh the session to get updated user data
            // This ensures the profile picture shows up immediately and persists
            setTimeout(() => {
                window.location.reload();
            }, 1000); // Small delay to allow user to see the success message
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to upload profile picture. Please try again.',
            );
        } finally {
            setIsUploading(false);
            // Reset the file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemovePicture = async () => {
        try {
            await updateProfilePicture.mutateAsync({
                imageUrl: null,
            });
            setPreviewUrl(null);
            if (onImageUpdate) {
                onImageUpdate('');
            }
            toast.success('Profile picture removed');

            // Force refresh the session to get updated user data
            setTimeout(() => {
                window.location.reload();
            }, 1000); // Small delay to allow user to see the success message
        } catch (error) {
            toast.error('Failed to remove profile picture');
        }
    };

    // Show remove button only if there's an image to remove
    const hasImage = displayImageUrl || previewUrl;

    const getInitials = (name?: string) => {
        if (!name) return 'U';
        return name
            .split(' ')
            .map((word) => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="flex flex-col items-center space-y-4">
            <div className="relative">
                <Avatar className="h-24 w-24">
                    <AvatarImage
                        src={displayImageUrl || undefined}
                        alt={userName || 'Profile picture'}
                    />
                    <AvatarFallback className="text-lg font-semibold">
                        {getInitials(userName)}
                    </AvatarFallback>
                </Avatar>

                {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white"></div>
                    </div>
                )}
            </div>

            <div className="flex w-full max-w-xs flex-col space-y-2">
                <Label
                    htmlFor="profile-picture"
                    className="text-center text-sm font-medium"
                >
                    Profile Picture
                </Label>

                <div className="flex space-x-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex-1"
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        {isUploading ? 'Uploading...' : 'Upload'}
                    </Button>

                    {hasImage && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRemovePicture}
                            disabled={isUploading}
                            className="px-3"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                <Input
                    ref={fileInputRef}
                    id="profile-picture"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                />

                <p className="text-muted-foreground text-center text-xs">
                    JPG, PNG, GIF up to 5MB
                </p>
            </div>
        </div>
    );
}
