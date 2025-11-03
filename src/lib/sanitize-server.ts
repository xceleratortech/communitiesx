// Server-only sanitization helpers (no React/hooks)

// Very conservative HTML sanitizer for server-side use to avoid importing client hooks.
// Removes script/style/iframe/object/embed and event-handler attributes.

function stripDangerousTags(html: string): string {
    return html
        .replace(/<\/(?:script|style|iframe|object|embed)[^>]*>/gi, '')
        .replace(/<(?:script|style|iframe|object|embed)[^>]*>/gi, '');
}

function stripEventHandlers(html: string): string {
    return html.replace(/\son[a-z]+\s*=\s*(["'])[\s\S]*?\1/gi, '');
}

export function sanitizeHtml(html: string): string {
    if (!html || typeof html !== 'string') return '';
    let out = html;
    out = stripDangerousTags(out);
    out = stripEventHandlers(out);
    return out;
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
