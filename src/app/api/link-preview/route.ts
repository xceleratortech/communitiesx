import { NextRequest, NextResponse } from 'next/server';

export interface LinkPreview {
    title?: string;
    description?: string;
    image?: string;
    url: string;
    domain: string;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const url = searchParams.get('url');

        if (!url) {
            return NextResponse.json(
                { error: 'URL parameter is required' },
                { status: 400 },
            );
        }

        // Validate URL format
        try {
            new URL(url);
        } catch {
            return NextResponse.json(
                { error: 'Invalid URL format' },
                { status: 400 },
            );
        }

        // Fetch the URL content
        const response = await fetch(url, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (compatible; CommunityX-LinkPreview/1.0)',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            // Add timeout to prevent hanging requests
            signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();

        // Parse the HTML to extract meta tags
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const getMetaContent = (propName: string) => {
            return doc
                .querySelector(
                    `meta[property="${propName}"], meta[name="${propName}"]`,
                )
                ?.getAttribute('content');
        };
        const title = doc.querySelector('title')?.textContent?.trim() || '';
        const description = getMetaContent('description')?.trim() || '';
        const image =
            (
                getMetaContent('og:image') || getMetaContent('twitter:image')
            )?.trim() || '';

        // Extract domain from URL
        const domain = new URL(url).hostname;

        const linkPreview: LinkPreview = {
            title: title || domain,
            description,
            image,
            url,
            domain,
        };

        return NextResponse.json(linkPreview);
    } catch (error) {
        console.error('Error fetching link preview:', error);

        // If we have a URL, return basic info even if preview fails
        const url = new URL(request.url).searchParams.get('url');
        if (url) {
            try {
                const domain = new URL(url).hostname;
                return NextResponse.json({
                    title: domain,
                    description: '',
                    image: '',
                    url,
                    domain,
                });
            } catch {
                // If URL is invalid, return error
            }
        }

        return NextResponse.json(
            { error: 'Failed to fetch link preview' },
            { status: 500 },
        );
    }
}
