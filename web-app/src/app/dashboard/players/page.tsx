import { getPlayers } from '@/lib/actions/players';
import PlayersList from '@/components/players/PlayersList';

export default async function PlayersPage() {
  const players = await getPlayers();

  return <PlayersList players={players || []} />;
}
