'use server';

import { createClient } from '@/lib/supabase/server';

export type SystemConfig = {
  prices: {
    enrollment: number;
    monthly: number;
    monthly_family: number;
  };
  paymentMethods: {
    yappy: boolean;
    transfer: boolean;
    proof: boolean;
  };
};

export async function getPublicSystemConfig(): Promise<SystemConfig> {
  const supabase = await createClient();
  
  const { data: settings } = await supabase
    .from('settings')
    .select('*');

  // Default values
  const config: SystemConfig = {
    prices: {
      enrollment: 130,
      monthly: 130,
      monthly_family: 110.50,
    },
    paymentMethods: {
      yappy: true,
      transfer: true,
      proof: false,
    },
  };

  if (settings) {
    settings.forEach((setting) => {
      if (setting.key === 'price_enrollment') config.prices.enrollment = Number(setting.value);
      if (setting.key === 'price_monthly') config.prices.monthly = Number(setting.value);
      if (setting.key === 'price_monthly_family') config.prices.monthly_family = Number(setting.value);
      if (setting.key === 'payment_methods') {
        // Handle potential JSON parsing if value is string, or direct usage if jsonb
        const methods = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
        config.paymentMethods = { ...config.paymentMethods, ...methods };
      }
    });
  }

  return config;
}
