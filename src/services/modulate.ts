// ===========================================
// MODULATE VELMA-2 INTEGRATION
// Voice intelligence: emotion detection, speaker diarization, PII tagging
// ===========================================

const MODULATE_API_KEY = process.env.MODULATE_API_KEY || '';
const BATCH_URL = 'https://modulate-developer-apis.com/api/velma-2-stt-batch';
// Streaming URL for future real-time integration:
// wss://modulate-developer-apis.com/api/velma-2-stt-streaming

// ===========================================
// TYPES
// ===========================================

export interface VelmaUtterance {
  utterance_uuid: string;
  text: string;
  start_ms: number;
  duration_ms: number;
  speaker: number;
  language: string;
  emotion: string | null;
  accent: string | null;
}

export interface VelmaBatchResult {
  text: string;
  duration_ms: number;
  utterances: VelmaUtterance[];
}

export interface VoiceIntelligence {
  emotions: Record<string, number>;
  dominantEmotion: string;
  speakerCount: number;
  piiDetected: boolean;
  utteranceCount: number;
  durationMs: number;
  emotionTimeline: Array<{ time_ms: number; emotion: string; speaker: number; text: string }>;
}

// ===========================================
// CONFIG CHECK
// ===========================================

export function isModulateConfigured(): boolean {
  return Boolean(MODULATE_API_KEY);
}

// ===========================================
// BATCH ANALYSIS (post-call)
// ===========================================

export async function analyzeBatchAudio(audioBuffer: Buffer, filename: string): Promise<VelmaBatchResult | null> {
  if (!isModulateConfigured()) {
    console.log('[Modulate] Not configured, skipping batch analysis');
    return null;
  }

  try {
    const formData = new FormData();
    formData.append('upload_file', new Blob([new Uint8Array(audioBuffer)]), filename);
    formData.append('speaker_diarization', 'true');
    formData.append('emotion_signal', 'true');
    formData.append('accent_signal', 'true');
    formData.append('pii_phi_tagging', 'true');

    const response = await fetch(BATCH_URL, {
      method: 'POST',
      headers: { 'X-API-Key': MODULATE_API_KEY },
      body: formData,
    });

    if (!response.ok) {
      console.error(`[Modulate] Batch API error ${response.status}: ${await response.text()}`);
      return null;
    }

    const result = await response.json() as VelmaBatchResult;
    console.log(`[Modulate] Batch analysis complete: ${result.utterances.length} utterances, ${result.duration_ms}ms`);
    return result;
  } catch (error) {
    console.error('[Modulate] Batch analysis failed:', error);
    return null;
  }
}

// ===========================================
// MOCK DATA (for hackathon demo)
// ===========================================

export function generateMockVoiceIntelligence(success: boolean): VoiceIntelligence {
  const emotions: Record<string, number> = success
    ? { Neutral: 8, Cooperative: 4, Interested: 3, Relieved: 2 }
    : { Neutral: 6, Frustrated: 4, Resistant: 3, Concerned: 2 };

  return {
    emotions,
    dominantEmotion: success ? 'Cooperative' : 'Frustrated',
    speakerCount: 2,
    piiDetected: false,
    utteranceCount: success ? 17 : 12,
    durationMs: success ? 245000 : 180000,
    emotionTimeline: [
      { time_ms: 0, emotion: 'Neutral', speaker: 1, text: 'Thank you for calling...' },
      { time_ms: 15000, emotion: 'Neutral', speaker: 2, text: 'I\'m calling about my account...' },
      { time_ms: 45000, emotion: success ? 'Interested' : 'Resistant', speaker: 1, text: success ? 'Let me see what I can do...' : 'Your plan is already competitive...' },
      { time_ms: 90000, emotion: success ? 'Cooperative' : 'Frustrated', speaker: 1, text: success ? 'I found a loyalty discount...' : 'I understand your concern but...' },
      { time_ms: 120000, emotion: success ? 'Relieved' : 'Concerned', speaker: 2, text: success ? 'That sounds great...' : 'I may need to switch providers...' },
    ],
  };
}

// ===========================================
// AGGREGATE VOICE INTELLIGENCE
// ===========================================

export function buildVoiceIntelligence(utterances: VelmaUtterance[]): VoiceIntelligence {
  const emotions: Record<string, number> = {};
  const speakers = new Set<number>();
  let piiDetected = false;
  const emotionTimeline: VoiceIntelligence['emotionTimeline'] = [];

  for (const u of utterances) {
    speakers.add(u.speaker);

    if (u.emotion) {
      emotions[u.emotion] = (emotions[u.emotion] || 0) + 1;
      emotionTimeline.push({
        time_ms: u.start_ms,
        emotion: u.emotion,
        speaker: u.speaker,
        text: u.text,
      });
    }

    if (u.text && (u.text.includes('[PII]') || u.text.includes('[PHI]'))) {
      piiDetected = true;
    }
  }

  let dominantEmotion = 'Neutral';
  let maxCount = 0;
  for (const [emotion, count] of Object.entries(emotions)) {
    if (count > maxCount) {
      maxCount = count;
      dominantEmotion = emotion;
    }
  }

  const lastUtterance = utterances[utterances.length - 1];
  const durationMs = lastUtterance ? lastUtterance.start_ms + lastUtterance.duration_ms : 0;

  return {
    emotions,
    dominantEmotion,
    speakerCount: speakers.size,
    piiDetected,
    utteranceCount: utterances.length,
    durationMs,
    emotionTimeline,
  };
}
