'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Mail, Clock, FileText, Megaphone } from 'lucide-react';

interface EmailsTabsProps {
  activeTab: string;
}

const tabs = [
  { id: 'historial', label: 'Historial', icon: Mail },
  { id: 'cola', label: 'Cola', icon: Clock },
  { id: 'plantillas', label: 'Plantillas', icon: FileText },
  { id: 'broadcast', label: 'Broadcast', icon: Megaphone },
];

export function EmailsTabs({ activeTab }: EmailsTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createTabUrl = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tabId === 'historial') {
      params.delete('tab');
    } else {
      params.set('tab', tabId);
    }
    const queryString = params.toString();
    return `${pathname}${queryString ? `?${queryString}` : ''}`;
  };

  return (
    <div className="glass-card p-2">
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={createTabUrl(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg border-transparent'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Icon size={20} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

