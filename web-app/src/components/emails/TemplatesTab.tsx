import Link from 'next/link';
import { getEmailTemplates } from '@/lib/actions/email-templates';

export async function TemplatesTab() {
  const templates = await getEmailTemplates();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <span className="text-purple-600 dark:text-purple-400 text-2xl">📧</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Plantillas de Correo
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Gestiona las plantillas de correo electrónico
            </p>
          </div>
        </div>
      </div>

      {/* Templates List */}
      <div className="glass-card p-6">
        <div className="grid gap-4">
          {templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No hay plantillas configuradas
            </div>
          ) : (
            templates.map((template) => (
              <div
                key={template.id}
                className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-all bg-white dark:bg-gray-800"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white capitalize">
                      {template.name.replace(/_/g, ' ')}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {template.subject}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {template.is_active ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                          Activa
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                          Inactiva
                        </span>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/emails/templates/${template.id}`}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Editar
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

