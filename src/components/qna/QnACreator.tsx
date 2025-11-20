'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

export type QnAConfig = {
    answersVisibleAt?: Date | null;
    allowEditsUntil?: Date | null;
};

type Props = {
    onChange: (config: QnAConfig | null) => void;
};

export function QnACreator({ onChange }: Props) {
    const [enabled, setEnabled] = React.useState(false);
    const [deadline, setDeadline] = React.useState<string>('');

    React.useEffect(() => {
        if (!enabled) {
            onChange(null);
            return;
        }
        const d = deadline ? new Date(deadline) : null;
        onChange({
            answersVisibleAt: d || undefined,
            allowEditsUntil: d || undefined,
        });
    }, [enabled, deadline, onChange]);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label>Enable Q&A for this post</Label>
                <Switch
                    checked={enabled}
                    onCheckedChange={(v) => setEnabled(Boolean(v))}
                />
            </div>
            {enabled && (
                <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                        <Label htmlFor="qa-deadline">
                            Answer deadline (optional)
                        </Label>
                        <Input
                            id="qa-deadline"
                            type="datetime-local"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default QnACreator;
