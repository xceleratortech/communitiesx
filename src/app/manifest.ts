import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'AU NEP',
        short_name: 'AU NEP',
        description: 'Namma Educators Parishad | Atria University',
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
    };
}
