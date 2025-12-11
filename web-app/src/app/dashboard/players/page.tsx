import { getPlayers } from '@/lib/actions/players';
import PlayersList from '@/components/players/PlayersList';

export default async function PlayersPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const players = await getPlayers();
  const view = resolvedSearchParams?.view === 'retired' ? 'retired' : 'active';

  return <PlayersList players={players || []} initialView={view} />;
}
