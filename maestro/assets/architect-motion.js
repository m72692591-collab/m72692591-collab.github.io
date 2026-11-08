// Shared timing for the hand sweep, carousel and light contact. No rendering side effects.
export const TAU = Math.PI * 2;
export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
export const nearestAngle = (target, current) => current + Math.atan2(Math.sin(target - current), Math.cos(target - current));

export function gestureFrame(elapsed, duration = 1.8) {
  const t = clamp(elapsed / duration);
  return {
    progress: smooth((t - .16) / .58),
    reach: smooth(t / .22) * (1 - smooth((t - .7) / .3)),
    contact: smooth((t - .65) / .08) * (1 - smooth((t - .82) / .18)),
    done: t >= 1
  };
}

// Portrait presentation sequence. All values are pure, normalized weights; the caller
// anchors the selected card and right-hand pose when a new presentation starts.
// Phases: reach -> attach -> carry left -> expand -> reveal -> release/return.
export function presentationFrame(elapsed, duration = 3) {
  const span = Number.isFinite(duration) && duration > 0 ? duration : 3;
  const t = clamp((Number.isFinite(elapsed) ? elapsed : 0) / span);
  const ramp = (from, to) => smooth((t - from) / (to - from));
  const release = ramp(.86, 1);
  return {
    reach: ramp(0, .16) * (1 - release),
    attach: ramp(.16, .25) * (1 - ramp(.86, .95)),
    carry: ramp(.25, .58),
    expand: ramp(.58, .75),
    reveal: ramp(.75, .86),
    release,
    done: t >= 1
  };
}

// Browser speech boundaries provide words, not phonemes. This is a bounded,
// approximate mouth pose, deliberately not advertised as audio-perfect lip sync.
export function mouthPose(text, charIndex = 0) {
  const char = String(text).slice(charIndex).trim().charAt(0).toLowerCase();
  if (/[мбпmbp]/u.test(char)) return { viseme: 'PP', amount: .8 };
  if (/[фвfv]/u.test(char)) return { viseme: 'FF', amount: .55 };
  if (/[оёou]/u.test(char)) return { viseme: 'O', amount: .65 };
  if (/[уюw]/u.test(char)) return { viseme: 'U', amount: .6 };
  if (/[иеыiy]/u.test(char)) return { viseme: 'I', amount: .45 };
  return { viseme: 'aa', amount: .55 };
}
