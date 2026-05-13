// src/ui/titlebar.js
export function makeTitlebarDraggable({ root, handle }) {

  let dragging = false;
  let pendingMove = null;
  let offsetX = 0;
  let offsetY = 0;
  let activePointerId = null;

  // Ensure the window has concrete coordinates once
  if (!root.style.left || !root.style.top) {
    const rect = root.getBoundingClientRect();
    root.style.left = `${rect.left}px`;
    root.style.top  = `${rect.top}px`;
  }

  handle.addEventListener("pointerdown", e => {
    if (e.target.closest("#titlebar-btns .button")) return;

    dragging = true;
    activePointerId = e.pointerId;

    offsetX = e.clientX - root.offsetLeft;
    offsetY = e.clientY - root.offsetTop;

    handle.setPointerCapture(activePointerId);
    document.body.classList.add("dragging");

    e.preventDefault();
  });

  handle.addEventListener("pointermove", e => {
    if (!dragging || e.pointerId !== activePointerId) return;
    pendingMove = { x: e.clientX, y: e.clientY };
  });

  handle.addEventListener("pointerup", e => {
    if (!dragging || e.pointerId !== activePointerId) return;

    dragging = false;
    pendingMove = null;
    activePointerId = null;

    handle.releasePointerCapture(e.pointerId);
    document.body.classList.remove("dragging");
  });
    function dragLoop() {
    if (dragging && pendingMove) {
      root.style.left = `${pendingMove.x - offsetX}px`;
      root.style.top  = `${pendingMove.y - offsetY}px`;
      pendingMove = null;
    }
    requestAnimationFrame(dragLoop);
  }
  dragLoop();
  }

