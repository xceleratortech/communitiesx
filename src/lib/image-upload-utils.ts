import { validateAttachmentFile, generateImageKey } from '@/lib/r2';

export interface ImageUploadOptions {
    postId?: number;
    communityId?: number;
    communitySlug?: string;
}

export interface ImageUploadResult {
    id: number;
    filename: string;
    size: number;
    mimetype: string;
    key: string;
    url: string;
}

export interface UploadResult {
    id: number;
    filename: string;
    size: number;
    mimetype: string;
    type: 'image' | 'video';
    key: string;
    url: string;
    thumbnailUrl?: string | null;
}

export async function uploadAttachmentWithPresignedFlow(
    file: File,
    userEmail: string,
    options?: {
        postId?: number;
        communityId?: number;
        communitySlug?: string;
    },
): Promise<UploadResult> {
    // Validate file
    const validation = validateAttachmentFile(file);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    // For videos that need format conversion, rename to .mp4 for better compatibility
    let filename = file.name;
    if (validation.type === 'video') {
        const videoFormats = [
            'video/quicktime',
            'video/mov',
            'video/avi',
            'video/webm',
            'video/x-msvideo',
            'video/3gpp',
            'video/x-ms-wmv',
            'video/ogg',
        ];
        if (videoFormats.includes(file.type)) {
            // Change extension to .mp4 for better web compatibility
            filename = filename.replace(/\.[^/.]+$/, '.mp4');
        }
    }

    // Generate file key with potentially modified filename
    const key = generateImageKey(
        userEmail,
        filename,
        options?.communityId,
        options?.communitySlug,
    );

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
            postId: options?.postId,
            communityId: options?.communityId,
            mimetype: file.type,
            type: validation.type,
        }),
    });

    if (!confirmResponse.ok) {
        const error = await confirmResponse.text();
        throw new Error(`Failed to confirm upload: ${error}`);
    }

    const result = await confirmResponse.json();
    return result.attachment;
}

// Keep the old function for backward compatibility
export async function uploadImageWithPresignedFlow(
    file: File,
    userEmail: string,
    options?: {
        postId?: number;
        communityId?: number;
        communitySlug?: string;
    },
): Promise<UploadResult> {
    // Validate that it's an image
    const validation = validateAttachmentFile(file);
    if (!validation.valid || validation.type !== 'image') {
        throw new Error('Only image files are allowed');
    }

    return uploadAttachmentWithPresignedFlow(file, userEmail, options);
}

// React hook for image upload
export function useImageUpload() {
    const uploadImage = async (
        file: File,
        userEmail: string,
        options: ImageUploadOptions = {},
    ): Promise<ImageUploadResult> => {
        return await uploadImageWithPresignedFlow(file, userEmail, options);
    };

    return { uploadImage };
}
