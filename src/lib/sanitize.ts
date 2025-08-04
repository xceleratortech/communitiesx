import React from 'react';
import DOMPurify from 'dompurify';

// Configure DOMPurify with safe options for rich text content
const purifyConfig = {
    ALLOWED_TAGS: [
        // Basic text formatting
        'p',
        'br',
        'div',
        'span',
        // Headings
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        // Text styling
        'strong',
        'b',
        'em',
        'i',
        'u',
        's',
        'strike',
        // Lists
        'ul',
        'ol',
        'li',
        // Links
        'a',
        // Code
        'code',
        'pre',
        // Blockquotes
        'blockquote',
        // Images (with restrictions)
        'img',
        // Videos
        'video',
        // iframes for trusted embeds (YouTube)
        'iframe',
    ],
    ALLOWED_ATTRS: [
        // Links
        'href',
        'target',
        'rel',
        // Images
        'src',
        'alt',
        'title',
        'width',
        'height',
        // Videos
        'controls',
        'autoplay',
        'muted',
        'loop',
        'poster',
        // iframe attributes for YouTube embeds
        'frameborder',
        'allowfullscreen',
        'allow',
        'data-youtube-video',
        // Basic styling (if needed)
        'class',
        'style',
    ],
    ALLOWED_URI_REGEXP:
        /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+\.\-]+(?:[^a-z+\.\-:]|$))/i,
    FORBID_TAGS: [
        'script',
        'object',
        'embed',
        'form',
        'input',
        'textarea',
        'select',
        'button',
        'meta',
        'link',
        'style',
        'title',
        'head',
        'body',
        'html',
    ],
    FORBID_ATTR: [
        'onerror',
        'onload',
        'onclick',
        'onmouseover',
        'onmouseout',
        'onfocus',
        'onblur',
        'onchange',
        'onsubmit',
        'onreset',
        'onselect',
        'onunload',
        'onabort',
        'onbeforeunload',
        'onerror',
        'onhashchange',
        'onmessage',
        'onoffline',
        'ononline',
        'onpagehide',
        'onpageshow',
        'onpopstate',
        'onresize',
        'onstorage',
        'oncontextmenu',
        'onkeydown',
        'onkeypress',
        'onkeyup',
        'onmousedown',
        'onmousemove',
        'onmouseup',
        'onwheel',
        'oncopy',
        'oncut',
        'onpaste',
        'onbeforecopy',
        'onbeforecut',
        'onbeforepaste',
        'onsearch',
        'onselectstart',
        'onstop',
        'onhelp',
        'onreadystatechange',
        'onbeforeprint',
        'onafterprint',
        'onbeforeeditfocus',
        'onblur',
        'onchange',
        'oncontextmenu',
        'oncontrolselect',
        'oncopy',
        'oncut',
        'ondataavailable',
        'ondatasetchanged',
        'ondatasetcomplete',
        'ondblclick',
        'ondeactivate',
        'ondrag',
        'ondragend',
        'ondragenter',
        'ondragleave',
        'ondragover',
        'ondragstart',
        'ondrop',
        'onerrorupdate',
        'onfilterchange',
        'onfocus',
        'onfocusin',
        'onfocusout',
        'onhelp',
        'onkeydown',
        'onkeypress',
        'onkeyup',
        'onlayoutcomplete',
        'onload',
        'onlosecapture',
        'onmousedown',
        'onmouseenter',
        'onmouseleave',
        'onmousemove',
        'onmouseout',
        'onmouseover',
        'onmouseup',
        'onmousewheel',
        'onmove',
        'onmoveend',
        'onmovestart',
        'onpaste',
        'onpropertychange',
        'onreadystatechange',
        'onreset',
        'onresize',
        'onresizeend',
        'onresizestart',
        'onrowenter',
        'onrowexit',
        'onrowsdelete',
        'onrowsinserted',
        'onscroll',
        'onselect',
        'onselectionchange',
        'onselectstart',
        'onstart',
        'onstop',
        'onsubmit',
        'onunload',
    ],
};

/**
 * Safely sanitize HTML content to prevent XSS attacks
 * @param html - The HTML content to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string): string {
    if (!html || typeof html !== 'string') {
        return '';
    }

    try {
        // Add a hook to only allow YouTube iframes
        DOMPurify.addHook(
            'beforeSanitizeElements',
            function (node: any, data: any) {
                // Check if node and data exist and are valid
                if (!node || !data || typeof data.tagName !== 'string') {
                    return;
                }

                if (data.tagName === 'iframe') {
                    // Type assertion for Element methods
                    const element = node as Element;
                    const src = element.getAttribute?.('src');
                    if (!src) {
                        try {
                            element.remove?.();
                        } catch (e) {
                            // Fallback: mark for removal by parent
                            if (element.parentNode) {
                                element.parentNode.removeChild(element);
                            }
                        }
                        return;
                    }

                    // Only allow YouTube and YouTube-nocookie domains
                    const allowedDomains = [
                        'https://www.youtube.com',
                        'https://youtube.com',
                        'https://www.youtube-nocookie.com',
                        'https://youtube-nocookie.com',
                    ];

                    const isAllowed = allowedDomains.some((domain) =>
                        src.startsWith(domain + '/embed/'),
                    );

                    if (!isAllowed) {
                        try {
                            element.remove?.();
                        } catch (e) {
                            // Fallback: mark for removal by parent
                            if (element.parentNode) {
                                element.parentNode.removeChild(element);
                            }
                        }
                    }
                }
            },
        );

        // Sanitize the HTML content
        const sanitized = DOMPurify.sanitize(html, purifyConfig);

        // Remove the hook after sanitization
        DOMPurify.removeHook('beforeSanitizeElements');

        if (!sanitized && html.trim() !== '') {
            // If sanitizer stripped everything, log a warning and return original for debugging
            console.warn(
                'DOMPurify stripped all content! Returning original for debugging.',
                { html },
            );
            return html;
        }
        return sanitized;
    } catch (error) {
        console.error('Error sanitizing HTML:', error);
        // Remove the hook in case of error
        DOMPurify.removeHook('beforeSanitizeElements');
        // Return original string if sanitization fails
        return html;
    }
}

/**
 * Sanitize HTML content and return a React component
 * @param html - The HTML content to sanitize
 * @param className - Optional CSS class name
 * @returns JSX element with sanitized content
 */
export function SafeHtml({
    html,
    className = '',
    ...props
}: {
    html: string;
    className?: string;
    [key: string]: any;
}) {
    // Replace video placeholders with actual video HTML
    let processedHtml = html;
    if (html.includes('[VIDEO:')) {
        processedHtml = html.replace(
            /\[VIDEO:([^\]]+)\]/g,
            (match, videoUrl) => {
                return `<video src="${videoUrl}" controls width="100%" style="max-width: 100%; border-radius: 0.375rem;"></video>`;
            },
        );
    }

    const sanitizedHtml = sanitizeHtml(processedHtml);

    return React.createElement('div', {
        className,
        dangerouslySetInnerHTML: { __html: sanitizedHtml },
        ...props,
    });
}

/**
 * Check if HTML content contains potentially dangerous content
 * @param html - The HTML content to check
 * @returns true if content is safe, false if potentially dangerous
 */
export function isHtmlSafe(html: string): boolean {
    if (!html || typeof html !== 'string') {
        return true;
    }

    try {
        const sanitized = DOMPurify.sanitize(html, purifyConfig);
        // If the sanitized content is significantly different from original,
        // it might contain dangerous content
        return sanitized === html || sanitized.length > 0;
    } catch (error) {
        return false;
    }
}

/**
 * Get a preview of sanitized content (first 100 characters)
 * @param html - The HTML content
 * @returns Preview string
 */
export function getHtmlPreview(html: string, maxLength: number = 100): string {
    const sanitized = sanitizeHtml(html);

    // Remove HTML tags for preview
    const textOnly = sanitized.replace(/<[^>]*>/g, '');

    if (textOnly.length <= maxLength) {
        return textOnly;
    }

    return textOnly.substring(0, maxLength) + '...';
}
