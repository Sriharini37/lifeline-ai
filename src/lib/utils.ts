export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export function getCurrentPosition(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported by this device.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => reject(new Error(err.message || 'Could not get location.')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  });
}

export function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export function priorityColor(p: string): {
  text: string;
  bg: string;
  border: string;
  dot: string;
  ring: string;
} {
  switch (p) {
    case 'CRITICAL':
      return { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/40', dot: 'bg-red-500', ring: 'ring-red-500/30' };
    case 'HIGH':
      return { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/40', dot: 'bg-orange-500', ring: 'ring-orange-500/30' };
    case 'MODERATE':
      return { text: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/40', dot: 'bg-amber-400', ring: 'ring-amber-500/30' };
    case 'LOW':
      return { text: 'text-sky-300', bg: 'bg-sky-500/10', border: 'border-sky-500/40', dot: 'bg-sky-400', ring: 'ring-sky-500/30' };
    default:
      return { text: 'text-slate-300', bg: 'bg-slate-500/10', border: 'border-slate-500/40', dot: 'bg-slate-400', ring: 'ring-slate-500/30' };
  }
}

export function statusColor(s: string): { text: string; bg: string; border: string } {
  switch (s) {
    case 'PENDING':
      return { text: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
    case 'REVIEWING':
      return { text: 'text-sky-300', bg: 'bg-sky-500/10', border: 'border-sky-500/30' };
    case 'DISPATCHED':
      return { text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
    case 'RESOLVED':
      return { text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30' };
    default:
      return { text: 'text-slate-300', bg: 'bg-slate-500/10', border: 'border-slate-500/30' };
  }
}
