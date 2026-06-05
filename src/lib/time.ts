/** Minutes since midnight. Supports "5:00 PM", "17:00", and "17:30:00". */
export function parseTimeToMinutes(time: string): number {
  const t = time.trim();
  const twelve = t.match(
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i
  );
  if (twelve) {
    let h = parseInt(twelve[1], 10);
    const m = parseInt(twelve[2], 10);
    const ap = twelve[4].toUpperCase();
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return h * 60 + m;
  }
  const twentyFour = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (twentyFour) {
    const h = parseInt(twentyFour[1], 10);
    const m = parseInt(twentyFour[2], 10);
    return h * 60 + m;
  }
  return NaN;
}

export function isValidTime(time: string): boolean {
  return !Number.isNaN(parseTimeToMinutes(time));
}

/** Returns true if [aStart, aEnd) and [bStart, bEnd) overlap. */
export function timeRangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  const a1 = parseTimeToMinutes(aStart);
  const a2 = parseTimeToMinutes(aEnd);
  const b1 = parseTimeToMinutes(bStart);
  const b2 = parseTimeToMinutes(bEnd);
  if ([a1, a2, b1, b2].some(Number.isNaN)) return false;
  return a1 < b2 && b1 < a2;
}

export function hoursBetween(startTime: string, endTime: string): number {
  const startMin = parseTimeToMinutes(startTime);
  const endMin = parseTimeToMinutes(endTime);
  if (Number.isNaN(startMin) || Number.isNaN(endMin)) return 0;
  let diff = endMin - startMin;
  if (diff < 0) diff += 24 * 60;
  return diff / 60;
}
