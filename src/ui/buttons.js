
export function createButtons({ 
  onPlay, 
  onPause, 
  onStop, 
  onNext, 
  onPrev, 
  onEject,

  onToggleShuffle, 
  onToggleRepeat, 
  onToggleEQ, 
  onTogglePL, 
  onToggleMono,

  onMinimize, 
  onMaximize, 
  onClose,

  onPress,
  onRelease
}) {

  console.log("createButtons mounted");

["play", "pause", "stop", "prev", "next", "eject"].forEach(id => {
  const el = document.getElementById(id);
  console.log(id, el);
});

function bindTransportButton(id) {
  const el = document.getElementById(id);
  if (!el) return;

  el.addEventListener("pointerdown", e => {
    console.log("PRESS:", id);
    onPress(id);
    el.setPointerCapture(e.pointerId);
  });

  el.addEventListener("pointerup", () => {
    console.log("RELEASE:", id);
    onRelease(id);
  });

  el.addEventListener("pointercancel", () => {
    onRelease(id);
  });

  el.addEventListener("pointerleave", () => {
    onRelease(id);
  });
}

["play", "pause", "stop", "prev", "next", "eject"].forEach(bindTransportButton);

 function wireButton(el, id, { onPress, onRelease, onClick }) {
  if (!el) return;

  el.addEventListener("pointerdown", e => {
    console.log("PRESS:", id);
    e.stopPropagation();
    onPress?.(id);
  });

  el.addEventListener("pointerup", e => {
    console.log("RELEASE:", id);
    e.stopPropagation();
    onRelease?.();
  });

  el.addEventListener("pointerleave", () => {
    onRelease?.();
  });

  el.onclick = e => {
    e.stopPropagation();
    onClick?.();
  };
}

  /* transport buttons */
  wireButton(
    document.getElementById("play"),
    "play",
    { onPress, onRelease, onClick: onPlay }
  );

    wireButton(
    document.getElementById("pause"),
    "pause",
    { onPress, onRelease, onClick: onPause }
  );
  
   wireButton(
    document.getElementById("stop"),
    "stop",
    { onPress, onRelease, onClick: onStop }
  );

   wireButton(
    document.getElementById("next"),
    "next",
    { onPress, onRelease, onClick: onNext }
  );
  
   wireButton(
    document.getElementById("prev"),
    "prev",
    { onPress, onRelease, onClick: onPrev }
  );

   wireButton(
    document.getElementById("eject"),
    "eject",
    { onPress, onRelease, onClick: onEject } // new button// 
  );


  /* window buttons */
  wireButton(
    document.getElementById("mono"),
    "mono",
    { onPress, onRelease, onClick: onToggleMono }
  );

  wireButton(
    document.getElementById("shuffle"),
    "shuffle",
    { onPress, onRelease, onClick: onToggleShuffle }
  );
  
  wireButton(
    document.getElementById("repeat"),
    "repeat",
    { onPress, onRelease, onClick: onToggleRepeat }
  );

    wireButton(
    document.getElementById("eq"),
    "eq",
    { onPress, onRelease, onClick: onToggleEQ }
  );
  
  wireButton(
    document.getElementById("pl"),
    "pl",
    { onPress, onRelease, onClick: onTogglePL }
  );
  
  
   /* titlebar buttons */
  wireButton(
    document.getElementById("minimize"),
    "minimize",
    { onPress, onRelease, onClick: onMinimize }
  );

  wireButton(
    document.getElementById("maximize"),
    "maximize",
    { onPress, onRelease, onClick: onMaximize }
  );

  wireButton(
    document.getElementById("close"),
    "close",
    { onPress, onRelease, onClick: onClose }
  );

}