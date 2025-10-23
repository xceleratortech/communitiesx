import React from 'react';
import {
    Info,
    Shield,
    User,
    Building2,
    Briefcase,
    GraduationCap,
    Lightbulb,
    Award,
    Target,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function InformationCards() {
    return (
        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Info className="h-5 w-5" />
                        What we&apos;ll extract
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="text-muted-foreground space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Phone number
                        </li>
                        <li className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Location
                        </li>
                        <li className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            Work experience and job titles
                        </li>
                        <li className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4" />
                            Education history and degrees
                        </li>
                        <li className="flex items-center gap-2">
                            <Lightbulb className="h-4 w-4" />
                            Skills and competencies
                        </li>
                        <li className="flex items-center gap-2">
                            <Award className="h-4 w-4" />
                            Certifications and achievements
                        </li>
                        <li className="flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Personal interests
                        </li>
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Shield className="h-5 w-5" />
                        Privacy & Accuracy
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="text-muted-foreground space-y-2 text-sm">
                        <li>
                            • Your resume is processed securely and not stored
                        </li>
                        <li>
                            • AI extraction may contain errors - review
                            carefully
                        </li>
                        <li>
                            • You can edit all extracted information before
                            applying
                        </li>
                        <li>• Choose which sections to add to your profile</li>
                        <li>
                            • Only selected data will be added to your profile
                        </li>
                        <li>
                            • You can modify your profile anytime after upload
                        </li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
