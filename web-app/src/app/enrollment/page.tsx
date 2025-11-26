import { EnrollmentForm } from "@/components/enrollment/EnrollmentForm";
import { getPublicSystemConfig } from "@/lib/actions/config";

export default async function EnrollmentPage() {
  const config = await getPublicSystemConfig();

  return (
    <div className="min-h-screen py-12 transition-colors duration-300">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
            Matrícula 2025
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Completa el formulario para inscribir a tu hijo/a en Suarez Academy.
          </p>
        </div>
        
        <div className="glass-card overflow-visible">
          <EnrollmentForm config={config} />
        </div>
      </div>
    </div>
  );
}
