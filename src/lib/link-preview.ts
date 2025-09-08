export interface LinkPreview {
    title?: string;
    description?: string;
    image?: string;
    url: string;
    domain: string;
}

export async function fetchLinkPreview(url: string): Promise<LinkPreview> {
    try {
        // Use a CORS proxy to fetch the page content
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);

        if (!response.ok) {
            throw new Error('Failed to fetch URL');
        }

        const html = await response.text();

        // Parse the HTML to extract meta tags
        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        const descriptionMatch = html.match(
            /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i,
        );
        const imageMatch =
            html.match(
                /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i,
            ) ||
            html.match(
                /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']*)["']/i,
            );

        const title = titleMatch?.[1]?.trim() || '';
        const description = descriptionMatch?.[1]?.trim() || '';
        const image = imageMatch?.[1]?.trim() || '';

        // Extract domain from URL
        const domain = new URL(url).hostname;

        return {
            title: title || domain,
            description,
            image,
            url,
            domain,
        };
    } catch (error) {
        console.error('Error fetching link preview:', error);

        // Return basic info if preview fails
        const domain = new URL(url).hostname;
        return {
            title: domain,
            description: '',
            image: '',
            url,
            domain,
        };
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
