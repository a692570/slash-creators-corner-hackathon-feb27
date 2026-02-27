# Velma-2 STT Batch English VFast API - Quickstart Guide

High-speed English-only batch transcription optimized for throughput. Ideal for large-scale batch processing of English audio.

## Endpoint

```
POST https://modulate-developer-apis.com/api/velma-2-stt-batch-english-vfast
```

## Authentication

Include your API key in the `X-API-Key` header:

```
X-API-Key: YOUR_API_KEY
```

## Key Differences from the Full Batch API

| | Batch English VFast | Batch (Full) |
|---|---|---|
| **Languages** | English only | Multilingual with auto-detection |
| **Audio format** | Opus (`.opus`) only | AAC, AIFF, FLAC, MP3, MP4, MOV, OGG, Opus, WAV, WebM |
| **Speaker diarization** | No | Yes |
| **Emotion detection** | No | Yes |
| **Accent detection** | No | Yes |
| **PII/PHI tagging** | No | Yes |
| **Utterance-level data** | No | Yes |
| **Speed** | Fastest | Standard |

Use this API when you need maximum speed and throughput for English audio and don't require speaker diarization, emotion/accent detection, or utterance-level detail.

## Supported Audio Format

**Opus only** (`.opus` extension required)

Maximum file size: **100 MB**

## Request

Send a `multipart/form-data` POST with the audio file:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `upload_file` | file (binary) | Yes | Opus audio file (`.opus`) |

No additional parameters -- this API is streamlined for speed.

## Response

### Success (200)

```json
{
  "text": "Hello, this is a sample transcription. It includes proper capitalization and punctuation.",
  "duration_ms": 12500
}
```

| Field | Type | Description |
|-------|------|-------------|
| `text` | string | Full transcript with automatic capitalization and punctuation |
| `duration_ms` | integer | Total audio duration in milliseconds |

The API automatically applies:
- Sentence capitalization
- Named entity capitalization (via NER)
- First-person pronoun "I" capitalization
- Punctuation

## Error Responses

| Status | Meaning |
|--------|---------|
| `400` | Invalid file format (only `.opus` supported), empty file, or decode error |
| `401` | Invalid or missing API key |
| `403` | Model access not enabled for your organization |
| `429` | Rate limit exceeded (monthly usage or concurrent requests) |
| `503` | Server overloaded, try again later |
| `504` | Processing timeout (60-second limit exceeded) |

## Example: cURL

```bash
curl -X POST https://modulate-developer-apis.com/api/velma-2-stt-batch-english-vfast \
  -H "X-API-Key: YOUR_API_KEY" \
  -F "upload_file=@recording.opus"
```

## Example: Python (requests)

```python
import requests

API_KEY = "YOUR_API_KEY"
AUDIO_FILE = "recording.opus"

response = requests.post(
    "https://modulate-developer-apis.com/api/velma-2-stt-batch-english-vfast",
    headers={"X-API-Key": API_KEY},
    files={"upload_file": open(AUDIO_FILE, "rb")},
)
response.raise_for_status()
result = response.json()

print(f"Transcript: {result['text']}")
print(f"Audio duration: {result['duration_ms']}ms")
```

## Example: Python (aiohttp, async)

```python
import asyncio
import aiohttp

API_KEY = "YOUR_API_KEY"
AUDIO_FILE = "recording.opus"

async def transcribe():
    data = aiohttp.FormData()
    data.add_field(
        "upload_file",
        open(AUDIO_FILE, "rb"),
        filename=AUDIO_FILE,
        content_type="application/octet-stream",
    )

    async with aiohttp.ClientSession() as session:
        async with session.post(
            "https://modulate-developer-apis.com/api/velma-2-stt-batch-english-vfast",
            headers={"X-API-Key": API_KEY},
            data=data,
        ) as resp:
            if resp.status != 200:
                print(f"Error {resp.status}: {await resp.text()}")
                return

            result = await resp.json()

    print(f"Transcript: {result['text']}")
    print(f"Audio duration: {result['duration_ms']}ms")

asyncio.run(transcribe())
```

## Example: Python (batch processing multiple files)

```python
import asyncio
import glob
import aiohttp

API_KEY = "YOUR_API_KEY"
URL = "https://modulate-developer-apis.com/api/velma-2-stt-batch-english-vfast"
MAX_CONCURRENT = 5  # Respect concurrent request limits

semaphore = asyncio.Semaphore(MAX_CONCURRENT)

async def transcribe_file(session, filepath):
    async with semaphore:
        data = aiohttp.FormData()
        data.add_field(
            "upload_file",
            open(filepath, "rb"),
            filename=filepath.rsplit("/", 1)[-1],
            content_type="application/octet-stream",
        )

        async with session.post(URL, headers={"X-API-Key": API_KEY}, data=data) as resp:
            if resp.status != 200:
                return {"file": filepath, "error": await resp.text()}
            result = await resp.json()
            return {"file": filepath, **result}

async def main():
    files = glob.glob("audio_files/*.opus")
    print(f"Processing {len(files)} files...")

    async with aiohttp.ClientSession() as session:
        tasks = [transcribe_file(session, f) for f in files]
        results = await asyncio.gather(*tasks)

    for r in results:
        if "error" in r:
            print(f"FAILED {r['file']}: {r['error']}")
        else:
            print(f"{r['file']} ({r['duration_ms']}ms): {r['text'][:80]}...")

asyncio.run(main())
```

## Example: JavaScript (Node.js with fetch)

```javascript
const fs = require("fs");

const API_KEY = "YOUR_API_KEY";
const AUDIO_FILE = "recording.opus";

async function transcribe() {
  const formData = new FormData();
  formData.append("upload_file", new Blob([fs.readFileSync(AUDIO_FILE)]), "recording.opus");

  const response = await fetch(
    "https://modulate-developer-apis.com/api/velma-2-stt-batch-english-vfast",
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
}

transcribe();
```

## Rate Limits

- Concurrent request limits apply per organization
- Monthly usage limits (in audio hours) apply per organization
- Exceeding limits returns a `429` status code
- Processing timeout is **60 seconds** per request (returns `504` if exceeded)
