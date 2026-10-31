// Prepared neural narration, served with the site. No runtime synthesis,
// visitor text upload, browser voice fallback or invented word timings.
const base = new URL('./audio/maestro/', import.meta.url);
let manifestPromise, current = null, sequence = 0;
const normalize = text => String(text).replace(/\s+/g, ' ').trim();
function manifest() {
  if (!manifestPromise) manifestPromise = fetch(new URL('manifest.json', base), {cache:'no-cache'}).then(response => {
    if (!response.ok) throw new Error('NARRATION_MANIFEST_UNAVAILABLE');
    return response.json();
  }).catch(error => { manifestPromise = null; throw error; });
  return manifestPromise;
}
function stop() {
  sequence++;
  current?.finish('canceled');
}
async function speak(text, hooks = {}) {
  stop();
  const token = sequence;
  const data = await manifest();
  if (token !== sequence) return {played:false, reason:'canceled'};
  const clip = data.clips.find(item => normalize(item.matchText) === normalize(text));
  if (!clip) return {played:false, reason:'text-only'};
  // Filenames are build-owned; reject unexpected paths even if the manifest changes.
  if (!/^[a-z]+\.mp3$/.test(clip.file)) throw new Error('NARRATION_PATH_INVALID');
  return new Promise((resolve, reject) => {
    const media = new Audio();
    media.preload = 'none';
    let started = false, settled = false;
    const finish = reason => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      media.removeEventListener('playing', onPlaying);
      media.removeEventListener('ended', onEnded);
      media.removeEventListener('error', onError);
      media.pause();
      media.removeAttribute('src');
      media.load();
      if (current?.media === media) current = null;
      if (started && reason !== 'error') hooks.onEnd?.();
      if (reason === 'error') reject(new Error('NARRATION_AUDIO_UNAVAILABLE'));
      else resolve({played:started, reason});
    };
    const onPlaying = () => {
      if (settled || started || token !== sequence) return;
      started = true;
      clearTimeout(timeout);
      hooks.onStart?.({text:clip.text, topic:clip.id, duration:media.duration});
    };
    const onEnded = () => finish('ended');
    const onError = () => finish('error');
    const timeout = setTimeout(onError, 20000);
    current = {media, finish};
    media.addEventListener('playing', onPlaying);
    media.addEventListener('ended', onEnded);
    media.addEventListener('error', onError);
    const audioURL = new URL(clip.file, base);
    audioURL.searchParams.set('v', clip.sha256);
    media.src = audioURL.href;
    try { Promise.resolve(media.play()).catch(onError); }
    catch { onError(); }
  });
}
window.MAESTRO_GENIE_VOICE = Object.freeze({speak, stop, kind:'prepared-neural-narration'});
