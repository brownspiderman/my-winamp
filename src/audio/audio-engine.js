export function createAudioEngine() {
  const ctx = new AudioContext();

  const gain = ctx.createGain();
  const pan = ctx.createStereoPanner();

  gain.connect(pan);
  pan.connect(ctx.destination);

  // --------------------
  // INTERNAL STATE
  // --------------------

  let buffer = null;
  let source = null;
  let currentTrack = null;

  let startTime = 0;     // context time when playback started
  let startOffset = 0; 
  let isPlaying = false;
  let manuallyStopped = false;

  let repeat = false;
  let rafId = null;

  let mono = true;
  let lastPan = 0;

  const listeners = {};

  // --------------------
  // EVENTS
  // --------------------

  function on(event, fn) {
    (listeners[event] ||= []).push(fn);
  }

  function emit(event, payload) {
    (listeners[event] || []).forEach(fn => fn(payload));
  }

  // --------------------
  // CORE HELPERS
  // --------------------

  function ensureContext() {
    if (ctx.state === "suspended") ctx.resume();
  }

  function stopSource() {
  if (source) {
    manuallyStopped = true;
    try { source.stop(); } catch {}
    source.onended = null;
    source.disconnect();
    source = null;
  }
}


  async function load(track) {
    if (!track) return;

    currentTrack = track;

    const res = await fetch(track.url);
    const data = await res.arrayBuffer();
    buffer = await ctx.decodeAudioData(data);
  }

  // --------------------
  // PLAYBACK
  // --------------------

  function play(track) {
    ensureContext();

    if (track && track !== currentTrack) {
      startOffset = 0;
      return load(track).then(() => start());
    }

    start();
  }
  function start() {
    if (!buffer) return;

    stopSource();
    manuallyStopped = false; // RESET on legitimate start

    isPlaying = true;
    source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = repeat;
    source.connect(gain);

    startTime = ctx.currentTime - startOffset;
    source.start(0, startOffset);

    source.onended = () => {
      if (isPlaying && !repeat && !manuallyStopped) { // GUARD HERE
        isPlaying = false;
        emit("ended");
      }
    };

    startTimeLoop();
    emit("playing");
  }

  function pause() {
    if (!buffer || !source) return;

    isPlaying = false;

    startOffset = ctx.currentTime - startTime;


   try { source.stop(); } catch {}
   source.onended = null;
   source.disconnect();
   source = null;
  
  stopTimeLoop();
    
  emit("paused");
  }

  function stop() {
    isPlaying = false;

    startOffset = 0;

    if (source) {
      try {source.stop(); } catch {}
      source.onended = null;
      source.disconnect();
      source = null;
    }

    stopTimeLoop();
    emit("stopped");
  }

    function seek(ratio) {
    if (!buffer) return;
    startOffset = ratio * buffer.duration;
    if (isPlaying) {   // was: if (source) — wrong, source is null after pause()
      start();
    }
  }

  function setRepeat(on) {
    repeat = !!on;
    if (source) {
      source.loop = repeat;
    }
  }

  // --------------------
  // TIME LOOP
  // --------------------

  function startTimeLoop() {
    stopTimeLoop();

    const tick = () => {
      if (!buffer) return;

      const elapsed = ctx.currentTime - startTime;
      const position = repeat
        ? elapsed % buffer.duration
        : Math.min(elapsed, buffer.duration);

      emit("time", {
        position,
        duration: buffer.duration
      });

      rafId = requestAnimationFrame(tick);
    };

    tick();
  }

  function stopTimeLoop() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // --------------------
  // MIX
  // --------------------

  function setVolume(v) {
    if (!Number.isFinite(v)) return;

    const now = ctx.currentTime;
    const value = Math.max(0, Math.min(1, v));

    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(value, now);
    gain.gain.linearRampToValueAtTime(value, now + 0.005);
  }

  function setPan(v) {
    if (mono) return;
    pan.pan.value = Math.max(-1, Math.min(1, v));
  }

  function setMono(on) {
    mono = !!on;

    if (mono) {
      lastPan = pan.pan.value;
      pan.pan.value = 0;
    } else {
      pan.pan.value = lastPan;
    }
  }

  // --------------------
  // PUBLIC API
  // --------------------

  return {
    play,
    pause,
    stop,
    seek,
    setRepeat,
    setVolume,
    setPan,
    setMono,
    on
  };
}