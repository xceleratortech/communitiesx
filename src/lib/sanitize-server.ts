// Server-only sanitization helpers (no React/hooks)

import sanitizeHtmlLib from 'sanitize-html';

/**
 * Comprehensive HTML sanitizer using sanitize-html library for robust XSS protection.
 * Allows safe HTML tags commonly used by TipTap editor while blocking dangerous content.
 */
export function sanitizeHtml(html: string): string {
    if (!html || typeof html !== 'string') return '';

    return sanitizeHtmlLib(html, {
        // Allowed tags - common safe HTML tags used by TipTap
        allowedTags: [
            'p',
            'br',
            'strong',
            'em',
            'u',
            's',
            'strike',
            'h1',
            'h2',
            'h3',
            'h4',
            'h5',
            'h6',
            'ul',
            'ol',
            'li',
            'blockquote',
            'code',
            'pre',
            'a',
            'img',
            'div',
            'span',
            'hr',
        ],
        // Allowed attributes per tag
        allowedAttributes: {
            a: ['href', 'title', 'target', 'rel'],
            img: ['src', 'alt', 'title', 'width', 'height', 'class'],
            div: ['class', 'id'],
            span: ['class', 'id'],
            p: ['class'],
            h1: ['class'],
            h2: ['class'],
            h3: ['class'],
            h4: ['class'],
            h5: ['class'],
            h6: ['class'],
            code: ['class'],
            pre: ['class'],
            blockquote: ['class'],
        },
        // Transform URLs to ensure they're safe
        allowedSchemes: ['http', 'https', 'mailto'],
        // Allow data URIs only for images (base64 encoded images)
        allowedSchemesByTag: {
            img: ['http', 'https', 'data'],
        },
        // Transform attributes to sanitize URLs
        transformTags: {
            a: (tagName, attribs) => {
                // Ensure href is safe - block javascript: and data: URLs
                if (attribs.href) {
                    const href = attribs.href.trim().toLowerCase();
                    if (
                        href.startsWith('javascript:') ||
                        href.startsWith('data:') ||
                        href.startsWith('vbscript:') ||
                        href.startsWith('file:')
                    ) {
                        delete attribs.href;
                    } else {
                        // Add rel="noopener noreferrer" for external links
                        if (href.startsWith('http')) {
                            attribs.rel = 'noopener noreferrer';
                            attribs.target = attribs.target || '_blank';
                        }
                    }
                }
                return { tagName, attribs };
            },
            img: (tagName, attribs) => {
                // Ensure src is safe
                if (attribs.src) {
                    const src = attribs.src.trim().toLowerCase();
                    // Allow data URIs only for base64 images
                    if (src.startsWith('data:')) {
                        if (!src.startsWith('data:image/')) {
                            delete attribs.src;
                        }
                    } else if (
                        src.startsWith('javascript:') ||
                        src.startsWith('vbscript:') ||
                        src.startsWith('file:')
                    ) {
                        delete attribs.src;
                    }
                }
                return { tagName, attribs };
            },
        },
        // Remove all style attributes and style tags
        allowedStyles: {},
        // Disallow all iframe, script, object, embed tags
        disallowedTagsMode: 'discard',
        // Remove empty tags
        exclusiveFilter: (frame) => {
            // Remove empty p tags
            if (frame.tag === 'p' && !frame.text.trim()) {
                return true;
            }
            return false;
        },
    });
}

export function isHtmlSafe(html: string): boolean {
    if (!html) return true;
    const sanitized = sanitizeHtml(html);
    return sanitized.length > 0 || html.length === 0;
}

export function getHtmlPreview(html: string, maxLength: number = 100): string {
    const sanitized = sanitizeHtml(html);
    const textOnly = sanitized.replace(/<[^>]*>/g, '');
    if (textOnly.length <= maxLength) return textOnly;
    return textOnly.substring(0, maxLength) + '...';
}
