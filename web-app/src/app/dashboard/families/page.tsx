import { createClient } from '@/lib/supabase/server';
import FamiliesList from '@/components/families/FamiliesList';

export default async function FamiliesPage() {
  const supabase = await createClient();
  
  const { data: families } = await supabase
    .from('families')
    .select('*, players(id, first_name, last_name)')
    .order('tutor_name');

  return <FamiliesList families={families || []} />;
}
