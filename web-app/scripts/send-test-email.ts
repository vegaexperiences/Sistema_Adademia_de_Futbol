import { Resend } from 'resend';
import { generateEnrollmentEmail } from '../src/lib/email/enrollment-template';
import * as dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendTestEmail() {
  try {
    console.log('Sending test email...');
    
    const logoUrl = process.env.NEXT_PUBLIC_LOGO_URL || 'https://example.com/logo.png';

    const emailHtml = generateEnrollmentEmail(
      logoUrl,
      'Javier Vallejo',
      [
        { firstName: 'Lionel', lastName: 'Messi', category: 'U-10 M' },
        { firstName: 'Cristiano', lastName: 'Ronaldo', category: 'U-12 M' }
      ],
      260.00,
      'Yappy'
    );

    const data = await resend.emails.send({
      from: 'Suarez Academy <onboarding@resend.dev>',
      to: ['vegaexperiences@gmail.com'],
      subject: 'TEST: Confirmación de Matrícula - Suarez Academy',
      html: emailHtml,
    });

    console.log('Email sent successfully:', data);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

sendTestEmail();
