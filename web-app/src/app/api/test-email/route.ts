import { resend } from '@/lib/resend/client';
import { logEmailSent } from '@/lib/actions/email-log';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { to, subject, html, templateName } = await request.json();

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Send test email
    const emailResponse = await resend.emails.send({
      from: 'Suarez Academy <onboarding@resend.dev>',
      to: [to],
      subject: `[PRUEBA] ${subject}`,
      html,
    });

    // Log email send for counter tracking with Resend ID
    await logEmailSent(to, subject, `test_${templateName}`, emailResponse.data?.id || null);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send test email' },
      { status: 500 }
    );
  }
}
