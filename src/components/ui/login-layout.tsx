import Image from 'next/image';

interface LoginLayoutProps {
    children: React.ReactNode;
}

export function LoginLayout({ children }: LoginLayoutProps) {
    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center">
                    <div className="mb-6 flex justify-center">
                        <Image
                            src="/diamond-192.png"
                            alt="CommunitiesX Logo"
                            width={80}
                            height={80}
                            className="rounded-lg"
                        />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        CommunityX
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Powered by Xcelerator
                    </p>
                </div>
                {children}
            </div>
        </div>
    );
}
