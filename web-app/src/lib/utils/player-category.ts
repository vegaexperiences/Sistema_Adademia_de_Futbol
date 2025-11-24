/**
 * Player category calculation based on birth year and gender
 */

export type PlayerCategory = 'U6' | 'U8' | 'U10' | 'U12' | 'U14' | 'U16' | 'U18' | 'Sin categoría';

interface CategoryRange {
  category: PlayerCategory;
  years: number[];
}

const MALE_CATEGORIES: CategoryRange[] = [
  { category: 'U6', years: [2020, 2021] },
  { category: 'U8', years: [2018, 2019] },
  { category: 'U10', years: [2016, 2017] },
  { category: 'U12', years: [2014, 2015] },
  { category: 'U14', years: [2012, 2013] },
  { category: 'U16', years: [2010, 2011] },
];

const FEMALE_CATEGORIES: CategoryRange[] = [
  { category: 'U10', years: [2016, 2017] },
  { category: 'U12', years: [2014, 2015] },
  { category: 'U14', years: [2012, 2013] },
  { category: 'U16', years: [2010, 2011] },
  { category: 'U18', years: Array.from({ length: 20 }, (_, i) => 2009 - i) }, // 2009 and earlier
];

/**
 * Calculate player category based on birth date and gender
 * @param birthDate - Player's birth date (YYYY-MM-DD or Date object)
 * @param gender - Player's gender ('Masculino' or 'Femenino')
 * @returns The category (U6, U8, etc.) or 'Sin categoría' if no match
 */
export function getPlayerCategory(
  birthDate: string | Date,
  gender: 'Masculino' | 'Femenino'
): PlayerCategory {
  const date = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  const birthYear = date.getFullYear();
  
  const categories = gender === 'Masculino' ? MALE_CATEGORIES : FEMALE_CATEGORIES;
  
  for (const { category, years } of categories) {
    if (years.includes(birthYear)) {
      return category;
    }
  }
  
  return 'Sin categoría';
}

/**
 * Get color for category badge
 */
export function getCategoryColor(category: PlayerCategory): string {
  const colors: Record<PlayerCategory, string> = {
    'U6': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    'U8': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'U10': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'U12': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'U14': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'U16': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    'U18': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'Sin categoría': 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  };
  
  return colors[category] || colors['Sin categoría'];
}

/**
 * Get all categories for a specific gender
 */
export function getCategoriesForGender(gender: 'Masculino' | 'Femenino'): PlayerCategory[] {
  const categories = gender === 'Masculino' ? MALE_CATEGORIES : FEMALE_CATEGORIES;
  return categories.map(c => c.category);
}

/**
 * Calculate age from birth date
 */
export function calculateAge(birthDate: string | Date): number {
  const today = new Date();
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}
