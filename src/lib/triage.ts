import type { ExtractedFields, Priority } from '@/lib/supabase';

export interface TriageResult {
  incidentType: string;
  priority: Priority;
  confidence: number;
  severitySignals: string[];
  extractedFields: ExtractedFields;
  missingInformation: string[];
  reasoning: string[];
}

/*
  LifeLine AI — Emergency Triage Engine

  This is a rule-based NLP triage engine. It is NOT a medical diagnosis.
  It produces decision-support output for a human operator. The single most
  important rule: when the engine cannot confidently determine severity, it
  returns UNKNOWN priority rather than guessing — a wrong classification can
  delay an ambulance.

  Scoring philosophy:
    - Critical signals (unconscious, not breathing, severe bleeding, trapped,
      cardiac, fire with people) each add large weight.
    - Moderate signals (bleeding, conscious injury, fall) add moderate weight.
    - Low signals (minor injury, walking wounded) add small weight.
    - Confidence is derived from the density of decisive signals found vs. the
      amount of missing critical information. If few decisive signals are
      present, confidence drops and priority trends toward UNKNOWN.
*/

interface SignalDef {
  label: string;
  weight: number;
  patterns: RegExp[];
}

const CRITICAL_SIGNALS: SignalDef[] = [
  { label: 'Unconscious', weight: 35, patterns: [/unconscious/i, /knocked out/i, /passed out/i, /not responding/i, /no response/i, /unresponsive/i, /fainted/i, /blackout/i] },
  { label: 'Not breathing', weight: 35, patterns: [/not breathing/i, /no breath/i, /stopped breathing/i, /isn't breathing/i, /isnt breathing/i, /cannot breathe/i, /can't breathe/i] },
  { label: 'Severe bleeding', weight: 30, patterns: [/bleeding heavily/i, /bleeding a lot/i, /profusely/i, /blood everywhere/i, /losing blood/i, /heavy bleeding/i, /severe bleeding/i] },
  { label: 'Cardiac arrest', weight: 35, patterns: [/heart attack/i, /cardiac/i, /chest pain/i, /chest pressure/i, /heart stopped/i, /collapsed/i] },
  { label: 'Trapped', weight: 25, patterns: [/trapped/i, /pinned/i, /stuck under/i, /crushed/i, /cannot move/i, /can't move/i, /pinned under/i] },
  { label: 'Not moving', weight: 20, patterns: [/not moving/i, /isn't moving/i, /lying motionless/i, /motionless/i, /not responding/i] },
  { label: 'Fire with people', weight: 30, patterns: [/fire/i, /burning/i, /smoke/i, /flames/i, /explosion/i, /blast/i] },
  { label: 'Drowning', weight: 30, patterns: [/drowning/i, /underwater/i, /sinking/i, /submerged/i] },
  { label: 'Pregnancy emergency', weight: 25, patterns: [/pregnant.*bleeding/i, /pregnant.*pain/i, /miscarriage/i, /water broke/i, /in labour/i, /in labor/i, /contraction/i] },
];

const MODERATE_SIGNALS: SignalDef[] = [
  { label: 'Bleeding', weight: 15, patterns: [/bleeding/i, /blood/i, /cut/i, /wound/i, /gash/i, /laceration/i] },
  { label: 'Broken bone', weight: 15, patterns: [/broken.*bone/i, /fracture/i, /broke.*leg/i, /broke.*arm/i, /broke.*ankle/i, /dislocated/i] },
  { label: 'Fall', weight: 12, patterns: [/fell/i, /fallen/i, /fall from/i, /slipped/i, /tripped/i] },
  { label: 'Conscious injury', weight: 10, patterns: [/injured/i, /hurt/i, /pain/i, /twisted/i, /sprain/i, /bruise/i] },
  { label: 'Seizure', weight: 18, patterns: [/seizure/i, /convulsion/i, /fit/i, /epileptic/i] },
  { label: 'Allergic reaction', weight: 15, patterns: [/allergic/i, /allergy/i, /anaphylaxis/i, /swelling.*throat/i, /hives/i] },
  { label: 'Breathing difficulty', weight: 18, patterns: [/difficulty breathing/i, /short of breath/i, /wheezing/i, /asthma/i, /breathless/i, /struggling to breathe/i] },
  { label: 'Poisoning', weight: 18, patterns: [/poison/i, /overdose/i, /swallowed.*chemical/i, /ingested/i, /toxic/i] },
  { label: 'Heat stroke', weight: 15, patterns: [/heat stroke/i, /heatstroke/i, /heat exhaustion/i, /dehydrated/i, /fainted.*heat/i] },
];

const LOW_SIGNALS: SignalDef[] = [
  { label: 'Minor injury', weight: 5, patterns: [/minor.*injury/i, /small.*cut/i, /scrape/i, /scratch/i, /walking.*wounded/i, /walking wounded/i, /okay.*but/i, /alert.*and.*talking/i] },
  { label: 'No injury reported', weight: 2, patterns: [/no one hurt/i, /no injuries/i, /everyone.*okay/i, /everyone.*fine/i, /no one injured/i] },
];

const INCIDENT_TYPE_PATTERNS: { type: string; patterns: RegExp[] }[] = [
  { type: 'Road Accident', patterns: [/accident/i, /crash/i, /collision/i, /bike/i, /car/i, /truck/i, /bus/i, /vehicle/i, /motorcycle/i, /scooter/i, /auto.*rickshaw/i, /hit.*by/i, /run over/i, /road/i] },
  { type: 'Cardiac Emergency', patterns: [/heart attack/i, /cardiac/i, /chest pain/i, /heart/i] },
  { type: 'Fire', patterns: [/fire/i, /burning/i, /smoke/i, /flames/i, /blaze/i] },
  { type: 'Fall', patterns: [/fell/i, /fallen/i, /fall from/i, /slipped/i, /tripped/i] },
  { type: 'Drowning', patterns: [/drowning/i, /underwater/i, /sinking/i, /pool/i, /river/i, /lake/i, /beach/i] },
  { type: 'Medical Emergency', patterns: [/seizure/i, /stroke/i, /diabetic/i, /fainted/i, /unconscious/i, /breathing/i, /allergic/i, /poison/i, /overdose/i, /pregnant/i, /vomit/i, /fever/i] },
  { type: 'Industrial Accident', patterns: [/factory/i, /construction/i, /site/i, /machinery/i, /warehouse/i, /workshop/i, /chemical/i] },
  { type: 'Assault/Violence', patterns: [/assault/i, /attacked/i, /stabbed/i, /shot/i, /fight/i, /violence/i, /robbery/i] },
];

const VEHICLE_PATTERNS: { type: string; patterns: RegExp[] }[] = [
  { type: 'Bike', patterns: [/bike/i, /bicycle/i, /cycle/i] },
  { type: 'Motorcycle', patterns: [/motorcycle/i, /motorbike/i, /scooter/i] },
  { type: 'Car', patterns: [/car/i, /sedan/i, /suv/i, /hatchback/i] },
  { type: 'Truck', patterns: [/truck/i, /lorry/i] },
  { type: 'Bus', patterns: [/bus/i] },
  { type: 'Auto-rickshaw', patterns: [/auto/i, /rickshaw/i] },
];

const HAZARD_PATTERNS: { hazard: string; patterns: RegExp[] }[] = [
  { hazard: 'Fire', patterns: [/fire/i, /burning/i, /flames/i] },
  { hazard: 'Smoke', patterns: [/smoke/i] },
  { hazard: 'Chemical', patterns: [/chemical/i, /gas leak/i, /leak/i, /fumes/i] },
  { hazard: 'Traffic', patterns: [/traffic/i, /road block/i, /jam/i] },
  { hazard: 'Electric', patterns: [/electric/i, /wire/i, /shock/i, /live wire/i] },
  { hazard: 'Water', patterns: [/water/i, /flood/i, /pool/i, /river/i] },
];

function matchSignals(text: string, defs: SignalDef[]): { label: string; weight: number }[] {
  const found: { label: string; weight: number }[] = [];
  for (const def of defs) {
    if (def.patterns.some((p) => p.test(text))) {
      found.push({ label: def.label, weight: def.weight });
    }
  }
  return found;
}

function detectIncidentType(text: string): string {
  for (const def of INCIDENT_TYPE_PATTERNS) {
    if (def.patterns.some((p) => p.test(text))) return def.type;
  }
  return 'Unknown';
}

function detectVehicle(text: string): string | null {
  for (const def of VEHICLE_PATTERNS) {
    if (def.patterns.some((p) => p.test(text))) return def.type;
  }
  return null;
}

function detectHazard(text: string): string | null {
  for (const def of HAZARD_PATTERNS) {
    if (def.patterns.some((p) => p.test(text))) return def.hazard;
  }
  return null;
}

function detectPeopleCount(text: string): number | null {
  const multi = text.match(/(\d+)\s*(?:people|persons|victims|injured|casualties|riders|passengers)/i);
  if (multi) return parseInt(multi[1], 10);
  if (/\b(two|three|four|five|several|multiple|many)\b/i.test(text) && /people|persons|injured|victims|riders/i.test(text)) {
    const words: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, several: 4, multiple: 4, many: 5 };
    const m = text.match(/\b(two|three|four|five|several|multiple|many)\b/i);
    if (m) return words[m[1].toLowerCase()] ?? null;
  }
  if (/\bone\b/i.test(text) && /person|man|woman|guy|lady|person lying|individual/i.test(text)) return 1;
  return null;
}

function detectConsciousness(text: string): ExtractedFields['consciousness'] {
  if (/unconscious|knocked out|passed out|not responding|unresponsive|fainted|motionless|not moving|coma/i.test(text)) return 'unconscious';
  if (/conscious|awake|alert|talking|responding|aware|alive|sitting|standing|walking/i.test(text)) return 'conscious';
  return 'unknown';
}

function detectBleeding(text: string): boolean | null {
  if (/bleeding|blood|profusely|gash|laceration|wound.*blood/i.test(text)) return true;
  if (/no bleeding|not bleeding|no blood/i.test(text)) return false;
  return null;
}

function detectBreathing(text: string): ExtractedFields['breathing'] {
  if (/not breathing|no breath|stopped breathing|isn't breathing|isnt breathing|cannot breathe|can't breathe/i.test(text)) return 'not-breathing';
  if (/difficulty breathing|short of breath|wheezing|breathless|struggling to breathe|abnormal breathing/i.test(text)) return 'abnormal';
  if (/breathing normally|breathing fine|breathing okay|breathing ok/i.test(text)) return 'normal';
  return 'unknown';
}

function detectAgeGroup(text: string): ExtractedFields['ageGroup'] {
  if (/child|kid|baby|infant|toddler|young/i.test(text)) return 'child';
  if (/elderly|old man|old woman|senior|aged/i.test(text)) return 'elderly';
  if (/man|woman|guy|lady|adult/i.test(text)) return 'adult';
  return 'unknown';
}

function detectTrapped(text: string): boolean | null {
  if (/trapped|pinned|stuck under|crushed|cannot move|can't move|pinned under/i.test(text)) return true;
  return null;
}

function detectLocation(text: string): string | null {
  const patterns = [
    /near\s+([A-Za-z0-9\s,'-]{3,60}?)(?:[.,]|$)/i,
    /at\s+([A-Za-z0-9\s,'-]{3,60}?)(?:[.,]|$)/i,
    /on\s+([A-Za-z0-9\s,'-]{3,60}?\s+(?:road|street|avenue|lane|highway|bridge|junction|signal|circle))/i,
    /([A-Za-z0-9\s,'-]{3,60}?\s+(?:road|street|avenue|lane|highway|bridge|junction|signal|circle))/i,
    /([A-Za-z0-9\s,'-]{3,60}?\s+(?:station|hospital|school|college|market|mall|park|temple|church|mosque))/i,
  /in\s+([A-Za-z\s,'-]{3,40}?)(?:[.,]|$)/i,
  /([A-Za-z][A-Za-z\s,'-]{4,40})\s+(?:signal|junction|cross|naka|chowk|mandi)/i,
  /([A-Za-z][A-Za-z\s,'-]{4,40})\s+(?:signal|junction|cross|naka|chowk)/i,
  /(?:signal|junction|cross|naka|chowk)\s+(?:at|near)\s+([A-Za-z][A-Za-z\s,'-]{4,40})/i,
  /([A-Za-z][A-Za-z\s,'-]{4,40})\s+(?:bus stop|bus stand|bus depot)/i,
    /([A-Za-z][A-Za-z\s,'-]{4,40})\s+(?:bus stop|bus stand|bus depot|metro station|railway station)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) {
      const loc = m[1].trim().replace(/\s+/g, ' ');
      if (loc.length >= 3) return loc;
    }
  }
  return null;
}

export function triage(description: string): TriageResult {
  const text = description.trim();
  const severitySignals: string[] = [];
  const reasoning: string[] = [];
  let score = 0;

  const critical = matchSignals(text, CRITICAL_SIGNALS);
  const moderate = matchSignals(text, MODERATE_SIGNALS);
  const low = matchSignals(text, LOW_SIGNALS);

  for (const s of critical) {
    score += s.weight;
    severitySignals.push(s.label);
    reasoning.push(`Detected critical signal: "${s.label}" (+${s.weight}).`);
  }
  for (const s of moderate) {
    score += s.weight;
    severitySignals.push(s.label);
    reasoning.push(`Detected signal: "${s.label}" (+${s.weight}).`);
  }
  for (const s of low) {
    score += s.weight;
    severitySignals.push(s.label);
    reasoning.push(`Minor signal: "${s.label}" (+${s.weight}).`);
  }

  const incidentType = detectIncidentType(text);
  const extractedFields: ExtractedFields = {
    peopleCount: detectPeopleCount(text),
    consciousness: detectConsciousness(text),
    bleeding: detectBleeding(text),
    breathing: detectBreathing(text),
    hazard: detectHazard(text),
    vehicleType: detectVehicle(text),
    ageGroup: detectAgeGroup(text),
    trapped: detectTrapped(text),
  };

  const missingInformation: string[] = [];
  if (extractedFields.peopleCount === null) missingInformation.push('Number of people affected');
  if (extractedFields.consciousness === 'unknown') missingInformation.push('Consciousness state of victim(s)');
  if (extractedFields.breathing === 'unknown') missingInformation.push('Breathing status');
  if (extractedFields.bleeding === null) missingInformation.push('Whether there is bleeding');

  // Determine priority
  let priority: Priority;
  if (score >= 60) priority = 'CRITICAL';
  else if (score >= 30) priority = 'HIGH';
  else if (score >= 15) priority = 'MODERATE';
  else if (score > 0) priority = 'LOW';
  else priority = 'UNKNOWN';

  // Confidence: base on signal density and decisiveness.
  // More decisive signals found => higher confidence. Lots of missing critical
  // info => lower confidence. Very short or vague text => lower confidence.
  let confidence = 0;
  const decisiveSignals = critical.length + moderate.length;
  if (decisiveSignals > 0) {
    confidence = Math.min(95, 45 + decisiveSignals * 12 - missingInformation.length * 6);
  }
  // Penalize very short descriptions
  if (text.length < 25) confidence = Math.min(confidence, 30);
  // Penalize empty/vague
  if (score === 0) confidence = 0;
  confidence = Math.max(0, confidence);

  // SAFETY MODE: if confidence is low and we lack decisive signals, force UNKNOWN
  // rather than risk a wrong classification that delays an ambulance.
  if (confidence < 40 && priority !== 'CRITICAL') {
    reasoning.push('Confidence below safety threshold — insufficient decisive signals to classify severity. Escalating to UNKNOWN for human review.');
    priority = 'UNKNOWN';
  }

  // If no signals at all and incident type unknown, definitely UNKNOWN
  if (score === 0 && incidentType === 'Unknown') {
    reasoning.push('No emergency signals or incident type could be identified from the description. Human review required.');
    priority = 'UNKNOWN';
    confidence = 0;
  }

  if (incidentType !== 'Unknown') {
    reasoning.unshift(`Incident type classified as "${incidentType}" from keyword analysis.`);
  } else {
    reasoning.unshift('Could not confidently determine incident type from the description.');
  }

  reasoning.push(`Final priority: ${priority} (score ${score}, confidence ${confidence}%).`);

  return {
    incidentType,
    priority,
    confidence,
    severitySignals,
    extractedFields,
    missingInformation,
    reasoning,
  };
}

export function extractLocationLabel(description: string): string | null {
  return detectLocation(description);
}
