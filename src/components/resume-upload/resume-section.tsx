import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface ResumeSectionProps {
    title: string;
    icon: LucideIcon;
    field: string;
    checked: boolean;
    onToggle: (field: any) => void;
    children?: React.ReactNode;
}

export function ResumeSection({
    title,
    icon: Icon,
    field,
    checked,
    onToggle,
    children,
}: ResumeSectionProps) {
    return (
        <section className="space-y-3">
            <div className="flex items-center gap-3">
                <Checkbox
                    checked={checked}
                    onCheckedChange={() => onToggle(field)}
                />
                <h2 className="flex items-center gap-2 text-lg font-medium">
                    <Icon className="h-5 w-5" />
                    {title}
                </h2>
            </div>

            {checked && children}
        </section>
    );
}

// Specialized section components for different data types
export function TextSection({
    title,
    icon: Icon,
    field,
    checked,
    onToggle,
    data,
}: ResumeSectionProps & { data?: string }) {
    return (
        <ResumeSection
            title={title}
            icon={Icon}
            field={field}
            checked={checked}
            onToggle={onToggle}
        >
            {data && (
                <div className="bg-muted rounded-md p-3">
                    <span className="text-sm">{data}</span>
                </div>
            )}
        </ResumeSection>
    );
}

export function BadgeSection({
    title,
    icon: Icon,
    field,
    checked,
    onToggle,
    data,
}: ResumeSectionProps & {
    data?: Array<{ id?: string; name: string; level?: string }> | string[];
}) {
    return (
        <ResumeSection
            title={title}
            icon={Icon}
            field={field}
            checked={checked}
            onToggle={onToggle}
        >
            {data && (
                <div className="flex flex-wrap gap-2">
                    {Array.isArray(data) &&
                        data.map((item, index) => {
                            if (typeof item === 'string') {
                                return (
                                    <Badge key={index} variant="outline">
                                        {item}
                                    </Badge>
                                );
                            }
                            return (
                                <Badge
                                    key={item.id || index}
                                    variant="secondary"
                                    className="flex items-center gap-2"
                                >
                                    {item.name}
                                    {item.level && (
                                        <span className="text-xs opacity-75">
                                            ({item.level})
                                        </span>
                                    )}
                                </Badge>
                            );
                        })}
                </div>
            )}
        </ResumeSection>
    );
}

export function CardSection({
    title,
    icon: Icon,
    field,
    checked,
    onToggle,
    data,
    renderCard,
}: ResumeSectionProps & {
    data?: any[];
    renderCard: (item: any, index: number) => React.ReactNode;
}) {
    return (
        <ResumeSection
            title={title}
            icon={Icon}
            field={field}
            checked={checked}
            onToggle={onToggle}
        >
            {data && (
                <div className="space-y-3">
                    {data.map((item, index) => renderCard(item, index))}
                </div>
            )}
        </ResumeSection>
    );
}
