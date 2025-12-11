import { getEmailTemplate, updateEmailTemplate } from '@/lib/actions/email-templates';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { TemplateEditor } from './TemplateEditor';

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = await getEmailTemplate(id);

  if (!template) {
    redirect('/dashboard/emails?tab=plantillas');
  }

  async function saveTemplate(data: any) {
    'use server';
    
    // Store the editable fields in the variables column
    const result = await updateEmailTemplate(id, {
      subject: data.subject,
      variables: data.fields
    });

    if (result.success) {
      redirect('/dashboard/emails?tab=plantillas');
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/emails?tab=plantillas"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 capitalize">
              Editar: {template.name.replace(/_/g, ' ')}
            </h1>
            <p className="text-gray-600">
              Personaliza el contenido del correo
            </p>
          </div>
        </div>
      </div>

      <TemplateEditor template={template} onSave={saveTemplate} />

      {/* Info Card */}
      <div className="glass-card p-6 bg-blue-50 border border-blue-200">
        <h3 className="font-bold text-blue-900 mb-2">💡 Tip</h3>
        <p className="text-sm text-blue-800">
          Los cambios se aplicarán automáticamente a todos los correos futuros que usen esta plantilla.
          La vista previa muestra cómo se verá el correo con datos de ejemplo.
        </p>
      </div>
    </div>
  );
}

