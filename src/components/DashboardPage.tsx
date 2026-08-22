import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Siren, Search, Filter, Loader2, MapPin, Clock,
  AlertTriangle, ShieldAlert, CheckCircle2, Radio, X, ChevronRight,
  Activity, User, Phone, RefreshCw, TrendingUp, Inbox,
} from 'lucide-react';
import { supabase, type Incident, type IncidentStatus } from '@/lib/supabase';
import { formatRelativeTime, priorityColor, statusColor } from '@/lib/utils';
import type { Priority } from '@/lib/supabase';

const PRIORITY_FILTERS: (Priority | 'ALL')[] = ['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW', 'UNKNOWN'];
const STATUS_OPTIONS: (IncidentStatus | 'ALL')[] = ['ALL', 'PENDING', 'REVIEWING', 'DISPATCHED', 'RESOLVED'];

export default function DashboardPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Incident | null>(null);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setError('Could not load incidents.');
    } else {
      setIncidents((data as Incident[]) || []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchIncidents();

    // Realtime subscription
    const channel = supabase
      .channel('incidents-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => {
        fetchIncidents();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchIncidents]);

  // Keep selected incident in sync with updates
  useEffect(() => {
    if (selected) {
      const updated = incidents.find((i) => i.id === selected.id);
      if (updated && updated !== selected) setSelected(updated);
    }
  }, [incidents, selected]);

  const filtered = incidents.filter((i) => {
    if (priorityFilter !== 'ALL' && i.priority !== priorityFilter) return false;
    if (statusFilter !== 'ALL' && i.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${i.description} ${i.incident_type ?? ''} ${i.location_label ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const counts = {
    CRITICAL: incidents.filter((i) => i.priority === 'CRITICAL').length,
    HIGH: incidents.filter((i) => i.priority === 'HIGH').length,
    MODERATE: incidents.filter((i) => i.priority === 'MODERATE').length,
    LOW: incidents.filter((i) => i.priority === 'LOW').length,
    UNKNOWN: incidents.filter((i) => i.priority === 'UNKNOWN').length,
  };
  const pending = incidents.filter((i) => i.status === 'PENDING').length;
  const dispatched = incidents.filter((i) => i.status === 'DISPATCHED').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/3 h-[400px] w-[400px] rounded-full bg-sky-600/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5 text-sky-400" />
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Emergency Control Room</h1>
            </div>
            <p className="mt-1 text-sm text-slate-400">Live incident triage and dispatch console</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs font-medium text-emerald-300">Live</span>
            </div>
            <button
              onClick={fetchIncidents}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Active" value={incidents.length} icon={<Inbox className="h-4 w-4" />} accent="text-sky-300" />
          <StatCard label="Pending" value={pending} icon={<Clock className="h-4 w-4" />} accent="text-amber-300" />
          <StatCard label="Dispatched" value={dispatched} icon={<Radio className="h-4 w-4" />} accent="text-emerald-300" />
          <StatCard label="Critical" value={counts.CRITICAL} icon={<AlertTriangle className="h-4 w-4" />} accent="text-red-400" dot="bg-red-500" />
          <StatCard label="High" value={counts.HIGH} icon={<TrendingUp className="h-4 w-4" />} accent="text-orange-400" dot="bg-orange-500" />
          <StatCard label="Unknown" value={counts.UNKNOWN} icon={<ShieldAlert className="h-4 w-4" />} accent="text-slate-300" dot="bg-slate-400" />
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description, type, location..."
              className="w-full rounded-lg border border-slate-700 bg-slate-900/60 py-2.5 pl-10 pr-3 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-sky-500/50"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            {PRIORITY_FILTERS.map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  priorityFilter === p
                    ? p === 'ALL'
                      ? 'border-sky-500/50 bg-sky-500/20 text-sky-300'
                      : `${priorityColor(p).border} ${priorityColor(p).bg} ${priorityColor(p).text}`
                    : 'border-slate-700 bg-slate-900/40 text-slate-400 hover:text-slate-300'
                }`}
              >
                {p === 'ALL' ? 'All priorities' : p}
              </button>
            ))}
            <div className="mx-1 h-5 w-px bg-slate-700" />
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  statusFilter === s
                    ? s === 'ALL'
                      ? 'border-sky-500/50 bg-sky-500/20 text-sky-300'
                      : `${statusColor(s).border} ${statusColor(s).bg} ${statusColor(s).text}`
                    : 'border-slate-700 bg-slate-900/40 text-slate-400 hover:text-slate-300'
                }`}
              >
                {s === 'ALL' ? 'All status' : s}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        )}

        {/* Incident list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 py-16 text-center">
            <Inbox className="mx-auto mb-3 h-10 w-10 text-slate-600" />
            <p className="text-sm text-slate-400">No incidents match your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((inc) => (
              <IncidentCard key={inc.id} incident={inc} onClick={() => setSelected(inc)} />
            ))}
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <IncidentDetail
          incident={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => { fetchIncidents(); }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon, accent, dot }: { label: string; value: number; icon: React.ReactNode; accent: string; dot?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{label}</span>
        {dot ? <span className={`h-2 w-2 rounded-full ${dot}`} /> : <span className={accent}>{icon}</span>}
      </div>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function IncidentCard({ incident, onClick }: { incident: Incident; onClick: () => void }) {
  const pc = priorityColor(incident.priority);
  const sc = statusColor(incident.status);
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border ${pc.border} bg-slate-900/60 p-4 text-left transition hover:border-slate-600 hover:bg-slate-900`}
    >
      {/* priority stripe */}
      <div className={`absolute left-0 top-0 h-full w-1 ${pc.dot}`} />
      <div className="pl-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${pc.dot} ${incident.priority === 'CRITICAL' ? 'animate-pulse' : ''}`} />
            <span className={`text-xs font-bold uppercase tracking-wide ${pc.text}`}>{incident.priority}</span>
            <span className={`rounded-md border ${sc.border} ${sc.bg} px-1.5 py-0.5 text-[10px] font-medium ${sc.text}`}>
              {incident.status}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">{formatRelativeTime(incident.created_at)}</span>
        </div>

        <p className="mt-2 line-clamp-2 text-sm text-slate-200">{incident.description}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
          {incident.incident_type && incident.incident_type !== 'Unknown' && (
            <span className="rounded-md border border-slate-700 bg-slate-800/60 px-2 py-0.5">{incident.incident_type}</span>
          )}
          {incident.location_label && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {incident.location_label}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Activity className="h-3 w-3" /> {incident.confidence}% conf.
          </span>
        </div>
      </div>
    </button>
  );
}

function IncidentDetail({ incident, onClose, onUpdated }: { incident: Incident; onClose: () => void; onUpdated: () => void }) {
  const pc = priorityColor(incident.priority);
  const sc = statusColor(incident.status);
  const [updating, setUpdating] = useState(false);
  const [dispatchNote, setDispatchNote] = useState(incident.dispatch_note ?? '');
  const [updateError, setUpdateError] = useState<string | null>(null);

  const updateStatus = async (status: IncidentStatus) => {
    setUpdating(true);
    setUpdateError(null);
    const { error } = await supabase
      .from('incidents')
      .update({ status, dispatch_note: dispatchNote || null })
      .eq('id', incident.id);
    if (error) {
      setUpdateError('Could not update incident status.');
    } else {
      onUpdated();
    }
    setUpdating(false);
  };

  const ef = incident.extracted_fields || {};

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full w-full max-w-lg overflow-y-auto border-l border-slate-800 bg-slate-950 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 px-5 py-4 backdrop-blur">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Siren className={`h-5 w-5 ${pc.text}`} />
              <h2 className="text-base font-bold">Incident {incident.id.slice(0, 8).toUpperCase()}</h2>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border ${pc.border} ${pc.bg} px-3 py-1 text-xs font-bold ${pc.text}`}>
              {incident.priority}
            </span>
            <span className={`rounded-full border ${sc.border} ${sc.bg} px-3 py-1 text-xs font-medium ${sc.text}`}>
              {incident.status}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <Clock className="h-3 w-3" /> {formatRelativeTime(incident.created_at)}
            </span>
          </div>
        </div>

        <div className="space-y-4 px-5 py-4">
          {/* Description */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="mb-1 text-xs font-medium text-slate-500">Description</p>
            <p className="text-sm leading-relaxed text-slate-200">{incident.description}</p>
          </div>

          {/* AI Triage */}
          <div className={`rounded-xl border ${pc.border} ${pc.bg} p-4`}>
            <div className="mb-3 flex items-center gap-2">
              <ShieldAlert className={`h-4 w-4 ${pc.text}`} />
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-200">AI Triage Output</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DetailField label="Incident Type" value={incident.incident_type ?? 'Unknown'} />
              <DetailField label="Confidence" value={`${incident.confidence}%`} />
            </div>

            {incident.severity_signals && incident.severity_signals.length > 0 && (
              <div className="mt-3">
                <p className="mb-1.5 text-xs text-slate-500">Severity signals</p>
                <div className="flex flex-wrap gap-1.5">
                  {incident.severity_signals.map((s, i) => (
                    <span key={i} className="rounded-md border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-xs text-slate-300">{s}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3">
              <p className="mb-1.5 text-xs text-slate-500">Extracted details</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <DetailField label="People" value={ef.peopleCount != null ? String(ef.peopleCount) : 'Unknown'} />
                <DetailField label="Consciousness" value={ef.consciousness ?? 'Unknown'} />
                <DetailField label="Breathing" value={ef.breathing ?? 'Unknown'} />
                <DetailField label="Bleeding" value={ef.bleeding == null ? 'Unknown' : ef.bleeding ? 'Yes' : 'No'} />
                <DetailField label="Vehicle" value={ef.vehicleType ?? 'Unknown'} />
                <DetailField label="Hazard" value={ef.hazard ?? 'None'} />
                <DetailField label="Age group" value={ef.ageGroup ?? 'Unknown'} />
                <DetailField label="Trapped" value={ef.trapped == null ? 'Unknown' : ef.trapped ? 'Yes' : 'No'} />
              </div>
            </div>

            {incident.missing_information && incident.missing_information.length > 0 && (
              <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5" /> Missing information
                </p>
                <ul className="list-inside list-disc text-xs text-amber-200/70">
                  {incident.missing_information.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              </div>
            )}

            {incident.reasoning && incident.reasoning.length > 0 && (
              <div className="mt-3">
                <p className="mb-1.5 text-xs text-slate-500">AI reasoning</p>
                <ul className="space-y-1">
                  {incident.reasoning.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-slate-400">
                      <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-slate-600" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-3 text-xs text-amber-400/70">
              <AlertTriangle className="mr-1 inline h-3 w-3" />
              AI output is decision support only. Not a medical diagnosis.
            </p>
          </div>

          {/* Location */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="mb-2 text-xs font-medium text-slate-500">Location</p>
            {incident.location_label && (
              <p className="mb-1 flex items-center gap-1.5 text-sm text-slate-200">
                <MapPin className="h-4 w-4 text-sky-400" /> {incident.location_label}
              </p>
            )}
            {incident.latitude != null && incident.longitude != null ? (
              <a
                href={`https://www.openstreetmap.org/?mlat=${incident.latitude}&mlon=${incident.longitude}&zoom=16`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-sky-400 hover:underline"
              >
                GPS: {incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)} — View on map
              </a>
            ) : (
              <p className="text-xs text-slate-500">No GPS coordinates provided.</p>
            )}
          </div>

          {/* Reporter */}
          {(incident.reporter_name || incident.reporter_phone) && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="mb-2 text-xs font-medium text-slate-500">Reporter</p>
              {incident.reporter_name && (
                <p className="flex items-center gap-1.5 text-sm text-slate-200">
                  <User className="h-4 w-4 text-slate-500" /> {incident.reporter_name}
                </p>
              )}
              {incident.reporter_phone && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-200">
                  <Phone className="h-4 w-4 text-slate-500" /> {incident.reporter_phone}
                </p>
              )}
            </div>
          )}

          {/* Dispatch controls */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="mb-2 text-xs font-medium text-slate-500">Operator actions</p>
            <textarea
              value={dispatchNote}
              onChange={(e) => setDispatchNote(e.target.value)}
              placeholder="Add a dispatch note (e.g. Ambulance #14 dispatched, ETA 8 min)..."
              rows={2}
              className="mb-3 w-full resize-none rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-sky-500/50"
            />
            {updateError && (
              <p className="mb-2 flex items-center gap-1.5 text-xs text-red-400">
                <AlertTriangle className="h-3.5 w-3.5" /> {updateError}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => updateStatus('REVIEWING')}
                disabled={updating}
                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-300 transition hover:bg-sky-500/20 disabled:opacity-50"
              >
                <Activity className="h-3.5 w-3.5" /> Mark Reviewing
              </button>
              <button
                onClick={() => updateStatus('DISPATCHED')}
                disabled={updating}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
              >
                <Radio className="h-3.5 w-3.5" /> Dispatch
              </button>
              <button
                onClick={() => updateStatus('RESOLVED')}
                disabled={updating}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800/60 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
              </button>
            </div>
            {updating && <Loader2 className="mt-2 h-4 w-4 animate-spin text-slate-400" />}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/40 px-2.5 py-1.5">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium capitalize text-slate-300">{value}</span>
    </div>
  );
}
