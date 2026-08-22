import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: { params: { eventsPerSecond: 10 } },
});

export type Priority = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'UNKNOWN';
export type IncidentStatus = 'PENDING' | 'REVIEWING' | 'DISPATCHED' | 'RESOLVED';

export interface ExtractedFields {
  peopleCount?: number | null;
  consciousness?: 'conscious' | 'unconscious' | 'unknown';
  bleeding?: boolean | null;
  breathing?: 'normal' | 'abnormal' | 'not-breathing' | 'unknown';
  hazard?: string | null;
  vehicleType?: string | null;
  ageGroup?: 'child' | 'adult' | 'elderly' | 'unknown';
  trapped?: boolean | null;
}

export interface Incident {
  id: string;
  description: string;
  reporter_name: string | null;
  reporter_phone: string | null;
  latitude: number | null;
  longitude: number | null;
  location_label: string | null;
  incident_type: string | null;
  priority: Priority;
  confidence: number;
  severity_signals: string[];
  extracted_fields: ExtractedFields;
  missing_information: string[];
  reasoning: string[];
  status: IncidentStatus;
  dispatch_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewIncident {
  description: string;
  reporter_name?: string | null;
  reporter_phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_label?: string | null;
  incident_type: string | null;
  priority: Priority;
  confidence: number;
  severity_signals: string[];
  extracted_fields: ExtractedFields;
  missing_information: string[];
  reasoning: string[];
  status: IncidentStatus;
}
