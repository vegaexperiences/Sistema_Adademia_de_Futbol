import { brevo, SendSmtpEmail } from '@/lib/brevo/client';
import { logEmailSent } from '@/lib/actions/email-log';
import { NextResponse } from 'next/server';

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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send test email' },
      { status: 500 }
    );
  }
}
