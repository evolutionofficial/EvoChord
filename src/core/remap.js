// Keep chords on their line when lyrics are edited (lines added, removed or moved).
// Same LCS line mapping as EvoLyric's annRemap, so both apps move chords identically.

/** Map each old line index to a new line index. */
export function lineMap(oldLines, newLines) {
  const n = oldLines.length;
  const m = newLines.length;
  if (!n || !m || n * m > 4e6) return null;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = oldLines[i] === newLines[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const map = new Array(n).fill(-1);
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (oldLines[i] === newLines[j]) {
      map[i] = j;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  // Changed lines take the matching slot between their unchanged neighbours.
  for (let k = 0; k < n; k++) {
    if (map[k] >= 0) continue;
    let p = k - 1;
    while (p >= 0 && map[p] < 0) p--;
    let q = k + 1;
    while (q < n && map[q] < 0) q++;
    const pn = p >= 0 ? map[p] : -1;
    const qn = q < n ? map[q] : m;
    const lo = pn + 1;
    const hi = qn - 1;
    map[k] = hi >= lo ? Math.min(lo + (k - (p + 1)), hi) : Math.max(0, Math.min(m - 1, pn >= 0 ? pn : qn));
  }
  return map;
}

/** New chords array for `newLyrics`, given chords placed on `oldLyrics`. */
export function remapChords(chords, oldLyrics, newLyrics) {
  if (!chords || !chords.length || oldLyrics === newLyrics) return chords || [];
  const map = lineMap(String(oldLyrics).split('\n'), String(newLyrics).split('\n'));
  if (!map) return chords;
  const seen = new Set();
  return chords
    .map((it) => ({ ...it, l: it.l >= 0 && it.l < map.length ? map[it.l] : it.l }))
    .filter((it) => {
      const k = it.l + ':' + it.c;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}
