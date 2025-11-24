'use client';

import { useState } from 'react';

interface PaymentMethods {
  yappy: boolean;
  transfer: boolean;
  proof: boolean;
}

interface PaymentMethodsSettingsProps {
  initialMethods: PaymentMethods;
}

export function PaymentMethodsSettings({ initialMethods }: PaymentMethodsSettingsProps) {
  const [methods, setMethods] = useState<PaymentMethods>(initialMethods);

  const handleToggle = (key: keyof PaymentMethods) => {
    setMethods(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="grid gap-4">
      {/* Hidden input to store the JSON value for the form submission */}
      <input type="hidden" name="value" value={JSON.stringify(methods)} />
      
      {/* Yappy Toggle */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">Y</div>
          <span className="font-medium text-gray-900 dark:text-white">Yappy</span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            checked={methods.yappy}
            onChange={() => handleToggle('yappy')}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* Transfer Toggle */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600">T</div>
          <span className="font-medium text-gray-900 dark:text-white">Transferencia Bancaria</span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            checked={methods.transfer}
            onChange={() => handleToggle('transfer')}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* Proof Upload Toggle */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600">C</div>
          <span className="font-medium text-gray-900 dark:text-white">Subir Comprobante</span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            checked={methods.proof}
            onChange={() => handleToggle('proof')}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>
    </div>
  );
}
