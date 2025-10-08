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
    // Remove both images and video placeholders since they're handled by carousels
    let processedHtml = html.replace(/<img[^>]*>/gi, '');
    processedHtml = processedHtml.replace(/\[VIDEO:[^\]]+\]/gi, '');

    return <SafeHtml html={processedHtml} className={className} {...props} />;
}
