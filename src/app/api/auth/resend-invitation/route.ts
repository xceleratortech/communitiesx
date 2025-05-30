import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { verifications, orgs } from '@/server/db/auth-schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { sendEmail } from '@/lib/email';

// Define email options type
interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

// Helper function to retry sending email with exponential backoff
async function retrySendEmail(emailOptions: EmailOptions, maxRetries = 3) {
    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            console.log(
                `Email sending attempt ${attempt + 1} of ${maxRetries}`,
            );
            await sendEmail(emailOptions);
            console.log('Email sent successfully');
            return true;
        } catch (error) {
            lastError = error;
            console.error(
                `Email sending failed on attempt ${attempt + 1}:`,
                error,
            );

            // Don't wait after the last attempt
            if (attempt < maxRetries - 1) {
                const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
                console.log(`Waiting ${waitTime}ms before next attempt...`);
                await new Promise((resolve) => setTimeout(resolve, waitTime));
            }
        }
    }

    // If we got here, all attempts failed
    throw (
        lastError || new Error('Failed to send email after multiple attempts')
    );
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 },
            );
        }

        console.log(`Resending invitation for email: ${email}`);

        // Find existing verification records for this email
        const existingVerifications = await db.query.verifications.findMany({
            where: eq(verifications.identifier, email),
        });

        console.log(
            `Found ${existingVerifications.length} existing verification records`,
        );

        // Extract the most recent verification data
        let orgId = null;
        let role = 'user';

        if (existingVerifications.length > 0) {
            // Sort by creation date, most recent first
            const sortedVerifications = [...existingVerifications].sort(
                (a, b) => {
                    return (
                        new Date(b.createdAt || 0).getTime() -
                        new Date(a.createdAt || 0).getTime()
                    );
                },
            );

            const mostRecent = sortedVerifications[0];

            try {
                const parsedValue = JSON.parse(mostRecent.value);
                orgId = parsedValue.orgId;
                role = parsedValue.role || 'user';
                console.log(
                    `Using existing data: orgId=${orgId}, role=${role}`,
                );
            } catch (e) {
                console.error('Error parsing verification value:', e);
            }
        }

        if (!orgId) {
            return NextResponse.json(
                { error: 'No valid invitation found for this email' },
                { status: 404 },
            );
        }

        // Get organization name
        const organization = await db.query.orgs.findFirst({
            where: eq(orgs.id, orgId),
        });

        if (!organization) {
            return NextResponse.json(
                { error: 'Organization not found' },
                { status: 404 },
            );
        }

        // Generate a new token
        const inviteToken = nanoid(32);
        const now = new Date();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

        // Store new invite in verifications table
        const newVerification = await db
            .insert(verifications)
            .values({
                id: nanoid(),
                identifier: email,
                value: JSON.stringify({
                    token: inviteToken,
                    orgId,
                    role,
                }),
                expiresAt,
                createdAt: now,
                updatedAt: now,
            })
            .returning();

        console.log('Created new verification record:', newVerification);

        // Create the invitation URL
        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/register?token=${inviteToken}&email=${encodeURIComponent(email)}`;

        // Try to send the invite email with retries
        try {
            await retrySendEmail({
                to: email,
                subject: `Invitation to join ${organization.name}`,
                html: `
          <h1>You've been invited to join ${organization.name}</h1>
          <p>Click the link below to create your account:</p>
          <a href="${inviteUrl}">Accept Invitation</a>
          <p>This link will expire in 7 days.</p>
        `,
            });

            return NextResponse.json({
                success: true,
                message: 'Invitation sent successfully',
                inviteUrl,
            });
        } catch (emailError) {
            console.error('Failed to send email after retries:', emailError);

            // Even if email fails, return the invitation URL so the user can continue
            return NextResponse.json({
                success: true,
                message:
                    'Invitation created but email delivery failed. Please use the link below:',
                inviteUrl,
                emailError: 'Failed to send email notification',
            });
        }
    } catch (error) {
        console.error('Error resending invitation:', error);
        return NextResponse.json(
            {
                error: 'Failed to resend invitation',
                details:
                    error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 },
        );
    }
}
