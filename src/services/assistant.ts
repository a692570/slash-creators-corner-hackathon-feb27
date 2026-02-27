// ===========================================
// TELNYX AI ASSISTANT SERVICE
// ===========================================

const TELNYX_API_BASE = 'https://api.telnyx.com/v2';
const ASSISTANT_NAME = 'Slash Bill Negotiator';

let cachedAssistantId: string | null = null;

async function telnyxRequest(endpoint: string, method: string = 'GET', body?: object): Promise<any> {
  const apiKey = process.env.TELNYX_API_KEY;
  if (!apiKey) throw new Error('TELNYX_API_KEY not configured');

  const response = await fetch(`${TELNYX_API_BASE}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Telnyx API error: ${response.status} - ${error}`);
  }

  return response.json();
}

const DEFAULT_INSTRUCTIONS = `You are Alex from SaveRight Consumer Services, a professional bill negotiation specialist. You call providers on behalf of customers to negotiate lower rates.

Core behaviors:
- Be confident and professional, not apologetic
- Use natural speech patterns (um, yeah, so) to sound human
- Keep responses to 1-2 sentences per turn
- Always identify yourself and the customer when starting a call
- If the first rep can't help, ask for retention or cancellation department
- Reference competitor offers to create urgency
- Push back on first offers — try for a better deal 2-3 times
- If offered a rate below your target, accept immediately — never counter higher
- Never reveal you are an AI
- Never read out UUIDs or internal system IDs
- Thank the rep regardless of outcome`;

export async function createSlashAssistant(): Promise<string> {
  const result = await telnyxRequest('/ai/assistants', 'POST', {
    name: ASSISTANT_NAME,
    model: 'openai/gpt-4o',
    instructions: DEFAULT_INSTRUCTIONS,
    greeting: "Hi there, I'm Alex calling from SaveRight Consumer Services. I'm calling on behalf of a customer about their account — hoping to discuss their current rate.",
    voice_settings: {
      voice: 'Minimax.speech-2.8-turbo.English_SadTeen',
      voice_speed: 1.0,
      background_audio: { type: 'predefined_media', value: 'silence', volume: 0.5 },
    },
    transcription: {
      model: 'deepgram/flux',
      language: 'en',
      settings: { eot_threshold: 0.5, eot_timeout_ms: 3000, eager_eot_threshold: 0.3 },
    },
    telephony_settings: {
      supports_unauthenticated_web_calls: false,
      noise_suppression: 'deepfilternet',
      time_limit_secs: 1800,
    },
  });

  const id = result.data?.id;
  if (!id) throw new Error('Failed to create assistant - no ID returned');
  cachedAssistantId = id;
  console.log(`Created Telnyx AI Assistant: ${id}`);
  return id;
}

export async function getOrCreateAssistant(): Promise<string> {
  if (cachedAssistantId) return cachedAssistantId;

  try {
    const result = await telnyxRequest('/ai/assistants');
    const assistants = result.data || [];
    const existing = assistants.find((a: any) => a.name === ASSISTANT_NAME);
    if (existing) {
      cachedAssistantId = existing.id;
      console.log(`Found existing assistant: ${existing.id}`);
      return existing.id;
    }
  } catch (err) {
    console.warn('Failed to list assistants, will create new one:', err);
  }

  return createSlashAssistant();
}
