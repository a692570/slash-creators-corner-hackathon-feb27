# Velma-2 STT Batch API - Quickstart Guide

Multilingual batch speech-to-text with speaker diarization, emotion detection, accent detection, and PII/PHI tagging. Best for pre-recorded files where you need rich transcription metadata.

## Endpoint

```
POST https://modulate-developer-apis.com/api/velma-2-stt-batch
```

## Authentication

Include your API key in the `X-API-Key` header:

```
X-API-Key: YOUR_API_KEY
```

## Features

| Feature | Form Field | Default | Description |
|---------|-----------|---------|-------------|
| Speaker Diarization | `speaker_diarization` | `true` | Identifies different speakers (1-indexed) |
| Emotion Detection | `emotion_signal` | `false` | Detects emotional tone per utterance |
| Accent Detection | `accent_signal` | `false` | Detects speaker accent per utterance |
| PII/PHI Tagging | `pii_phi_tagging` | `false` | Tags personally identifiable / health information |

## Supported Audio Formats

AAC, AIFF, FLAC, MP3, MP4, MOV, OGG, Opus, WAV, WebM

Maximum file size: **100 MB**

## Request

Send a `multipart/form-data` POST with the audio file and optional feature flags:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `upload_file` | file (binary) | Yes | Audio file to transcribe |
| `speaker_diarization` | boolean | No | Enable speaker diarization (default: `true`) |
| `emotion_signal` | boolean | No | Enable emotion detection (default: `false`) |
| `accent_signal` | boolean | No | Enable accent detection (default: `false`) |
| `pii_phi_tagging` | boolean | No | Enable PII/PHI tagging (default: `false`) |

## Response

### Success (200)

```json
{
  "text": "Hello everyone. Welcome to the meeting.",
  "duration_ms": 5000,
  "utterances": [
    {
      "utterance_uuid": "e5f6a7b8-c9d0-1234-efab-345678901234",
      "text": "Hello everyone.",
      "start_ms": 0,
      "duration_ms": 2000,
      "speaker": 1,
      "language": "en",
      "emotion": "Neutral",
      "accent": "American"
    },
    {
      "utterance_uuid": "f6a7b8c9-d0e1-2345-fabc-456789012345",
      "text": "Welcome to the meeting.",
      "start_ms": 2500,
      "duration_ms": 2500,
      "speaker": 2,
      "language": "en",
      "emotion": "Happy",
      "accent": "British"
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `text` | string | Full concatenated transcript |
| `duration_ms` | integer | Total audio duration in milliseconds |
| `utterances` | array | Individual speech segments with metadata |

### Utterance Fields

| Field | Type | Description |
|-------|------|-------------|
| `utterance_uuid` | string (UUID) | Unique identifier |
| `text` | string | Transcribed text for this segment |
| `start_ms` | integer | Start time in ms from beginning of audio |
| `duration_ms` | integer | Duration of utterance in ms |
| `speaker` | integer | Speaker number (1-indexed) |
| `language` | string | Detected language code (e.g. `"en"`, `"fr"`, `"es"`) |
| `emotion` | string or null | Detected emotion (null if disabled) |
| `accent` | string or null | Detected accent (null if disabled) |

**Possible emotion values:** Neutral, Calm, Happy, Amused, Excited, Proud, Affectionate, Interested, Hopeful, Frustrated, Angry, Contemptuous, Concerned, Afraid, Sad, Ashamed, Bored, Tired, Surprised, Anxious, Stressed, Disgusted, Disappointed, Confused, Relieved, Confident

**Possible accent values:** American, British, Australian, Southern, Indian, Irish, Scottish, Eastern_European, African, Asian, Latin_American, Middle_Eastern, Unknown

## Error Responses

| Status | Meaning |
|--------|---------|
| `400` | Invalid file format or empty file |
| `401` | Invalid or missing API key |
| `403` | Model access not enabled for your organization |
| `429` | Rate limit exceeded (monthly usage or concurrent requests) |

## Example: cURL

```bash
curl -X POST https://modulate-developer-apis.com/api/velma-2-stt-batch \
  -H "X-API-Key: YOUR_API_KEY" \
  -F "upload_file=@recording.mp3" \
  -F "speaker_diarization=true" \
  -F "emotion_signal=true" \
  -F "accent_signal=true" \
  -F "pii_phi_tagging=false"
```

## Example: Python (requests)

```python
import requests

API_KEY = "YOUR_API_KEY"
AUDIO_FILE = "recording.mp3"

response = requests.post(
    "https://modulate-developer-apis.com/api/velma-2-stt-batch",
    headers={"X-API-Key": API_KEY},
    files={"upload_file": open(AUDIO_FILE, "rb")},
    data={
        "speaker_diarization": "true",
        "emotion_signal": "true",
        "accent_signal": "true",
        "pii_phi_tagging": "false",
    },
)
response.raise_for_status()
result = response.json()

print(f"Transcript: {result['text']}")
print(f"Audio duration: {result['duration_ms']}ms")

for u in result["utterances"]:
    line = f"[Speaker {u['speaker']}] ({u['language']}) {u['text']}"
    if u.get("emotion"):
        line += f" [{u['emotion']}]"
    if u.get("accent"):
        line += f" ({u['accent']})"
    print(line)
```

## Example: Python (aiohttp, async)

```python
import asyncio
import aiohttp

API_KEY = "YOUR_API_KEY"
AUDIO_FILE = "recording.mp3"

async def transcribe():
    data = aiohttp.FormData()
    data.add_field(
        "upload_file",
        open(AUDIO_FILE, "rb"),
        filename=AUDIO_FILE,
        content_type="application/octet-stream",
    )
    data.add_field("speaker_diarization", "true")
    data.add_field("emotion_signal", "true")
    data.add_field("accent_signal", "false")
    data.add_field("pii_phi_tagging", "false")

    async with aiohttp.ClientSession() as session:
        async with session.post(
            "https://modulate-developer-apis.com/api/velma-2-stt-batch",
            headers={"X-API-Key": API_KEY},
            data=data,
        ) as resp:
            if resp.status != 200:
                print(f"Error {resp.status}: {await resp.text()}")
                return

            result = await resp.json()

    print(f"Transcript: {result['text']}")
    print(f"Audio duration: {result['duration_ms']}ms")
    print(f"Utterances: {len(result['utterances'])}")

    for u in result["utterances"]:
        print(
            f"  [{u['speaker']}] ({u['language']}) "
            f"{u['start_ms']}-{u['start_ms'] + u['duration_ms']}ms: "
            f"{u['text']}"
        )

asyncio.run(transcribe())
```

## Example: JavaScript (Node.js with fetch)

```javascript
const fs = require("fs");
const path = require("path");

const API_KEY = "YOUR_API_KEY";
const AUDIO_FILE = "recording.mp3";

async function transcribe() {
  const formData = new FormData();
  formData.append("upload_file", new Blob([fs.readFileSync(AUDIO_FILE)]), path.basename(AUDIO_FILE));
  formData.append("speaker_diarization", "true");
  formData.append("emotion_signal", "true");
  formData.append("accent_signal", "false");
  formData.append("pii_phi_tagging", "false");

  const response = await fetch(
    "https://modulate-developer-apis.com/api/velma-2-stt-batch",
    {
      method: "POST",
      headers: { "X-API-Key": API_KEY },
      body: formData,
    }
  );

  if (!response.ok) {
    console.error(`Error ${response.status}: ${await response.text()}`);
    return;
  }

  const result = await response.json();

  console.log(`Transcript: ${result.text}`);
  console.log(`Audio duration: ${result.duration_ms}ms`);

  for (const u of result.utterances) {
    console.log(
      `[Speaker ${u.speaker}] (${u.language}) ` +
      `${u.start_ms}-${u.start_ms + u.duration_ms}ms: ${u.text}`
    );
  }
}

transcribe();
```

## Rate Limits

- Concurrent request limits apply per organization
- Monthly usage limits (in audio hours) apply per organization
- Exceeding limits returns a `429` status code
