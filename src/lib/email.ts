import dotenv from 'dotenv';
dotenv.config();

import nodemailer from 'nodemailer';
import { z } from 'zod';

// Default sender email that will be used if none is provided
const DEFAULT_FROM =
    process.env.DEFAULT_EMAIL_FROM ||
    'Communities App <noreply@xcelerator.co.in>';

// Create a transporter using SMTP credentials
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    // Add debug option to get more detailed logs
    logger: true,
    debug: process.env.NODE_ENV === 'development',
});

const emailSchema = z.object({
    to: z.string().email(),
    subject: z.string(),
    html: z.string(),
    from: z.string().optional(),
});

type EmailParams = z.infer<typeof emailSchema>;

export async function sendEmail({ to, subject, html, from }: EmailParams) {
    try {
        const validated = emailSchema.parse({ to, subject, html, from });
        const senderAddress = validated.from || DEFAULT_FROM;

        // Verify SMTP connection before sending
        await transporter.verify();

        // Send mail with defined transport object
        const info = await transporter.sendMail({
            from: senderAddress,
            to: validated.to,
            subject: validated.subject,
            html: validated.html,
        });

        if (process.env.NODE_ENV === 'development') {
            console.log('Email sent successfully:', info.messageId);
            console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
        }

        return { success: true, data: { id: info.messageId } };
    } catch (error) {
        console.error('Exception in sendEmail:', error);
        return { success: false, error: (error as Error).message };
    }
}
