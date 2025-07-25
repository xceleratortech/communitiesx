import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

// R2 Configuration
const r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;

// Generate presigned upload URL for images
export async function generatePresignedUploadUrl(
    key: string,
    contentType: string,
    expiryMinutes: number = 15,
): Promise<string> {
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: contentType,
    });

    return await getSignedUrl(r2Client, command, {
        expiresIn: expiryMinutes * 60,
    });
}

// Generate presigned download URL for images
export async function generatePresignedDownloadUrl(
    key: string,
    expiryMinutes: number = 60,
): Promise<string> {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });

    return await getSignedUrl(r2Client, command, {
        expiresIn: expiryMinutes * 60,
    });
}

// Validate image file
export function validateImageFile(file: File): {
    valid: boolean;
    error?: string;
} {
    const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
    ];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.',
        };
    }

    if (file.size > maxSize) {
        return {
            valid: false,
            error: 'File size too large. Maximum size is 5MB.',
        };
    }

    return { valid: true };
}

// Sanitize filename
export function sanitizeFilename(filename: string): string {
    return filename
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_{2,}/g, '_')
        .toLowerCase();
}

// Generate file key for images
export function generateImageKey(
    userEmail: string,
    filename: string,
    communityId?: number,
    communitySlug?: string,
): string {
    const sanitizedFilename = sanitizeFilename(filename);
    const timestamp = Date.now();

    if (communityId && communitySlug) {
        return `${userEmail}/communityId=${communityId}&communitySlug=${communitySlug}/${timestamp}_${sanitizedFilename}`;
    }

    return `${userEmail}/${timestamp}_${sanitizedFilename}`;
}
