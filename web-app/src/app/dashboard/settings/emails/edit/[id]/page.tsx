import { getEmailTemplate, updateEmailTemplate } from '@/lib/actions/email-templates';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { TemplateEditor } from './TemplateEditor';

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = await getEmailTemplate(id);

  if (!template) {
    redirect('/dashboard/settings/emails');
  }

  async function saveTemplate(data: any) {
    'use server';
    
    // Store the editable fields in the variables column
    const result = await updateEmailTemplate(id, {
      subject: data.subject,
      variables: data.fields
    });

    if (result.success) {
      redirect('/dashboard/settings/emails');
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/settings/emails"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-600 dark:text-gray-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white capitalize">
              Editar: {template.name.replace(/_/g, ' ')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Personaliza el contenido del correo
            </p>
          </div>
        </div>
      </div>

      <TemplateEditor template={template} onSave={saveTemplate} />

      {/* Info Card */}
      <div className="glass-card p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">💡 Tip</h3>
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Los cambios se aplicarán automáticamente a todos los correos futuros que usen esta plantilla.
          La vista previa muestra cómo se verá el correo con datos de ejemplo.
        </p>
      </div>
    </div>
  );
}
