function adjustVolume(delta, uiState, engine, requestUIUpdate) {
  const base = Number.isFinite(uiState.volume) ? uiState.volume : 1;
  const v = Math.max(Math.min(1, base + delta));
  uiState.volume = v;
  engine.setVolume(v ** 2.2);

  uiState.interaction.dragging = "volume";

  requestUIUpdate();

  clearTimeout(adjustVolume._t);
  adjustVolume._t = setTimeout(() => {
    uiState.interaction.dragging =null;
    requestUIUpdate();
  }, 120
);
  
}

export function bindKeyboardControls({ engine, transport, uiState, requestUIUpdate }) {
  window.addEventListener("keydown", e => {
    // Don’t hijack typing
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    switch (e.code) {
      case "Space":
        e.preventDefault();
        uiState.playing ? transport.pause() : transport.play();
        break;

      case "ArrowLeft":
        e.preventDefault();
        transport.prev();
        break;

      case "ArrowRight":
        e.preventDefault();
        transport.next();
        break;

      case "ArrowUp":
        e.preventDefault();
        adjustVolume(+0.05, uiState, engine, requestUIUpdate);
        break;

      case "ArrowDown":
        e.preventDefault();
        adjustVolume(-0.05, uiState, engine, requestUIUpdate);
        break;
    }
  });
}