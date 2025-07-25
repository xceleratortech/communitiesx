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
        // Basic styling (if needed)
        'class',
        'style',
    ],
    ALLOWED_URI_REGEXP:
        /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+\.\-]+(?:[^a-z+\.\-:]|$))/i,
    FORBID_TAGS: [
        'script',
        'iframe',
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
        // Sanitize the HTML content
        const sanitized = DOMPurify.sanitize(html, purifyConfig);
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
    const sanitizedHtml = sanitizeHtml(html);

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
