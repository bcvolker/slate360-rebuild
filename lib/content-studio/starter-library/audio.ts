import type { StarterLibraryItem } from "./types";

const SFX_BASE = {
  assetType: "sfx" as const,
  category: "Sound FX",
  license: "CC0",
  sourceUrl: "https://kenney.nl/assets/impact-sounds",
  attribution: "Kenney.nl",
  dropTarget: "sfx_lane" as const,
  gapsClosed: ["Add music / SFX"],
};

export const STARTER_SFX: StarterLibraryItem[] = [
  { ...SFX_BASE, id: "sfx-whoosh-01", name: "Whoosh Short", metadata: { pack: "impact", filename: "whoosh_001.ogg", durationSec: 0.6, tags: ["transition"] } },
  { ...SFX_BASE, id: "sfx-whoosh-02", name: "Whoosh Long", metadata: { pack: "impact", filename: "whoosh_002.ogg", durationSec: 1.1, tags: ["transition"] } },
  { ...SFX_BASE, id: "sfx-swoosh-01", name: "Swoosh Up", metadata: { pack: "impact", filename: "swoosh_001.ogg", durationSec: 0.8, tags: ["transition"] } },
  { ...SFX_BASE, id: "sfx-hit-soft", name: "Soft Hit", metadata: { pack: "impact", filename: "hit_soft_001.ogg", durationSec: 0.4, tags: ["impact"] } },
  { ...SFX_BASE, id: "sfx-hit-hard", name: "Hard Hit", metadata: { pack: "impact", filename: "hit_hard_001.ogg", durationSec: 0.5, tags: ["impact"] } },
  { ...SFX_BASE, id: "sfx-ui-click", name: "UI Click", metadata: { pack: "digital", filename: "click_001.ogg", durationSec: 0.15, tags: ["ui"] } },
  { ...SFX_BASE, id: "sfx-ui-pop", name: "UI Pop", metadata: { pack: "digital", filename: "pop_001.ogg", durationSec: 0.2, tags: ["ui"] } },
  { ...SFX_BASE, id: "sfx-ding", name: "Notification Ding", metadata: { pack: "digital", filename: "ding_001.ogg", durationSec: 0.7, tags: ["ui"] } },
  { ...SFX_BASE, id: "sfx-riser", name: "Riser", metadata: { pack: "digital", filename: "riser_001.ogg", durationSec: 1.5, tags: ["transition"] } },
  { ...SFX_BASE, id: "sfx-site-hammer", name: "Hammer Distant", metadata: { pack: "foley", filename: "hammer_distant.ogg", durationSec: 1.2, tags: ["construction"] } },
  { ...SFX_BASE, id: "sfx-site-drill", name: "Drill Ambient", metadata: { pack: "foley", filename: "drill_ambient.ogg", durationSec: 2.0, tags: ["construction"] } },
  { ...SFX_BASE, id: "sfx-site-beep", name: "Equipment Beep", metadata: { pack: "foley", filename: "beep_001.ogg", durationSec: 0.3, tags: ["construction"] } },
];

const MUSIC_BASE = {
  assetType: "music" as const,
  category: "Music",
  license: "CC0",
  sourceUrl: "https://freepd.com",
  dropTarget: "music_lane" as const,
  gapsClosed: ["Add music / SFX", "Duck music under VO"],
};

export const STARTER_MUSIC: StarterLibraryItem[] = [
  { ...MUSIC_BASE, id: "music-corp-calm-01", name: "Corporate Calm 1", metadata: { mood: "documentary", bpm: 90, filename: "corp_calm_01.mp3", durationSec: 120 } },
  { ...MUSIC_BASE, id: "music-corp-calm-02", name: "Corporate Calm 2", metadata: { mood: "documentary", bpm: 85, filename: "corp_calm_02.mp3", durationSec: 150 } },
  { ...MUSIC_BASE, id: "music-report-neutral", name: "Report Neutral", metadata: { mood: "report", bpm: 80, filename: "report_neutral.mp3", durationSec: 180 } },
  { ...MUSIC_BASE, id: "music-site-walk", name: "Site Walk Bed", metadata: { mood: "construction", bpm: 95, filename: "site_walk.mp3", durationSec: 140 } },
  { ...MUSIC_BASE, id: "music-timelapse-01", name: "Timelapse Drive", metadata: { mood: "timelapse", bpm: 110, filename: "timelapse_01.mp3", durationSec: 90 } },
  { ...MUSIC_BASE, id: "music-timelapse-02", name: "Timelapse Pulse", metadata: { mood: "timelapse", bpm: 120, filename: "timelapse_02.mp3", durationSec: 100 } },
  { ...MUSIC_BASE, id: "music-social-upbeat-01", name: "Social Upbeat 1", metadata: { mood: "social", bpm: 128, filename: "social_up_01.mp3", durationSec: 75 } },
  { ...MUSIC_BASE, id: "music-social-upbeat-02", name: "Social Upbeat 2", metadata: { mood: "social", bpm: 130, filename: "social_up_02.mp3", durationSec: 80 } },
  { ...MUSIC_BASE, id: "music-reels-energy", name: "Reels Energy", metadata: { mood: "social", bpm: 135, filename: "reels_energy.mp3", durationSec: 60 } },
  { ...MUSIC_BASE, id: "music-vo-bed-soft", name: "VO Underscore Soft", metadata: { mood: "voiceover", bpm: 70, filename: "vo_bed_soft.mp3", durationSec: 200 } },
  { ...MUSIC_BASE, id: "music-vo-bed-light", name: "VO Underscore Light", metadata: { mood: "voiceover", bpm: 75, filename: "vo_bed_light.mp3", durationSec: 180 } },
  { ...MUSIC_BASE, id: "music-before-after", name: "Before/After Reveal", metadata: { mood: "marketing", bpm: 100, filename: "before_after.mp3", durationSec: 45 } },
];
