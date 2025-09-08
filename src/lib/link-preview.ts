export interface LinkPreview {
    title?: string;
    description?: string;
    image?: string;
    url: string;
    domain: string;
}

export async function fetchLinkPreview(url: string): Promise<LinkPreview> {
    try {
        // Use our secure server-side API endpoint
        const response = await fetch(
            `/api/link-preview?url=${encodeURIComponent(url)}`,
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch link preview: ${response.status}`);
        }

        const linkPreview = await response.json();
        return linkPreview;
    } catch (error) {
        console.error('Error fetching link preview:', error);

        // Return basic info if preview fails
        try {
            const domain = new URL(url).hostname;
            return {
                title: domain,
                description: '',
                image: '',
                url,
                domain,
            };
        } catch {
            // If URL is invalid, return a fallback
            return {
                title: 'Invalid URL',
                description: '',
                image: '',
                url,
                domain: 'unknown',
            };
        }
    }
}

export function isValidUrl(string: string): boolean {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}
