import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Siren, Mic, MapPin, Send, Loader2, AlertTriangle, ShieldAlert,
  Activity, CheckCircle2, Phone, User, ChevronRight, Info, X, Sparkles,
} from 'lucide-react';
import { supabase, type NewIncident, type Priority } from '@/lib/supabase';
import { triage, extractLocationLabel } from '@/lib/triage';
import { getCurrentPosition, priorityColor } from '@/lib/utils';
import type { TriageResult } from '@/lib/triage';

type Phase = 'idle' | 'listening' | 'analyzing' | 'result' | 'submitted';

const SAMPLE_DESCRIPTIONS = [
  'There has been a bike accident near Gandhipuram signal. One person is lying on the road and bleeding heavily, he is not responding.',
  'A man collapsed near the bus stand. He is not breathing and his eyes are closed.',
  'Someone fell down the stairs at the school. She is conscious but her leg is twisted and she is in pain.',
  'I can hear someone shouting for help but I do not know what happened.',
];

export default function SOSPage() {
  const [description, setDescription] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [geo, setGeo] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [recognized, setRecognized] = useState(false);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Request GPS on mount
  useEffect(() => {
    getCurrentPosition()
      .then((pos) => setGeo(pos))
      .catch((err) => setGeoError(err.message));
  }, []);

  const handleVoice = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSubmitError('Voice input is not supported in this browser. Please type instead.');
      return;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
    const rec = new SR();
    rec.lang = 'en-IN';
    rec.interimResults = true;
    rec.continuous = false;
    setPhase('listening');
    rec.onresult = (e: any) => {
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        final += e.results[i][0].transcript;
      }
      setDescription(final);
      setRecognized(true);
    };
    rec.onerror = () => {
      setPhase('idle');
      setSubmitError('Voice input failed. Please type your description.');
    };
    rec.onend = () => {
      setPhase('idle');
    };
    recognitionRef.current = rec;
    rec.start();
  }, []);

  const stopVoice = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
    setPhase('idle');
  }, []);

  const runTriage = useCallback(() => {
    if (description.trim().length < 5) return;
    setPhase('analyzing');
    setSubmitError(null);
    setTimeout(() => {
      const result = triage(description);
      setTriageResult(result);
      setPhase('result');
    }, 900);
  }, [description]);

  const submitIncident = async () => {
    if (!triageResult) return;
    setPhase('analyzing');
    setSubmitError(null);
    const locationLabel = extractLocationLabel(description);
    const newIncident: NewIncident = {
      description: description.trim(),
      reporter_name: reporterName.trim() || null,
      reporter_phone: reporterPhone.trim() || null,
      latitude: geo?.latitude ?? null,
      longitude: geo?.longitude ?? null,
      location_label: locationLabel,
      incident_type: triageResult.incidentType,
      priority: triageResult.priority,
      confidence: triageResult.confidence,
      severity_signals: triageResult.severitySignals,
      extracted_fields: triageResult.extractedFields,
      missing_information: triageResult.missingInformation,
      reasoning: triageResult.reasoning,
      status: 'PENDING',
    };
    const { data, error } = await supabase
      .from('incidents')
      .insert(newIncident)
      .select('id')
      .single();
    if (error || !data) {
      setPhase('result');
      setSubmitError('Could not submit your emergency request. Please try again or call 112 directly.');
      return;
    }
    setIncidentId(data.id);
    setPhase('submitted');
  };

  const reset = () => {
    setDescription('');
    setTriageResult(null);
    setPhase('idle');
    setIncidentId(null);
    setSubmitError(null);
    setRecognized(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-red-600/20 blur-[120px]" />
        <div className="absolute top-1/2 -right-40 h-[400px] w-[400px] rounded-full bg-orange-500/10 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-2xl px-5 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-red-400">
            <Siren className="h-3.5 w-3.5" />
            Emergency SOS
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            LifeLine <span className="text-red-500">AI</span>
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            Trigger an SOS and describe what's happening. Our AI helps prioritize your emergency for the response team.
          </p>
        </div>

        {/* Submitted confirmation */}
        {phase === 'submitted' && incidentId && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-emerald-300">SOS Received</h2>
            <p className="mt-1 text-sm text-slate-300">
              Your emergency request has been sent to the control room.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Incident ID: <span className="font-mono text-slate-300">{incidentId.slice(0, 8).toUpperCase()}</span>
            </p>
            {triageResult && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2">
                <span className={`h-2.5 w-2.5 rounded-full ${priorityColor(triageResult.priority).dot}`} />
                <span className="text-sm font-semibold">Priority: {triageResult.priority}</span>
              </div>
            )}
            <p className="mt-4 text-xs text-amber-400/80">
              <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
              AI output is decision support only. A human operator will review and dispatch help.
            </p>
            <button
              onClick={reset}
              className="mt-5 rounded-lg border border-slate-700 bg-slate-800 px-5 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
            >
              Submit another report
            </button>
          </div>
        )}

        {phase !== 'submitted' && (
          <>
            {/* Big SOS button */}
            {phase === 'idle' && !description && (
              <div className="mb-8 flex flex-col items-center">
                <button
                  onClick={() => textareaRef.current?.focus()}
                  className="group relative flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-red-800 shadow-[0_0_60px_-5px_rgba(239,68,68,0.6)] transition-transform hover:scale-105 active:scale-95"
                >
                  <span className="absolute inset-0 animate-ping rounded-full bg-red-500/30" style={{ animationDuration: '2s' }} />
                  <span className="relative flex flex-col items-center">
                    <Siren className="h-12 w-12 text-white" />
                    <span className="mt-1 text-lg font-bold tracking-wide text-white">SEND SOS</span>
                  </span>
                </button>
                <p className="mt-4 text-sm text-slate-400">Tap the button, then describe the emergency below.</p>
              </div>
            )}

            {/* Description input */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
                <Activity className="h-4 w-4 text-red-400" />
                Describe what's happening
              </label>
              <textarea
                ref={textareaRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="e.g. There has been a bike accident near Gandhipuram signal. One person is lying on the road and bleeding..."
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20"
              />

              {/* Voice button */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={phase === 'listening' ? stopVoice : handleVoice}
                  className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                    phase === 'listening'
                      ? 'border-red-500/50 bg-red-500/20 text-red-300 animate-pulse'
                      : 'border-slate-700 bg-slate-800/60 text-slate-200 hover:border-red-500/40 hover:bg-slate-800'
                  }`}
                >
                  <Mic className="h-4 w-4" />
                  {phase === 'listening' ? 'Listening... Tap to stop' : 'Speak instead'}
                </button>
                {recognized && (
                  <span className="text-xs text-emerald-400">Voice captured — review and submit</span>
                )}
              </div>

              {/* GPS status */}
              <div className="mt-3 flex items-center gap-2 text-xs">
                {geo ? (
                  <>
                    <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">
                      Location detected ({geo.latitude.toFixed(4)}, {geo.longitude.toFixed(4)})
                      {geo.accuracy ? ` ±${Math.round(geo.accuracy)}m` : ''}
                    </span>
                  </>
                ) : geoError ? (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-amber-400">Location unavailable: {geoError}. Please describe your location.</span>
                  </>
                ) : (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                    <span className="text-slate-400">Detecting your location...</span>
                  </>
                )}
              </div>

              {/* Sample descriptions */}
              {phase === 'idle' && !description && (
                <div className="mt-4 border-t border-slate-800 pt-3">
                  <p className="mb-2 text-xs font-medium text-slate-500">Try a sample:</p>
                  <div className="flex flex-col gap-1.5">
                    {SAMPLE_DESCRIPTIONS.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => { setDescription(s); textareaRef.current?.focus(); }}
                        className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-left text-xs text-slate-400 transition hover:border-slate-700 hover:text-slate-300"
                      >
                        "{s.length > 90 ? s.slice(0, 90) + '...' : s}"
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Analyze button */}
              {description.trim().length >= 5 && phase !== 'analyzing' && phase !== 'result' && (
                <button
                  onClick={runTriage}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-500"
                >
                  <Sparkles className="h-4 w-4" />
                  Analyze with AI
                </button>
              )}

              {phase === 'analyzing' && (
                <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-800/60 px-4 py-3 text-sm text-slate-300">
                  <Loader2 className="h-4 w-4 animate-spin text-red-400" />
                  AI is analyzing the emergency...
                </div>
              )}
            </div>

            {/* Triage result */}
            {phase === 'result' && triageResult && (
              <TriageResultCard result={triageResult} />
            )}

            {/* Reporter details + submit */}
            {phase === 'result' && triageResult && (
              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <p className="mb-3 text-sm font-medium text-slate-300">Your contact details (optional but helps responders reach you)</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      value={reporterName}
                      onChange={(e) => setReporterName(e.target.value)}
                      placeholder="Your name"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/60 py-2.5 pl-10 pr-3 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-red-500/50"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      value={reporterPhone}
                      onChange={(e) => setReporterPhone(e.target.value)}
                      placeholder="Phone number"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/60 py-2.5 pl-10 pr-3 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-red-500/50"
                    />
                  </div>
                </div>
                {submitError && (
                  <p className="mt-3 flex items-center gap-2 text-sm text-red-400">
                    <AlertTriangle className="h-4 w-4" /> {submitError}
                  </p>
                )}
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={submitIncident}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-500"
                  >
                    <Send className="h-4 w-4" />
                    Send to Control Room
                  </button>
                  <button
                    onClick={reset}
                    className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Safety disclaimer */}
            <div className="mt-6 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-300/80">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                AI-assisted prioritization only. Not a medical diagnosis. Emergency decisions require human/authorized responder review. If life is in immediate danger, also call <span className="font-bold">112</span> directly.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TriageResultCard({ result }: { result: TriageResult }) {
  const colors = priorityColor(result.priority);
  const isUnknown = result.priority === 'UNKNOWN';

  return (
    <div className={`mt-4 rounded-2xl border ${colors.border} ${colors.bg} p-5`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className={`h-5 w-5 ${colors.text}`} />
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-200">AI Triage Result</h3>
        </div>
        <span className={`rounded-full border ${colors.border} px-3 py-1 text-xs font-bold ${colors.text}`}>
          {result.priority}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
          <p className="text-xs text-slate-500">Incident Type</p>
          <p className="text-sm font-semibold text-slate-200">{result.incidentType}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
          <p className="text-xs text-slate-500">Confidence</p>
          <p className="text-sm font-semibold text-slate-200">{result.confidence}%</p>
        </div>
      </div>

      {/* Severity signals */}
      {result.severitySignals.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs text-slate-500">Detected signals</p>
          <div className="flex flex-wrap gap-1.5">
            {result.severitySignals.map((s, i) => (
              <span key={i} className="rounded-md border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-xs text-slate-300">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Extracted fields */}
      <div className="mt-3">
        <p className="mb-1.5 text-xs text-slate-500">Extracted details</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Field label="People" value={result.extractedFields.peopleCount != null ? String(result.extractedFields.peopleCount) : 'Unknown'} />
          <Field label="Consciousness" value={result.extractedFields.consciousness ?? 'Unknown'} />
          <Field label="Breathing" value={result.extractedFields.breathing ?? 'Unknown'} />
          <Field label="Bleeding" value={result.extractedFields.bleeding == null ? 'Unknown' : result.extractedFields.bleeding ? 'Yes' : 'No'} />
          <Field label="Vehicle" value={result.extractedFields.vehicleType ?? 'Unknown'} />
          <Field label="Hazard" value={result.extractedFields.hazard ?? 'None detected'} />
        </div>
      </div>

      {/* Missing info */}
      {result.missingInformation.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5" /> Missing information
          </p>
          <ul className="list-inside list-disc text-xs text-amber-200/70">
            {result.missingInformation.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}

      {/* Reasoning */}
      <div className="mt-3">
        <p className="mb-1.5 text-xs text-slate-500">Why this priority?</p>
        <ul className="space-y-1">
          {result.reasoning.map((r, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-slate-400">
              <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-slate-600" />
              {r}
            </li>
          ))}
        </ul>
      </div>

      {/* Unknown safety mode */}
      {isUnknown && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-slate-600 bg-slate-800/40 p-3 text-xs text-slate-300">
          <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <p>
            The AI cannot confidently determine the severity from the available information. This request will be flagged for <span className="font-semibold text-slate-200">human emergency review</span> — a confident wrong answer is worse than no answer.
          </p>
        </div>
      )}

      <p className="mt-4 text-xs text-amber-400/70">
        <Info className="mr-1 inline h-3 w-3" />
        AI output is decision support only — not a medical diagnosis.
      </p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/40 px-2.5 py-1.5">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium capitalize text-slate-300">{value}</span>
    </div>
  );
}
