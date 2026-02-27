# Velma-2 STT Streaming API - Quickstart Guide

Real-time speech-to-text via WebSocket with speaker diarization, emotion detection, accent detection, and PII/PHI tagging.

## Endpoint

```
wss://modulate-developer-apis.com/api/velma-2-stt-streaming
```

## Authentication

Pass your API key as a query parameter when connecting:

```
wss://modulate-developer-apis.com/api/velma-2-stt-streaming?api_key=YOUR_API_KEY
```

## Features

| Feature | Query Parameter | Default | Description |
|---------|----------------|---------|-------------|
| Speaker Diarization | `speaker_diarization` | `true` | Identifies different speakers (1-indexed) |
| Emotion Detection | `emotion_signal` | `false` | Detects emotional tone per utterance |
| Accent Detection | `accent_signal` | `false` | Detects speaker accent per utterance |
| PII/PHI Tagging | `pii_phi_tagging` | `false` | Tags personally identifiable / health information |

## Supported Audio Formats

AAC, AIFF, FLAC, MP3, MP4, MOV, OGG, Opus, WAV, WebM

Opus is recommended for optimal quality and bandwidth.

## Connection Flow

1. Connect to the WebSocket endpoint with your `api_key` and optional feature parameters
2. Stream raw audio data as **binary** WebSocket frames
3. Receive JSON messages as utterances are transcribed
4. Send an **empty text frame** (`""`) to signal end of audio
5. Receive a final `done` message with total audio duration
6. Connection closes automatically

## Server Message Types

### Utterance

Sent when a segment of speech is transcribed:

```json
{
  "type": "utterance",
  "utterance": {
    "utterance_uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "text": "Hello, how are you today?",
    "start_ms": 0,
    "duration_ms": 2500,
    "speaker": 1,
    "language": "en",
    "emotion": "Neutral",
    "accent": "American"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `utterance_uuid` | string (UUID) | Unique identifier for this utterance |
| `text` | string | Transcribed text |
| `start_ms` | integer | Start time in ms from beginning of stream |
| `duration_ms` | integer | Duration of utterance in ms |
| `speaker` | integer | Speaker number (1-indexed) |
| `language` | string | Detected language code (e.g. `"en"`, `"fr"`) |
| `emotion` | string or null | Detected emotion (null if disabled) |
| `accent` | string or null | Detected accent (null if disabled) |

**Possible emotion values:** Neutral, Calm, Happy, Amused, Excited, Proud, Affectionate, Interested, Hopeful, Frustrated, Angry, Contemptuous, Concerned, Afraid, Sad, Ashamed, Bored, Tired, Surprised, Anxious, Stressed, Disgusted, Disappointed, Confused, Relieved, Confident

**Possible accent values:** American, British, Australian, Southern, Indian, Irish, Scottish, Eastern_European, African, Asian, Latin_American, Middle_Eastern, Unknown

### Done

Sent when all audio has been processed:

```json
{
  "type": "done",
  "duration_ms": 45000
}
```

### Error

Sent if something goes wrong during transcription:

```json
{
  "type": "error",
  "error": "Internal server error"
}
```

## WebSocket Close Codes

| Code | Meaning |
|------|---------|
| `4001` | Invalid API key |
| `4003` | Model access not enabled for your organization |
| `4029` | Rate limit exceeded (monthly or concurrent) |

## Example: Python (aiohttp)

Stream a pre-recorded audio file with all features enabled:

```python
import asyncio
import json
import aiohttp

API_KEY = "YOUR_API_KEY"
AUDIO_FILE = "recording.opus"
CHUNK_SIZE = 8192

async def transcribe_streaming():
    url = (
        f"wss://modulate-developer-apis.com/api/velma-2-stt-streaming"
        f"?api_key={API_KEY}"
        f"&speaker_diarization=true"
        f"&emotion_signal=true"
        f"&accent_signal=true"
        f"&pii_phi_tagging=false"
    )

    utterances = []

    async with aiohttp.ClientSession() as session:
        async with session.ws_connect(url) as ws:

            # Task: send audio chunks in the background
            async def send_audio():
                with open(AUDIO_FILE, "rb") as f:
                    while chunk := f.read(CHUNK_SIZE):
                        await ws.send_bytes(chunk)
                        # Pace at ~real-time to avoid overwhelming the server
                        await asyncio.sleep(CHUNK_SIZE / 4000)
                # Signal end of audio
                await ws.send_str("")

            send_task = asyncio.create_task(send_audio())

            try:
                async for msg in ws:
                    if msg.type == aiohttp.WSMsgType.TEXT:
                        data = json.loads(msg.data)

                        if data["type"] == "utterance":
                            u = data["utterance"]
                            utterances.append(u)
                            print(
                                f"[Speaker {u['speaker']}] ({u['language']}) "
                                f"{u['start_ms']}-{u['start_ms'] + u['duration_ms']}ms: "
                                f"{u['text']}"
                            )
                            if u.get("emotion"):
                                print(f"  Emotion: {u['emotion']}")
                            if u.get("accent"):
                                print(f"  Accent: {u['accent']}")

                        elif data["type"] == "done":
                            print(f"\nDone! Audio duration: {data['duration_ms']}ms")
                            break

                        elif data["type"] == "error":
                            print(f"Error: {data['error']}")
                            break

                    elif msg.type in (
                        aiohttp.WSMsgType.ERROR,
                        aiohttp.WSMsgType.CLOSE,
                        aiohttp.WSMsgType.CLOSED,
                    ):
                        print(f"Connection closed: {ws.exception()}")
                        break
            finally:
                if not send_task.done():
                    send_task.cancel()

    # Print full transcript
    if utterances:
        full_text = " ".join(u["text"] for u in utterances)
        print(f"\nFull transcript:\n{full_text}")

asyncio.run(transcribe_streaming())
```

## Example: JavaScript (Node.js with `ws`)

```javascript
const WebSocket = require("ws");
const fs = require("fs");

const API_KEY = "YOUR_API_KEY";
const AUDIO_FILE = "recording.opus";
const CHUNK_SIZE = 8192;

const url = new URL("wss://modulate-developer-apis.com/api/velma-2-stt-streaming");
url.searchParams.set("api_key", API_KEY);
url.searchParams.set("speaker_diarization", "true");
url.searchParams.set("emotion_signal", "true");
url.searchParams.set("accent_signal", "false");

const ws = new WebSocket(url.toString());
const utterances = [];

ws.on("open", () => {
  console.log("Connected. Streaming audio...");

  const stream = fs.createReadStream(AUDIO_FILE, { highWaterMark: CHUNK_SIZE });

  stream.on("data", (chunk) => {
    ws.send(chunk);
  });

  stream.on("end", () => {
    // Signal end of audio with an empty text frame
    ws.send("");
  });
});

ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());

  if (msg.type === "utterance") {
    const u = msg.utterance;
    utterances.push(u);
    console.log(`[Speaker ${u.speaker}] (${u.language}) ${u.text}`);
  } else if (msg.type === "done") {
    console.log(`\nDone! Audio duration: ${msg.duration_ms}ms`);
    console.log("Full transcript:", utterances.map((u) => u.text).join(" "));
    ws.close();
  } else if (msg.type === "error") {
    console.error("Error:", msg.error);
    ws.close();
  }
});

ws.on("close", (code, reason) => {
  console.log(`Connection closed: ${code} ${reason}`);
});

ws.on("error", (err) => {
  console.error("WebSocket error:", err.message);
});
```

## Example: cURL (not applicable)

WebSocket APIs cannot be tested with cURL. Use a WebSocket client library in your preferred language, or try [`websocat`](https://github.com/vi/websocat) for command-line testing.

## Rate Limits

- Concurrent connection limits apply per organization
- Monthly usage limits (in audio hours) apply per organization
- Connections exceeding limits are rejected during the WebSocket handshake with close code `4029`
