import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

// R2 Configuration
function getR2Config() {
    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME;

    if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName) {
        throw new Error(
            'R2 environment variables are not properly configured. Please check R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME.',
        );
    }

    return {
        endpoint,
        accessKeyId,
        secretAccessKey,
        bucketName,
    };
}

function createR2Client() {
    const config = getR2Config();
    return new S3Client({
        region: 'auto',
        endpoint: config.endpoint,
        credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
        },
    });
}

// Generate presigned upload URL for images
export async function generatePresignedUploadUrl(
    key: string,
    contentType: string,
    expiryMinutes: number = 15,
): Promise<string> {
    const config = getR2Config();
    const r2Client = createR2Client();
    const command = new PutObjectCommand({
        Bucket: config.bucketName,
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
    const config = getR2Config();
    const r2Client = createR2Client();
    const command = new GetObjectCommand({
        Bucket: config.bucketName,
        Key: key,
    });

    return await getSignedUrl(r2Client, command, {
        expiresIn: expiryMinutes * 60,
    });
}

// Validate attachment file (images and videos)
export function validateAttachmentFile(file: File): {
    valid: boolean;
    error?: string;
    type: 'image' | 'video';
} {
    const allowedImageTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
    ];
    const allowedVideoTypes = [
        'video/mp4',
        // 'video/webm', // Disabled for better iOS compatibility
        'video/quicktime', // Allow .mov (iOS-friendly). Android support may vary.
    ];

    const maxImageSize = 15 * 1024 * 1024; // 15MB
    const maxVideoSize = 50 * 1024 * 1024; // 50MB

    // Check if it's an image
    if (allowedImageTypes.includes(file.type)) {
        if (file.size > maxImageSize) {
            return {
                valid: false,
                error: 'Image file size too large. Maximum size is 15MB.',
                type: 'image',
            };
        }
        return {
            valid: true,
            type: 'image',
        };
    }

    // Check if it's a video
    if (allowedVideoTypes.includes(file.type)) {
        if (file.size > maxVideoSize) {
            return {
                valid: false,
                error: 'Video file size too large. Maximum size is 50MB.',
                type: 'video',
            };
        }
        return {
            valid: true,
            type: 'video',
        };
    }

    // Invalid file type
    return {
        valid: false,
        error: 'Invalid file type. Only JPEG, PNG, GIF, WebP images and MP4 or MOV videos are allowed.',
        type: 'image', // fallback
    };
}

// Validate image file (keep for backward compatibility)
export function validateImageFile(file: File): {
    valid: boolean;
    error?: string;
} {
    const result = validateAttachmentFile(file);
    if (result.type !== 'image') {
        return {
            valid: false,
            error: 'Invalid file type. Only images are allowed.',
        };
    }
    return {
        valid: result.valid,
        error: result.error,
    };
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
