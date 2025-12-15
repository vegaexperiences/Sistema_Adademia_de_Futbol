import { getSponsorById } from '@/lib/actions/sponsors';
import { getPublicSystemConfig } from '@/lib/actions/config';
import { SponsorCheckoutForm } from '@/components/sponsors/SponsorCheckoutForm';
import { notFound } from 'next/navigation';

export default async function SponsorCheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [sponsorResult, config] = await Promise.all([
    getSponsorById(id),
    getPublicSystemConfig(),
  ]);

  if (sponsorResult.error || !sponsorResult.data) {
    notFound();
  }

  return (
    <div className="min-h-screen py-12 transition-colors duration-300">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Checkout - {sponsorResult.data.name}
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Completa el formulario para convertirte en padrino de Suarez Academy.
          </p>
        </div>

        <div className="glass-card overflow-visible">
          <SponsorCheckoutForm sponsor={sponsorResult.data} config={config} />
        </div>
      </div>
    </div>
  );
}

