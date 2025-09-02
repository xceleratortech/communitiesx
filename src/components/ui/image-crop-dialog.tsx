'use client';

import React, { useState, useRef, useCallback } from 'react';
import ReactCrop, {
    centerCrop,
    makeAspectCrop,
    type Crop,
    type PixelCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ImageCropDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onCropComplete: (croppedFile: File) => void;
    imageFile: File;
    aspectRatio?: number;
    title?: string;
    description?: string;
}

// Helper function to center the crop
function centerAspectCrop(
    mediaWidth: number,
    mediaHeight: number,
    aspect: number,
): Crop {
    return centerCrop(
        makeAspectCrop(
            {
                unit: '%',
                width: 80,
                height: 80,
            },
            aspect,
            mediaWidth,
            mediaHeight,
        ),
        mediaWidth,
        mediaHeight,
    );
}

// Function to get cropped image as data URL
function getCroppedImg(image: HTMLImageElement, crop: PixelCrop): string {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;

    const ctx = canvas.getContext('2d');

    if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
            image,
            crop.x * scaleX,
            crop.y * scaleY,
            crop.width * scaleX,
            crop.height * scaleY,
            0,
            0,
            crop.width * scaleX,
            crop.height * scaleY,
        );
    }

    return canvas.toDataURL('image/png', 1.0);
}

export function ImageCropDialog({
    isOpen,
    onClose,
    onCropComplete,
    imageFile,
    aspectRatio = 1,
    title = 'Crop Image',
    description = 'Adjust the crop area and click Apply to continue.',
}: ImageCropDialogProps) {
    const imgRef = useRef<HTMLImageElement | null>(null);
    const [crop, setCrop] = useState<Crop>();
    const [croppedImageUrl, setCroppedImageUrl] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    const onImageLoad = useCallback(
        (e: React.SyntheticEvent<HTMLImageElement>) => {
            if (aspectRatio && !imageLoaded) {
                const { width, height } = e.currentTarget;
                const initialCrop = centerAspectCrop(
                    width,
                    height,
                    aspectRatio,
                );
                setCrop(initialCrop);
                setImageLoaded(true);
            }
        },
        [aspectRatio, imageLoaded],
    );

    const handleCropComplete = useCallback((crop: PixelCrop) => {
        if (imgRef.current && crop.width && crop.height) {
            const croppedImageUrl = getCroppedImg(imgRef.current, crop);
            setCroppedImageUrl(croppedImageUrl);
        }
    }, []);

    const handleApplyCrop = useCallback(async () => {
        if (!croppedImageUrl) {
            toast.error('Please select a crop area');
            return;
        }

        try {
            setIsProcessing(true);

            // Convert base64 data URL to Blob
            const response = await fetch(croppedImageUrl);
            const blob = await response.blob();

            // Create a new File from the blob
            const croppedFile = new File([blob], imageFile.name, {
                type: imageFile.type,
                lastModified: Date.now(),
            });

            onCropComplete(croppedFile);
            onClose();
        } catch (error) {
            console.error('Error cropping image:', error);
            toast.error('Failed to crop image. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    }, [croppedImageUrl, imageFile, onCropComplete, onClose]);

    const handleClose = useCallback(() => {
        setCrop(undefined);
        setCroppedImageUrl('');
        setImageLoaded(false);
        onClose();
    }, [onClose]);

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {description}
                        <br />
                        <span className="text-muted-foreground text-xs">
                            Drag the corners or edges to adjust the crop area.
                            The crop will maintain the{' '}
                            {aspectRatio === 1
                                ? 'square'
                                : aspectRatio > 1
                                  ? 'landscape'
                                  : 'portrait'}{' '}
                            aspect ratio.
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex justify-center">
                        <div className="w-full max-w-2xl">
                            <ReactCrop
                                crop={crop}
                                onChange={(_, percentCrop) => {
                                    if (
                                        percentCrop &&
                                        percentCrop.width > 0 &&
                                        percentCrop.height > 0
                                    ) {
                                        setCrop(percentCrop);
                                    }
                                }}
                                onComplete={handleCropComplete}
                                aspect={aspectRatio}
                                className="w-full"
                                keepSelection
                            >
                                <img
                                    ref={imgRef}
                                    alt="Crop me"
                                    src={URL.createObjectURL(imageFile)}
                                    style={{
                                        maxHeight: '60vh',
                                        maxWidth: '100%',
                                        display: 'block',
                                    }}
                                    onLoad={onImageLoad}
                                />
                            </ReactCrop>
                        </div>
                    </div>

                    {croppedImageUrl && (
                        <div className="text-center">
                            <p className="text-muted-foreground mb-2 text-sm">
                                Preview of cropped image:
                            </p>
                            <img
                                src={croppedImageUrl}
                                alt="Cropped preview"
                                className="mx-auto max-h-32 rounded-lg border"
                            />
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={isProcessing}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleApplyCrop}
                        disabled={isProcessing || !croppedImageUrl}
                    >
                        {isProcessing ? 'Processing...' : 'Apply Crop'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
