'use client';

import React, { useState } from 'react';
import TipTapEditor from '@/components/TipTapEditor';
import { SafeHtml } from '@/lib/sanitize';

export default function TestEditorPage() {
    const [content, setContent] = useState('');

    return (
        <div className="container mx-auto max-w-4xl p-8">
            <h1 className="mb-8 text-3xl font-bold">TipTap Editor Test</h1>

            <div className="mb-6">
                <h2 className="mb-4 text-xl font-semibold">
                    Test Instructions:
                </h2>
                <ul className="list-disc space-y-2 pl-6">
                    <li>
                        Try clicking the <strong>H1</strong> and{' '}
                        <strong>H2</strong> buttons to test headings
                    </li>
                    <li>
                        Try the <strong>Upload Image</strong> button to test
                        file upload
                    </li>
                    <li>
                        Test other formatting options like bold, italic, lists,
                        etc.
                    </li>
                    <li>Check that the content updates in the preview below</li>
                </ul>
            </div>

            <div className="mb-6">
                <h3 className="mb-2 text-lg font-medium">Editor:</h3>
                <TipTapEditor
                    content={content}
                    onChange={setContent}
                    placeholder="Start typing to test the editor..."
                />
            </div>

            <div className="mb-6">
                <h3 className="mb-2 text-lg font-medium">HTML Output:</h3>
                <div className="rounded border bg-gray-50 p-4 font-mono text-sm">
                    <pre className="whitespace-pre-wrap">{content}</pre>
                </div>
            </div>

            <div className="mb-6">
                <h3 className="mb-2 text-lg font-medium">Rendered Preview:</h3>
                <div className="rounded border p-4">
                    <SafeHtml html={content} className="prose max-w-none" />
                </div>
            </div>

            <div className="mb-6">
                <h3 className="mb-2 text-lg font-medium">Content Length:</h3>
                <p className="text-sm text-gray-600">
                    Characters: {content.length} | Words:{' '}
                    {
                        content.split(/\s+/).filter((word) => word.length > 0)
                            .length
                    }
                </p>
            </div>
        </div>
    );
}
