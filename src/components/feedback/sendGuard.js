/*
 * Light, per-browser guards for the public send forms.
 *
 * These are courtesy limits, not security: the enquiries table already takes
 * guest messages from the contact form under its own policies, and anyone who
 * wants to can clear their storage. They stop the easy cases — a bot filling
 * every field it finds, or a double-click sending the same feedback twice as
 * many times as someone meant to.
 */

export const SPAM_TRAP = 'Leave this empty';

const KEY = 'ngd-sent-v1';
const DAY = 24 * 60 * 60 * 1000;

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

/** How many of this kind this browser has sent in the last day. */
export function sentToday(kind) {
  const now = Date.now();
  return (read()[kind] ?? []).filter((t) => now - t < DAY).length;
}

export function noteSent(kind) {
  try {
    const all = read();
    const now = Date.now();
    all[kind] = [...(all[kind] ?? []).filter((t) => now - t < DAY), now];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* Private mode: no limit is remembered, which is the permissive side. */
  }
}
