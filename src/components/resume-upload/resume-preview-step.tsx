'use client';

import React from 'react';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { type ResumeProfile } from '@/lib/services/resume-parser';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    ResumeSection,
    TextSection,
    BadgeSection,
    CardSection,
} from './resume-section';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    User,
    Building2,
    Briefcase,
    GraduationCap,
    Lightbulb,
    Award,
    Target,
} from 'lucide-react';

interface ResumePreviewStepProps {
    parsedData: ResumeProfile;
    selectedFields: Record<string, boolean>;
    onToggleField: (field: string) => void;
    onBack: () => void;
    onApplyChanges: () => void;
    isUploading: boolean;
}

export function ResumePreviewStep({
    parsedData,
    selectedFields,
    onToggleField,
    onBack,
    onApplyChanges,
    isUploading,
}: ResumePreviewStepProps) {
    const renderExperienceCard = (exp: any, index: number) => (
        <Card key={exp.id || index} className="border p-4">
            <CardContent className="p-0">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium">{exp.title}</h4>
                        <Badge variant="secondary">
                            {exp.isCurrent ? 'Current' : 'Previous'}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">
                        {exp.company}
                    </p>
                    {exp.location && (
                        <p className="text-muted-foreground text-xs">
                            {exp.location}
                        </p>
                    )}
                    {exp.website && (
                        <p className="text-muted-foreground text-xs">
                            <a
                                href={
                                    exp.website.startsWith('http')
                                        ? exp.website
                                        : `https://${exp.website}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                            >
                                {exp.website}
                            </a>
                        </p>
                    )}
                    <div className="text-muted-foreground text-xs">
                        {exp.startDate} - {exp.endDate || 'Present'}
                    </div>
                    {exp.description && (
                        <p className="text-sm">{exp.description}</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    const renderEducationCard = (edu: any, index: number) => (
        <Card key={edu.id || index} className="border p-4">
            <CardContent className="p-0">
                <div className="space-y-2">
                    <h4 className="font-medium">{edu.degree}</h4>
                    <p className="text-muted-foreground text-sm">
                        {edu.institution}
                    </p>
                    {edu.fieldOfStudy && (
                        <p className="text-muted-foreground text-xs">
                            {edu.fieldOfStudy}
                        </p>
                    )}
                    <div className="text-muted-foreground text-xs">
                        {edu.startDate} - {edu.endDate || 'Ongoing'}
                    </div>
                    {edu.gpa && (
                        <p className="text-muted-foreground text-xs">
                            GPA: {edu.gpa}
                        </p>
                    )}
                    {edu.description && (
                        <p className="text-sm">{edu.description}</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    const renderCertificationCard = (cert: any, index: number) => (
        <Card key={cert.id || index} className="border p-4">
            <CardContent className="p-0">
                <div className="space-y-2">
                    <h4 className="font-medium">{cert.name}</h4>
                    <p className="text-muted-foreground text-sm">
                        {cert.issuingOrganization}
                    </p>
                    <div className="text-muted-foreground text-xs">
                        Issued: {cert.issueDate}
                        {cert.expiryDate && ` - Expires: ${cert.expiryDate}`}
                    </div>
                    {cert.description && (
                        <p className="text-sm">{cert.description}</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    const renderAchievementCard = (achievement: any, index: number) => (
        <Card key={achievement.id || index} className="border p-4">
            <CardContent className="p-0">
                <div className="space-y-2">
                    <h4 className="font-medium">{achievement.title}</h4>
                    <div className="text-muted-foreground text-xs">
                        {achievement.date}
                    </div>
                    {achievement.description && (
                        <p className="text-sm">{achievement.description}</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="mx-auto max-w-4xl space-y-4 p-4">
            <div className="mb-6">
                <Button variant="ghost" onClick={onBack} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Upload
                </Button>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">
                        Review Extracted Data
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Review and edit the information extracted from your
                        resume. Use the checkboxes to select which sections to
                        add to your profile.
                    </p>
                </div>
            </div>

            {/* Important Disclaimer */}
            <Alert className="border-amber-200 bg-amber-50/80">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-900">
                    <strong>Important</strong> AI-extracted data may contain
                    errors or inaccuracies. Please carefully review all
                    information before applying changes to your profile.
                </AlertDescription>
            </Alert>

            <div className="space-y-6">
                {/* Phone Number Section */}
                <TextSection
                    title="Phone Number"
                    icon={User}
                    field="phoneNumber"
                    checked={selectedFields.phoneNumber}
                    onToggle={onToggleField}
                    data={parsedData?.phoneNumber}
                />

                {/* Location Section */}
                <TextSection
                    title="Location"
                    icon={Building2}
                    field="location"
                    checked={selectedFields.location}
                    onToggle={onToggleField}
                    data={parsedData?.location}
                />

                {/* Experience Section */}
                <CardSection
                    title="Work Experience"
                    icon={Briefcase}
                    field="experiences"
                    checked={selectedFields.experiences}
                    onToggle={onToggleField}
                    data={parsedData?.experiences}
                    renderCard={renderExperienceCard}
                />

                {/* Education Section */}
                <CardSection
                    title="Education"
                    icon={GraduationCap}
                    field="educations"
                    checked={selectedFields.educations}
                    onToggle={onToggleField}
                    data={parsedData?.educations}
                    renderCard={renderEducationCard}
                />

                {/* Skills Section */}
                <BadgeSection
                    title="Skills"
                    icon={Lightbulb}
                    field="skills"
                    checked={selectedFields.skills}
                    onToggle={onToggleField}
                    data={parsedData?.skills}
                />

                {/* Certifications Section */}
                <CardSection
                    title="Certifications"
                    icon={Award}
                    field="certifications"
                    checked={selectedFields.certifications}
                    onToggle={onToggleField}
                    data={parsedData?.certifications}
                    renderCard={renderCertificationCard}
                />

                {/* Achievements Section */}
                <CardSection
                    title="Achievements"
                    icon={Target}
                    field="achievements"
                    checked={selectedFields.achievements}
                    onToggle={onToggleField}
                    data={parsedData?.achievements}
                    renderCard={renderAchievementCard}
                />

                {/* Interests Section */}
                <BadgeSection
                    title="Interests"
                    icon={Lightbulb}
                    field="interests"
                    checked={selectedFields.interests}
                    onToggle={onToggleField}
                    data={parsedData?.interests}
                />

                {/* Industries Section */}
                <BadgeSection
                    title="Industries"
                    icon={Building2}
                    field="industries"
                    checked={selectedFields.industries}
                    onToggle={onToggleField}
                    data={parsedData?.industries}
                />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6">
                <Button variant="outline" onClick={onBack}>
                    Back to Upload
                </Button>
                <Button onClick={onApplyChanges} disabled={isUploading}>
                    {isUploading ? 'Updating Profile...' : 'Apply to Profile'}
                </Button>
            </div>
        </div>
    );
}
