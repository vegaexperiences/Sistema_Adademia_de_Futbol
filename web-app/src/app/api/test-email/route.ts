import { brevo, SendSmtpEmail } from '@/lib/brevo/client';
import { logEmailSent } from '@/lib/actions/email-log';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  try {
    const { to, subject, html, templateName } = await request.json();

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Send test email
    const sendSmtpEmail: SendSmtpEmail = {
      sender: { name: 'Suarez Academy', email: process.env.BREVO_FROM_EMAIL || 'noreply@suarezacademy.com' },
      to: [{ email: to }],
      subject: `[PRUEBA] ${subject}`,
      htmlContent: html,
    };

    const emailResponse = await brevo.sendTransacEmail(sendSmtpEmail);

    // Brevo returns { response, body } where body contains the messageId
    const messageId = emailResponse.body?.messageId || (emailResponse as any).messageId;

    // Log email send for counter tracking with Brevo ID
    await logEmailSent(to, subject, `test_${templateName}`, messageId || null);
    revalidatePath('/dashboard/settings/emails');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // Brevo/SDK errors include HTTP status + body with details
    const brevoStatus = error?.response?.status;
    const brevoBody = error?.response?.body;
    const brevoText = error?.response?.text;
    const serializedError = JSON.parse(
      JSON.stringify(error, Object.getOwnPropertyNames(error))
    );

    console.error('Test email error:', {
      message: error?.message,
      status: brevoStatus,
      body: brevoBody,
      raw: brevoText,
      serializedError,
    });

    const details =
      brevoBody ||
      (typeof brevoText === 'string' ? brevoText : null) ||
      serializedError ||
      null;

    return NextResponse.json(
      {
        error:
          brevoBody?.message ||
          (typeof brevoText === 'string' ? brevoText : null) ||
          error.message ||
          'Failed to send test email',
        details,
      },
      { status: brevoStatus || 500 }
    );
  }
}
