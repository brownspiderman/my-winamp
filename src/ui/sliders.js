export function makeSlider({ id, bar, knob, onStart, onChange, onEnd }) {
  let dragging = false;

  function getRatio(clientX) {
    const rect = bar.getBoundingClientRect();
    const maxX = bar.clientWidth;
    let x = clientX - rect.left;
    x = Math.max(0, Math.min(maxX, x));
    return maxX === 0 ? 0 : x / maxX;
  }

  knob.addEventListener("pointerdown", e => {
    e.stopPropagation();
    dragging = true;
    if (bar.classList.contains("disabled")) return;
    
    knob.setPointerCapture(e.pointerId);
    onStart?.(id);
    e.preventDefault();
  });

    bar.addEventListener("pointerdown", e => {
    e.stopPropagation(); // ✅ prevent titlebar drag
  });

  window.addEventListener("pointermove", e => {
    if (!dragging) return;
    onChange?.(getRatio(e.clientX));
  });

  window.addEventListener("pointerup", () => {
    if (!dragging) return;
    dragging = false;
    onEnd?.(id);
  });

  return {
    setValue(_) {
      /* intentionally empty */
    },

    setDisabled(disabled) {
      bar.classList.toggle("disabled", disabled);
    }
  };
}