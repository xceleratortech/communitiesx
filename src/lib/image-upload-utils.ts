import { generateImageKey, validateImageFile } from './r2';

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

export async function uploadImageWithPresignedFlow(
    file: File,
    userEmail: string,
    options: ImageUploadOptions = {},
): Promise<ImageUploadResult> {
    // Validate the image file
    const validation = validateImageFile(file);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    // Generate file key
    const key = generateImageKey(
        userEmail,
        file.name,
        options.communityId,
        options.communitySlug,
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
        throw new Error(`Failed to upload image: ${error}`);
    }

    // Confirm upload and save metadata
    const confirmResponse = await fetch('/api/images/confirm-upload', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: key,
            url: presignedUrl,
            postId: options.postId,
            communityId: options.communityId,
        }),
    });

    if (!confirmResponse.ok) {
        const error = await confirmResponse.text();
        throw new Error(`Failed to confirm upload: ${error}`);
    }

    const { image } = await confirmResponse.json();
    return image;
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
