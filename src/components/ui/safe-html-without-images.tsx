'use client';

import React from 'react';
import { SafeHtml } from '@/lib/sanitize';

interface SafeHtmlWithoutImagesProps {
    html: string;
    className?: string;
    [key: string]: any;
}

export function SafeHtmlWithoutImages({
    html,
    className = '',
    ...props
}: SafeHtmlWithoutImagesProps) {
    const processedHtml = html.replace(/<img[^>]*>/gi, '');

    return <SafeHtml html={processedHtml} className={className} {...props} />;
}
