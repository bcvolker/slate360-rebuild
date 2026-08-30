# Spatial Walkthrough speech-to-text

Spatial Walkthrough transcription is **provider-agnostic**.

Runtime switch: `SPATIAL_STT_PROVIDER=groq|openai|mock|manual`

The existing Site Walk helper `transcribeAudio()` in `lib/server/ai-provider.ts` (Groq Whisper, OpenAI fallback) is reused behind `lib/spatial-walkthrough/transcript-provider.ts`. Nothing in Spatial Walkthrough imports a vendor SDK directly.

## Commercially safe candidates (not locked)

| Provider | Why it is a candidate |
| --- | --- |
| Groq Whisper | Already in production for Site Walk notes. Fast, low cost. |
| OpenAI Whisper | Existing fallback. |
| Deepgram | Streaming + word timestamps. |
| AssemblyAI | Speaker labels. |
| Amazon Transcribe | If audio stays next to R2/S3. |
| Manual | Paste/edit. Always available. No vendor. |

Word timestamps are stored on `spatial_transcripts.words` when a provider supplies them. Groq/OpenAI json mode currently returns full text; phrases are split locally.

Do not bake narration or transcripts into the master 360 file.
