/**
 * Local Leaderboard Manager
 * Stores top 5 fastest lap times in browser storage (localStorage).
 */

const STORAGE_KEY = 'desk_racer_top_laps_v1';

// Preset initial benchmark times for a rich first-launch experience
const DEFAULT_BENCHMARKS = [
  { id: 'bm-1', time: 18.420, date: 'BENCHMARK', isDefault: true },
  { id: 'bm-2', time: 19.850, date: 'BENCHMARK', isDefault: true },
  { id: 'bm-3', time: 21.300, date: 'BENCHMARK', isDefault: true },
  { id: 'bm-4', time: 23.100, date: 'BENCHMARK', isDefault: true },
  { id: 'bm-5', time: 25.000, date: 'BENCHMARK', isDefault: true },
];

/**
 * Retrieves top 5 fastest lap records from localStorage.
 */
export function getLeaderboard() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BENCHMARKS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.sort((a, b) => a.time - b.time).slice(0, 5);
    }
  } catch (e) {
    console.warn('Failed to read leaderboard from localStorage:', e);
  }
  return DEFAULT_BENCHMARKS;
}

/**
 * Saves top 5 fastest lap records to localStorage.
 */
export function saveLeaderboard(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.warn('Failed to save leaderboard to localStorage:', e);
  }
}

/**
 * Formats seconds into MM:SS.CC (e.g. 00:18.42)
 */
export function formatLapTime(seconds) {
  if (seconds == null || isNaN(seconds)) return '00:00.00';
  const totalCentis = Math.max(0, Math.floor(seconds * 100));
  const mins = Math.floor(totalCentis / 6000);
  const secs = Math.floor((totalCentis % 6000) / 100);
  const centis = totalCentis % 100;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
}

/**
 * Attempts to record a new lap time.
 * Returns { isTop5, newRank, leaderboard }
 */
export function recordLapTime(timeInSeconds) {
  if (typeof timeInSeconds !== 'number' || isNaN(timeInSeconds) || timeInSeconds <= 1.0) {
    return { isTop5: false, newRank: -1, leaderboard: getLeaderboard() };
  }

  const currentList = getLeaderboard();
  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  const roundedTime = Number(timeInSeconds.toFixed(3));
  const newEntry = {
    id: `lap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    time: roundedTime,
    date: dateStr,
    timestamp: Date.now(),
    isNew: true,
  };

  // Strip 'isNew' flag from existing items
  const combined = currentList.map((item) => ({ ...item, isNew: false }));
  combined.push(newEntry);
  combined.sort((a, b) => a.time - b.time);

  const top5 = combined.slice(0, 5);
  const rankIndex = top5.findIndex((item) => item.id === newEntry.id);
  const isTop5 = rankIndex !== -1;

  if (isTop5) {
    saveLeaderboard(top5);
  }

  return {
    isTop5,
    newRank: isTop5 ? rankIndex + 1 : -1,
    leaderboard: getLeaderboard(),
  };
}

/**
 * Clears the stored leaderboard and resets to default benchmarks.
 */
export function clearLeaderboard() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear leaderboard:', e);
  }
  return DEFAULT_BENCHMARKS;
}
