import { getPlayers } from '@/lib/actions/players';
import PlayersList from '@/components/players/PlayersList';

export default async function PlayersPage({
  searchParams,
}: {
  searchParams?: { view?: string };
}) {
  const players = await getPlayers();
  const view = searchParams?.view === 'retired' ? 'retired' : 'active';

  return <PlayersList players={players || []} initialView={view} />;
}
