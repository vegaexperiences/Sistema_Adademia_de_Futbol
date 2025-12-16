'use client';

import { useActionState, useMemo, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { Send, Megaphone, Users, UserCheck, Shuffle } from 'lucide-react';
import { PlayerSelector } from './PlayerSelector';

type FormState = {
  ok?: boolean;
  message?: string;
};

const initialState: FormState = { ok: undefined, message: undefined };

interface BroadcastFormsProps {
  sendTournamentAction: (state: FormState, formData: FormData) => Promise<FormState>;
  sendGeneralAction: (state: FormState, formData: FormData) => Promise<FormState>;
}

type SelectionMode = 'all' | 'manual' | 'random';

export function BroadcastForms({
  sendTournamentAction,
  sendGeneralAction,
}: BroadcastFormsProps) {
  const [tournamentState, tournamentAction] = useActionState(sendTournamentAction, initialState);
  const [generalState, generalAction] = useActionState(sendGeneralAction, initialState);

  // Tournament form state
  const [tournamentMode, setTournamentMode] = useState<SelectionMode>('all');
  const [tournamentSelectedIds, setTournamentSelectedIds] = useState<string[]>([]);
  const [tournamentRandomCount, setTournamentRandomCount] = useState<number>(10);

  // General form state
  const [generalMode, setGeneralMode] = useState<SelectionMode>('all');
  const [generalSelectedIds, setGeneralSelectedIds] = useState<string[]>([]);
  const [generalRandomCount, setGeneralRandomCount] = useState<number>(10);

  const audienceOptions = useMemo(
    () => [
      { value: 'active', label: 'Activos y Becados' },
      { value: 'retired', label: 'Retirados / No aceptados' },
      { value: 'all', label: 'Todos (activos + retirados)' },
    ],
    []
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <BroadcastCard
        title="Invitación a Torneos"
        description="Envía invitaciones personalizadas a familias seleccionando el público objetivo."
        icon={<Send className="text-purple-600" size={24} />}
      >
        <form action={tournamentAction} className="space-y-4">
          <input
            type="text"
            name="tournamentName"
            placeholder="Nombre del torneo"
            required
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="date"
              name="tournamentDate"
              required
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
            <input
              type="text"
              name="tournamentLocation"
              placeholder="Lugar / Sede"
              required
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <textarea
            name="additionalInfo"
            placeholder="Información adicional, requisitos o costos..."
            rows={4}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
          
          <SelectionModeSelector
            mode={tournamentMode}
            onModeChange={setTournamentMode}
            label="Modo de envío"
          />
          
          {tournamentMode === 'all' && <AudienceSelect options={audienceOptions} />}
          
          {tournamentMode === 'manual' && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Seleccionar jugadores
              </label>
              <PlayerSelector
                selectedPlayerIds={tournamentSelectedIds}
                onSelectionChange={setTournamentSelectedIds}
              />
            </div>
          )}
          
          {tournamentMode === 'random' && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Cantidad de jugadores
              </label>
              <input
                type="number"
                min="1"
                value={tournamentRandomCount}
                onChange={(e) => setTournamentRandomCount(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              />
              <p className="text-xs text-gray-500">
                Se seleccionarán aleatoriamente {tournamentRandomCount} jugador{tournamentRandomCount !== 1 ? 'es' : ''}
              </p>
            </div>
          )}
          
          {/* Hidden fields for form submission */}
          <input type="hidden" name="selectionMode" value={tournamentMode} />
          <input type="hidden" name="selectedPlayerIds" value={JSON.stringify(tournamentSelectedIds)} />
          <input type="hidden" name="randomCount" value={tournamentRandomCount} />
          
          <SubmitButton 
            label="Enviar invitación" 
            disabled={tournamentMode === 'manual' && tournamentSelectedIds.length === 0}
          />
          <FormMessage state={tournamentState} />
        </form>
      </BroadcastCard>

      <BroadcastCard
        title="Comunicado General"
        description="Envía anuncios o noticias a jugadores activos o retirados."
        icon={<Megaphone className="text-blue-600" size={24} />}
      >
        <form action={generalAction} className="space-y-4">
          <input
            type="text"
            name="subject"
            placeholder="Asunto del correo"
            required
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            name="message"
            placeholder="Mensaje principal del comunicado..."
            rows={6}
            required
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          
          <SelectionModeSelector
            mode={generalMode}
            onModeChange={setGeneralMode}
            label="Modo de envío"
          />
          
          {generalMode === 'all' && <AudienceSelect options={audienceOptions} />}
          
          {generalMode === 'manual' && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Seleccionar jugadores
              </label>
              <PlayerSelector
                selectedPlayerIds={generalSelectedIds}
                onSelectionChange={setGeneralSelectedIds}
              />
            </div>
          )}
          
          {generalMode === 'random' && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Cantidad de jugadores
              </label>
              <input
                type="number"
                min="1"
                value={generalRandomCount}
                onChange={(e) => setGeneralRandomCount(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500">
                Se seleccionarán aleatoriamente {generalRandomCount} jugador{generalRandomCount !== 1 ? 'es' : ''}
              </p>
            </div>
          )}
          
          {/* Hidden fields for form submission */}
          <input type="hidden" name="selectionMode" value={generalMode} />
          <input type="hidden" name="selectedPlayerIds" value={JSON.stringify(generalSelectedIds)} />
          <input type="hidden" name="randomCount" value={generalRandomCount} />
          
          <SubmitButton 
            label="Enviar comunicado" 
            color="blue"
            disabled={generalMode === 'manual' && generalSelectedIds.length === 0}
          />
          <FormMessage state={generalState} />
        </form>
      </BroadcastCard>
    </div>
  );
}

function BroadcastCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-white/70 shadow-inner">
          {icon}
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function AudienceSelect({ options }: { options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
        <Users size={16} />
        Público objetivo
      </label>
      <select
        name="audience"
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
        defaultValue="active"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SelectionModeSelector({
  mode,
  onModeChange,
  label,
}: {
  mode: SelectionMode;
  onModeChange: (mode: SelectionMode) => void;
  label: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
        <Users size={16} />
        {label}
      </label>
      <select
        value={mode}
        onChange={(e) => onModeChange(e.target.value as SelectionMode)}
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
      >
        <option value="all">Todos (por estado)</option>
        <option value="manual">Grupo Selecto (Manual)</option>
        <option value="random">Grupo Selecto (Aleatorio)</option>
      </select>
      {mode === 'all' && (
        <p className="text-xs text-gray-500 mt-1">
          Envía a todos los jugadores según el estado seleccionado
        </p>
      )}
      {mode === 'manual' && (
        <p className="text-xs text-gray-500 mt-1">
          Busca y selecciona jugadores específicos manualmente
        </p>
      )}
      {mode === 'random' && (
        <p className="text-xs text-gray-500 mt-1">
          Selecciona automáticamente una cantidad aleatoria de jugadores
        </p>
      )}
    </div>
  );
}

function SubmitButton({ 
  label, 
  color = 'purple',
  disabled = false,
}: { 
  label: string; 
  color?: 'purple' | 'blue';
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const classes =
    color === 'blue'
      ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
      : 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500';

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`w-full px-4 py-2 rounded-lg text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 ${classes}`}
    >
      {pending ? 'Enviando...' : label}
    </button>
  );
}

function FormMessage({ state }: { state: FormState }) {
  if (!state?.message) return null;
  return (
    <p
      className={`text-sm font-medium ${
        state.ok ? 'text-green-600' : 'text-red-600'
      }`}
    >
      {state.message}
    </p>
  );
}

