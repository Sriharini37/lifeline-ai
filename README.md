# LifeLine AI — AI-Assisted Emergency Response &amp; Triage Platform

> In India, delays in emergency medical response routinely cost lives. LifeLine AI is a centralized emergency response platform where a bystander or patient triggers an SOS, briefly describes what's happening, and an AI triage engine helps the control room prioritize the response.

## The problem

Emergency requests are fragmented and hard to communicate. A centralized platform lets a bystander (like "Priya") trigger an SOS, describe the emergency in plain language (typed or spoken), and have the information processed for emergency response — with AI-assisted triage to help the response team prioritize.

## The core AI challenge: Emergency triage

The system determines the urgency of an incoming emergency request. For example:

> **Input:** "There has been a bike accident. One person is lying on the road and bleeding."
>
> **Output:** CRITICAL — Road Accident — Ambulance Required — Confidence 82%

## The non-negotiable safety rule

This is emergency triage. **A misclassification is not a bad recommendation — it is a delayed ambulance.**

So the system never presents an AI prediction as a medical diagnosis or final emergency decision. When the AI cannot confidently determine severity, it returns **UNKNOWN** priority and escalates for human review instead of guessing — a confident wrong answer is worse than no answer.

## Features

### Public SOS interface
- Large, prominent SOS entry point
- **Voice input** (speech-to-text) — no need to type during an emergency
- **Automatic GPS location** detection
- **Plain-language description** — type or speak what's happening
- **Live AI triage output** before submission: priority, confidence, severity signals, extracted details, missing information, and reasoning
- **"I don't know" safety mode** — vague descriptions are flagged UNKNOWN, not guessed as low risk
- Clear, ever-present disclaimer: *AI-assisted prioritization only. Not a medical diagnosis.*

### Emergency Control Room (dashboard)
- **Live incident feed** with realtime updates (Supabase Realtime)
- **Stats overview**: active, pending, dispatched, critical, high, unknown counts
- **Priority & status filters** and full-text search
- **Incident detail drawer**: AI triage output, extracted fields, missing info, AI reasoning, GPS map link, reporter contact
- **Operator actions**: mark reviewing, dispatch (with note), resolve
- Color-coded priorities (CRITICAL / HIGH / MODERATE / LOW / UNKNOWN)

## How the AI triage works

The triage engine (`src/lib/triage.ts`) is a rule-based NLP system:

1. **Incident type classification** — matches keywords to categories (Road Accident, Cardiac, Fire, Fall, Drowning, Medical Emergency, Industrial, Assault, Unknown)
2. **Severity signal detection** — critical signals (unconscious, not breathing, severe bleeding, cardiac, trapped, fire, drowning) weighted heavily; moderate signals (bleeding, fracture, fall, seizure, allergic reaction, breathing difficulty) weighted moderately; low signals (minor injury, no injury) weighted lightly
3. **Field extraction** — people count, consciousness, breathing, bleeding, vehicle type, hazard, age group, trapped status
4. **Location extraction** — parses place names from the description ("near Gandhipuram signal")
5. **Missing information detection** — flags what couldn't be determined (critical for human review)
6. **Confidence scoring** — based on signal density and missing information; short/vague text is penalized
7. **Priority assignment** — CRITICAL (score ≥ 60), HIGH (≥ 30), MODERATE (≥ 15), LOW (> 0), UNKNOWN (0)
8. **Safety mode** — if confidence is below 40% and priority isn't already CRITICAL, the engine forces UNKNOWN and escalates for human review

## Tech stack

- **React + TypeScript + Vite** — frontend
- **Tailwind CSS** — styling (dark, emergency-themed UI)
- **lucide-react** — icons
- **Supabase** — database (incidents table), realtime updates
- **Web Speech API** — voice input (browser-native, no external API)
- **Geolocation API** — automatic GPS detection

## Database schema

Single `incidents` table with:
- Raw description, reporter info, GPS coordinates, location label
- AI output: incident type, priority, confidence, severity signals, extracted fields (JSON), missing information, reasoning
- Status tracking: PENDING → REVIEWING → DISPATCHED → RESOLVED
- RLS enabled (no-auth app — public SOS + shared control room)

## Local development

```bash
npm install
npm run dev
```

Supabase environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are pre-populated in `.env`.

## Build

```bash
npm run build
npm run typecheck
```

## Safety disclaimer

This system provides **AI-assisted prioritization only**. It is **not a medical diagnosis**. Emergency decisions require human/authorized responder review. If life is in immediate danger, call **112** (India emergency number) directly.
