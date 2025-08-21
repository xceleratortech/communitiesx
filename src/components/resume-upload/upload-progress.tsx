interface UploadProgressProps {
    progress: number;
}

export function UploadProgress({ progress }: UploadProgressProps) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
                <span>Processing resume...</span>
                <span>{progress}%</span>
            </div>
            <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
                <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}
