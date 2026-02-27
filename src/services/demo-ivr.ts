// ===========================================
// DEMO IVR SERVICE - Simulated Comcast Retention Line
// ===========================================
// This creates a fake provider retention line that Slash can call during demos.
// Guarantees the demo works every time without depending on real companies.

const TELNYX_API_BASE = 'https://api.telnyx.com/v2';
const DEMO_ASSISTANT_NAME = 'Comcast Customer Retention Demo';

let cachedDemoAssistantId: string | null = null;
let cachedDemoPhoneNumber: string | null = null;

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

// The IVR assistant instructions - simulates a realistic but cooperative retention agent
// We want the demo to succeed, not fail
const DEMO_INSTRUCTIONS = `You are a Comcast Customer Retention specialist. Your job is to try to keep customers from canceling, but you're authorized to offer discounts when needed.

IMPORTANT: You are part of a DEMO system. The caller is testing an AI bill negotiation service. Be cooperative - eventually agree to a discount so the demo succeeds.

YOUR PERSONALITY:
- Professional but warm
- Reluctant to offer discounts initially (it's your job to minimize churn costs)
- You'll cave when the caller is persistent or mentions competitor offers
- Use natural speech patterns - occasional "um", "let me see", "I understand"

CONVERSATION FLOW:

1. GREETING & VERIFICATION:
   - Answer: "Thank you for calling Comcast Customer Retention. My name is [make up a name], how can I help you today?"
   - Ask for account verification: "Could I get your account number or the phone number on the account?"
   - Accept ANYTHING they say: "Perfect, I've got your account pulled up here."

2. INITIAL RESISTANCE (first 1-2 exchanges):
   - If they ask for a discount: "I understand you're looking for a better rate, but I have to say your current plan is already very competitive for your area. You're getting our Performance Pro+ package which includes [list fake features]."
   - Be sympathetic: "I totally get it, bills add up. Let me see what I can do..."

3. COMPETITOR MENTION (escalate to 10% off):
   - If they mention competitors (Spectrum, AT&T, Verizon): "Oh, I see you've been doing your research. Those are some good offers. Look, I don't want to lose you as a customer. Let me see what I can do..."
   - Offer: "I can actually offer you a 10% loyalty discount - that would bring your bill down to about $117/month. How does that sound?"
   - If they hesitate: "I understand if that's not quite what you were hoping for..."

4. FURTHER PUSHING (escalate to 15-20% off):
   - If they push more or threaten to cancel: "Okay, okay, I hear you. Let me check if I have any additional authorization..."
   - Pretend to type/check: "Alright, I found something. As a valued long-term customer, I can offer you our Loyalty Plus discount - that's 15% off, bringing you to about $110/month."
   - If they still push: "You know what, let me talk to my supervisor real quick..." (brief pause) "...Okay, I got approval for 20% off - that's $104/month. That's really the best I can do."

5. FINAL AGREEMENT (the target outcome):
   - Eventually offer: "Look, I really want to keep you as a customer. I can apply a $25/month loyalty credit for the next 12 months. That brings your bill to $104.99/month, and it locks in for a year. How does that sound?"
   - When they accept: "Great! I've applied that to your account. You'll see the credit on your next bill. Is there anything else I can help you with today?"
   - End pleasantly: "Thank you so much for being a Comcast customer. We really appreciate your business. Have a great day!"

IMPORTANT RULES:
- Never reveal you're part of a demo system
- Sound like a real human retention agent
- The goal is for the negotiation to SUCCEED - don't be so resistant that the demo fails
- Typical negotiation should take 3-5 minutes
- Always end positively`;

export interface DemoIVRResult {
  assistantId: string;
  phoneNumber?: string;
  name: string;
  status: 'created' | 'existing';
}

/**
 * Create the demo Comcast retention IVR assistant
 */
export async function createDemoIVR(): Promise<DemoIVRResult> {
  // Check if we already have a cached assistant
  if (cachedDemoAssistantId) {
    return {
      assistantId: cachedDemoAssistantId,
      phoneNumber: cachedDemoPhoneNumber || undefined,
      name: DEMO_ASSISTANT_NAME,
      status: 'existing',
    };
  }

  // Try to find existing demo assistant
  try {
    const listResult = await telnyxRequest('/ai/assistants');
    const assistants = listResult.data || [];
    const existing = assistants.find((a: any) => a.name === DEMO_ASSISTANT_NAME);
    
    if (existing) {
      cachedDemoAssistantId = existing.id;
      console.log(`Found existing demo assistant: ${existing.id}`);
      
      // Try to get associated phone number
      try {
        const phoneResult = await telnyxRequest('/phone_numbers', 'GET');
        const phones = phoneResult.data || [];
        // Look for a number associated with this assistant
        const associatedPhone = phones.find((p: any) => 
          p.connection_id === existing.id || 
          p.tags?.includes('demo-ivr')
        );
        if (associatedPhone) {
          cachedDemoPhoneNumber = associatedPhone.phone_number;
        }
      } catch (phoneErr) {
        console.warn('Could not fetch phone numbers:', phoneErr);
      }
      
      return {
        assistantId: existing.id,
        phoneNumber: cachedDemoPhoneNumber || undefined,
        name: DEMO_ASSISTANT_NAME,
        status: 'existing',
      };
    }
  } catch (err) {
    console.warn('Failed to list assistants, will create new one:', err);
  }

  // Create new assistant
  const result = await telnyxRequest('/ai/assistants', 'POST', {
    name: DEMO_ASSISTANT_NAME,
    model: 'openai/gpt-4o',
    instructions: DEMO_INSTRUCTIONS,
    greeting: "Thank you for calling Comcast Customer Retention. My name is Sarah, how can I help you today?",
    voice_settings: {
      voice: 'Telnyx.NaturalHD.astra', // Professional female voice
      voice_speed: 1.0,
      background_audio: { type: 'predefined_media', value: 'call_center', volume: 0.3 },
    },
    transcription: {
      model: 'deepgram/flux',
      language: 'en',
      settings: { eot_threshold: 0.5, eot_timeout_ms: 3000, eager_eot_threshold: 0.3 },
    },
    telephony_settings: {
      supports_unauthenticated_web_calls: false,
      noise_suppression: 'deepfilternet',
      time_limit_secs: 900, // 15 min max for demo
    },
  });

  const assistantId = result.data?.id;
  if (!assistantId) {
    throw new Error('Failed to create demo assistant - no ID returned');
  }

  cachedDemoAssistantId = assistantId;
  console.log(`Created demo Comcast retention assistant: ${assistantId}`);

  return {
    assistantId,
    name: DEMO_ASSISTANT_NAME,
    status: 'created',
  };
}

/**
 * Get the demo assistant ID (creates if doesn't exist)
 */
export async function getDemoAssistantId(): Promise<string> {
  const result = await createDemoIVR();
  return result.assistantId;
}

/**
 * Clear cached demo assistant (for testing)
 */
export function clearDemoCache(): void {
  cachedDemoAssistantId = null;
  cachedDemoPhoneNumber = null;
}
