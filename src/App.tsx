import { useState, useEffect } from 'react';
import { Siren, LayoutDashboard, Activity } from 'lucide-react';
import SOSPage from '@/components/SOSPage';
import DashboardPage from '@/components/DashboardPage';

type View = 'sos' | 'dashboard';

function App() {
  const [view, setView] = useState<View>(() => {
    const hash = window.location.hash.replace('#/', '');
    return hash === 'dashboard' ? 'dashboard' : 'sos';
  });

  useEffect(() => {
    window.location.hash = `/${view}`;
  }, [view]);

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      setView(hash === 'dashboard' ? 'dashboard' : 'sos');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Top nav */}
      <nav className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <button
            onClick={() => setView('sos')}
            className="flex items-center gap-2"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-red-800 shadow-lg shadow-red-600/20">
              <Siren className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-slate-100">
              LifeLine <span className="text-red-500">AI</span>
            </span>
          </button>

          <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
            <button
              onClick={() => setView('sos')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                view === 'sos'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Siren className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">SOS</span>
            </button>
            <button
              onClick={() => setView('dashboard')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                view === 'dashboard'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Control Room</span>
            </button>
          </div>
        </div>
      </nav>

      {view === 'sos' ? <SOSPage /> : <DashboardPage />}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-4 py-6 text-center">
        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-600">
          <Activity className="h-3 w-3" />
          LifeLine AI — AI-Assisted Emergency Response &amp; Triage Platform
        </p>
        <p className="mt-1 text-xs text-slate-700">
          AI-assisted prioritization only. Not a medical diagnosis. Emergency decisions require human review.
        </p>
      </footer>
    </div>
  );
}

export default App;
