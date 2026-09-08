// frontend/src/features/videos/dateUtils.js

/**
 * Get today's local date in format YYYY-MM-DD
 */
export function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get local date-time string in format YYYY-MM-DDTHH:mm:ss for datetime input
 */
export function getCurrentLocalDateTimeString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

/**
 * Format datetime string or timestamp into exact user specified CCTV real-world clock time:
 * e.g. "23 Aug 2026, 09:02:05 AM"
 */
export function formatFootageDateTime(dtInput) {
  if (!dtInput) return "Not specified";
  try {
    const d = new Date(dtInput);
    if (isNaN(d.getTime())) return String(dtInput);

    const day = d.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();

    let hours = d.getHours();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const hoursStr = String(hours).padStart(2, "0");
    const minsStr = String(d.getMinutes()).padStart(2, "0");
    const secsStr = String(d.getSeconds()).padStart(2, "0");

    return `${day} ${month} ${year}, ${hoursStr}:${minsStr}:${secsStr} ${ampm}`;
  } catch {
    return String(dtInput);
  }
}
