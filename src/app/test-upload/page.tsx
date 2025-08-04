'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSession } from '@/server/auth/client';

export default function TestUploadPage() {
    const { data: session } = useSession();
    const [uploadResult, setUploadResult] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = async (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadResult('');

        try {
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                setUploadResult(
                    `Upload successful! File: ${data.filename}, Size: ${data.size} bytes`,
                );
            } else {
                const errorData = await response.json();
                setUploadResult(`Upload failed: ${errorData.error}`);
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            setUploadResult(`Upload error: ${error}`);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="container mx-auto max-w-4xl p-8">
            <h1 className="mb-8 text-3xl font-bold">Upload API Test</h1>

            <div className="mb-6">
                <h2 className="mb-4 text-xl font-semibold">
                    Authentication Status:
                </h2>
                <p className="mb-2">
                    <strong>Logged in:</strong> {session ? 'Yes' : 'No'}
                </p>
                {session && (
                    <p className="mb-2">
                        <strong>User:</strong> {session.user.email}
                    </p>
                )}
            </div>

            <div className="mb-6">
                <h2 className="mb-4 text-xl font-semibold">Test Upload:</h2>
                <div className="space-y-4">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                    />

                    {isUploading && (
                        <div className="flex items-center space-x-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            <span>Uploading...</span>
                        </div>
                    )}

                    {uploadResult && (
                        <div
                            className={`rounded-md p-4 ${uploadResult.includes('successful') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}
                        >
                            {uploadResult}
                        </div>
                    )}
                </div>
            </div>

            <div className="mb-6">
                <h2 className="mb-4 text-xl font-semibold">Instructions:</h2>
                <ul className="list-disc space-y-2 pl-6">
                    <li>Make sure you're logged in first</li>
                    <li>Select an image file to test the upload</li>
                    <li>Check the browser console for any error messages</li>
                    <li>Check the server console for debugging logs</li>
                </ul>
            </div>
        </div>
    );
}
