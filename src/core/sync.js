// Cloud row mapping shared with EvoLyric (Supabase table `songs`).
//
// EvoLyric stores each song as { id, user_id, local_id, title, artist, lyrics, app_data, ... }
// where app_data holds every other song field (key, chords, colors, speed, ...).
// Evo Chord uses exactly the same mapping, so a song edited in one app appears in the other
// once both apps sign in to the same Evo account. Sync itself is not switched on yet (v0.1):
// this module is the contract, tested, ready for the sync step.

import { normalizeSong } from './song.js';

/** Fields that are real columns; everything else goes to app_data. */
export const ROW_FIELDS = ['id', 'title', 'artist', 'lyrics'];

/** Song → row for upsert. `cloudId` is the row uuid (EvoLyric keeps a local→cloud id map). */
export function toCloudRow(song, { userId, cloudId } = {}) {
  const s = normalizeSong(song);
  const appData = {};
  for (const k of Object.keys(s)) if (!ROW_FIELDS.includes(k) && s[k] !== undefined) appData[k] = s[k];
  return {
    id: cloudId,
    user_id: userId,
    local_id: s.id,
    title: s.title,
    artist: s.artist,
    lyrics: s.lyrics,
    app_data: appData,
    updated_at: new Date(s.updatedAt).toISOString(),
  };
}

/** Row → song (same rule EvoLyric uses when pulling). */
export function fromCloudRow(row) {
  return normalizeSong({
    ...(row.app_data || {}),
    id: row.local_id || row.id,
    title: row.title || '',
    artist: row.artist || '',
    lyrics: row.lyrics || '',
  });
}
