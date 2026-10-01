import { describe, expect, it } from "vitest";
import {
  canAuthorNarration,
  dragSegment,
  isAudioDerivativeKey,
  mixVolumes,
  narrationMediaTime,
  segmentAtTime,
  trimSegment,
  type NarrationSegment,
} from "./audio";
import { eventSupportsJob, makeWalkthroughEvent } from "./audio-events";
import { activePhrase, phrasesFromText, searchTranscript } from "./transcript";
import { HOUSEWALK_NARRATION, HOUSEWALK_TRANSCRIPTS } from "./housewalk-audio";

const seg: NarrationSegment = HOUSEWALK_NARRATION[0];

describe("audio derivatives stay off master", () => {
  it("accepts audio/ keys and rejects master keys", () => {
    expect(isAudioDerivativeKey("orgs/x/spatial-walkthrough/w/audio/nar.webm")).toBe(true);
    expect(isAudioDerivativeKey("orgs/x/spatial-walkthrough/w/master.mp4")).toBe(false);
    expect(isAudioDerivativeKey("orgs/x/master.mp4")).toBe(false);
  });
});

describe("video clock is master", () => {
  it("finds the active narration segment by playback time", () => {
    expect(segmentAtTime(HOUSEWALK_NARRATION, "clip-housewalk", 2)?.id).toBe("nar-1");
    expect(segmentAtTime(HOUSEWALK_NARRATION, "clip-housewalk", 15)?.id).toBe("nar-2");
    expect(segmentAtTime(HOUSEWALK_NARRATION, "clip-housewalk", 13)).toBeNull();
  });

  it("maps video time into the audio file, including trim", () => {
    expect(narrationMediaTime(seg, 3)).toBe(3);
    expect(narrationMediaTime(seg, 12)).toBeNull();
    const trimmed = { ...seg, asset: { ...seg.asset!, trimStartS: 1.5 } };
    expect(narrationMediaTime(trimmed, 3)).toBe(4.5);
  });

  it("ducks source camera audio while narration is active", () => {
    const ducked = mixVolumes({ sourceVolume: 1, narrationVolume: 0.8, duckSource: true, narrationActive: true });
    expect(ducked.source).toBeCloseTo(0.12);
    expect(ducked.narration).toBe(0.8);
    const idle = mixVolumes({ sourceVolume: 1, narrationVolume: 0.8, duckSource: true, narrationActive: false });
    expect(idle.source).toBe(1);
    expect(idle.narration).toBe(0);
  });
});

describe("authoring", () => {
  it("drags a segment without changing length", () => {
    const moved = dragSegment(seg, 4, 42);
    expect(moved.endTime - moved.startTime).toBeCloseTo(seg.endTime - seg.startTime);
    expect(moved.startTime).toBe(4);
  });

  it("trims start and end", () => {
    const trimmed = trimSegment(seg, 2, 9);
    expect(trimmed?.startTime).toBe(2);
    expect(trimmed?.endTime).toBe(9);
    expect(trimSegment(seg, 5, 5.05)).toBeNull();
  });

  it("CEO/admin may author; client permission is not enabled yet", () => {
    expect(canAuthorNarration({ isCeo: true, canAuthor: false })).toBe(true);
    expect(canAuthorNarration({ isCeo: false, canAuthor: true })).toBe(true);
    expect(canAuthorNarration({ isCeo: false, canAuthor: false })).toBe(false);
  });
});

describe("transcript", () => {
  it("searches phrases and seeks by start time", () => {
    const hits = searchTranscript(HOUSEWALK_TRANSCRIPTS, "clearance");
    expect(hits).toHaveLength(1);
    expect(hits[0].phrase.start).toBe(14);
    expect(activePhrase(HOUSEWALK_TRANSCRIPTS[0].phrases, 5)?.text).toContain("look around");
  });

  it("splits pasted text into timed phrases", () => {
    const phrases = phrasesFromText("One. Two.", 0, 10, "Brian");
    expect(phrases).toHaveLength(2);
    expect(phrases[0].speaker).toBe("Brian");
  });
});

describe("AI-ready events", () => {
  it("records briefing interrupt without running extraction", () => {
    const ev = makeWalkthroughEvent("briefing.interrupt", "wt-housewalk", 6, { reason: "pause" });
    expect(ev.kind).toBe("briefing.interrupt");
    expect(eventSupportsJob("transcript.ready", "automatic_summary")).toBe(true);
    expect(eventSupportsJob("briefing.interrupt", "rfi_extraction")).toBe(false);
  });
});
