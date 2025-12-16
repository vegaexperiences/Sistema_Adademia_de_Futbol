/**
 * Late fee configuration type
 * Defined here to avoid circular dependencies
 */
export interface LateFeeConfig {
  enabled: boolean;
  type: 'percentage' | 'fixed';
  value: number; // Percentage (e.g., 5 for 5%) or fixed amount
  graceDays: number; // Days after deadline before applying late fee
  paymentDeadlineDay: number; // Day of month when payment is due
}

/**
 * Calculate late fee amount based on configuration
 * Pure function - no server-side dependencies
 */
export function calculateLateFee(
  originalAmount: number,
  daysOverdue: number,
  config: LateFeeConfig
): number {
  if (!config.enabled || daysOverdue <= config.graceDays) {
    return 0;
  }

  if (config.type === 'percentage') {
    // Calculate percentage of original amount
    return originalAmount * (config.value / 100);
  } else {
    // Fixed amount
    return config.value;
  }
}

/**
 * Get payment deadline date for a given month/year
 * Pure function - no server-side dependencies
 */
export function getPaymentDeadlineDate(monthYear: string, deadlineDay: number): Date {
  const [year, month] = monthYear.split('-').map(Number);
  return new Date(year, month - 1, deadlineDay);
}

/**
 * Calculate days overdue for a charge
 * Pure function - no server-side dependencies
 */
export function calculateDaysOverdue(monthYear: string, deadlineDay: number, referenceDate?: Date): number {
  const deadline = getPaymentDeadlineDate(monthYear, deadlineDay);
  const today = referenceDate || new Date();
  
  const diffTime = today.getTime() - deadline.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}
