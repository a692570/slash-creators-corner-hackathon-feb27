// ===========================================
// MODULATE VELMA-2 INTEGRATION
// Voice intelligence: emotion detection, speaker diarization, PII tagging
// ===========================================

const MODULATE_API_KEY = process.env.MODULATE_API_KEY || '';
const BATCH_URL = 'https://modulate-developer-apis.com/api/velma-2-stt-batch';
// const STREAMING_URL = 'wss://modulate-developer-apis.com/api/velma-2-stt-streaming'; // Reserved for future streaming integration

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
    // Convert Buffer to Uint8Array for Blob compatibility
    const uint8Array = new Uint8Array(audioBuffer);
    formData.append('upload_file', new Blob([uint8Array]), filename);
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
