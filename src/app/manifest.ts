import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Community-X',
        short_name: 'Community-X',
        description:
            'Community to connect and engage yourself for your interests',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
            {
                src: '/diamond-96.png',
                sizes: '96x96',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/diamond-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/diamond-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/maskable-icon-96.png',
                sizes: '96x96',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: '/maskable-icon-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: '/maskable-icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
        share_target: {
            action: '/share-target', // Route in your app to handle shared content
            method: 'POST',
            enctype: 'multipart/form-data',
            params: {
                title: 'title',
                text: 'text',
                url: 'url',
            },
        },
        categories: ['social', 'productivity', 'utilities'],
        shortcuts: [
            {
                name: 'Share Content',
                short_name: 'Share',
                description: 'Share content to other apps',
                url: '/share-target',
                icons: [
                    {
                        src: '/diamond-96.png',
                        sizes: '96x96',
                    },
                ],
            },
        ],
    };
}
