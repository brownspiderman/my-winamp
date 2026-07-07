/* app.js/

//--------------
//* IMPORTS */
//--------------
import "./css/base.css";
import "./css/layout.css";
import "./css/skin.css";

import { PLAYLIST } from "./data/playlist.js";
import { createAudioEngine } from "./audio/audio-engine.js";
import { createTransport } from "./audio/transport.js";
import { bindKeyboardControls } from "./ui/keyboard.js";

import { createLCD } from "./ui/lcd.js";
import { LCD_GLYPHS, LCD_CELL_WIDTH } from "./data/lcdGlyphs.js";
import { createButtons } from "./ui/buttons.js";
import { makeSlider } from "./ui/sliders.js";
import { makeTitlebarDraggable } from "./ui/titlebar.js";
import { VOLUME_FRAMES, BALANCE_FRAMES } from "./data/sliderFrames.js";


//--------------
//* CONSTANTS */
//--------------
let isSeeking = false;
let eqWindow = null;
let plWindow = null;

let wasPlayingBeforeSeek = false;
let engineDuration = 0;

const winamp =  document.getElementById("winamp");
const engine = createAudioEngine();
const transport = createTransport({ engine, playlist: PLAYLIST });
const lcd = createLCD();
//const VOLUME_FRAMES_COUNT = 28;
//const VOLUME_KNOB_TRAVEL = 54;

// ---------
// SETUP 
// ----------

function centerPlayer() {
  const rect = winamp.getBoundingClientRect();

  winamp.style.left = `${(window.innerWidth - rect.width) / 2}px`;
  winamp.style.top = `${(window.innerHeight - rect.height) / 2}px`;
}

centerPlayer();
window.addEventListener("resize", centerPlayer);

transport.setOnTrackChange(track => {
  lcd.setMetadata(track.title, track.artist, track.album, track.year);
  lcd.setStats({ kbps: track.kbps, khz: track.khz }
  );
});

//--------------
//* DOM CACHE */
//--------------
const DOM = {
  // root
  winamp,

  // buttons
  play: document.getElementById("play"),
  pause: document.getElementById("pause"),
  stop: document.getElementById("stop"),
  prev: document.getElementById("prev"),
  next: document.getElementById("next"),
  eject: document.getElementById("eject"),
  shuffle: document.getElementById("shuffle"),
  repeat: document.getElementById("repeat"),
  eq: document.getElementById("eq"),
  pl: document.getElementById("pl"),

  // sliders
  volumeBar: document.getElementById("volume-bar"),
  volumeKnob: document.getElementById("volume-knob"),
  balanceBar: document.getElementById("balance-bar"),
  balanceKnob: document.getElementById("balance-knob"),
  posBar: document.getElementById("posbar"),
  posKnob: document.getElementById("posknob"),
};

//--------------
//* DOM CACHE */
//--------------

DOM.winamp.addEventListener("dragover", e => {
  e.preventDefault();
  DOM.winamp.classList.add("drag-over");
});

DOM.winamp.addEventListener("dragleave", e => {
  DOM.winamp.classList.remove("drag-over");
});

DOM.winamp.addEventListener("drop", e => {
  e.preventDefault();
  DOM.winamp.classList.remove("drag-over");
  handleFileDrop(e.dataTransfer.files);

  const files = [...e.dataTransfer.files]
    .filter(f => f.type.startsWith("audio/"));

  if (!files.length) return;

    const tracks = files.map(file => ({
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: "Local File",
      album: "",
      year: "",
      kbps: "",
      khz: "",
      url: URL.createObjectURL(file)
    }));

    transport.addTracks(tracks);

    // play first dropped track if nothing playing
    if (!uiState.playing) {
      transport.playIndex(transport.length - tracks.length);
    }
  });
//--------------
//* UI STATE */
//--------------
export const uiState = {
  playing: false,

  mono: true,
  shuffle: false,
  repeat: false,

  volume: 1,
  balance: 0.5,
  position: 0,

   eqOpen: false,
   plOpen: false,
   minimized: false,

  interaction: {
    pressed: null,
    dragging: null
  }
};

//--------------
//* RENDER SCHEDULER */
//--------------
let uiDirty = true;

function requestUIUpdate() {
  uiDirty = true;
}

function uiLoop() {
  if (uiDirty) {
    syncUI();
    uiDirty = false;
  }
  requestAnimationFrame(uiLoop);
}
uiLoop();

bindKeyboardControls({ engine, transport, uiState, requestUIUpdate });

//--------------
//* SLIDERS */
//--------------
const volumeSlider = makeSlider({
  id: "volume",
  bar: document.getElementById("volume-bar"),
  knob: document.getElementById("volume-knob"),
  onStart: id => {
    uiState.interaction.dragging = id;
    requestUIUpdate();
  },
  onChange: v => {
    uiState.volume = v;
    engine.setVolume(v ** 2.2);
    requestUIUpdate();
  },
  onEnd: () => {
    uiState.interaction.dragging = null;
    requestUIUpdate();
  }
});

const balanceSlider = makeSlider({
  id: "balance",
  bar: document.getElementById("balance-bar"),
  knob: document.getElementById("balance-knob"),
  onStart: id => {
    uiState.interaction.dragging = id;
    requestUIUpdate();
  },
  onChange: v => {
    uiState.balance = v;
    if (!uiState.mono) {
      engine.setPan(v < 0.33 ? -1 : v < 0.66 ? 0 : 1);
    }
    requestUIUpdate();
  },
  onEnd: () => {
    uiState.interaction.dragging = null;
    requestUIUpdate();
  }
});

const posSlider = makeSlider({
  id: "position",
  bar: document.getElementById("posbar"),
  knob: document.getElementById("posknob"),

  onStart: () => {
  isSeeking = true;
  uiState.interaction.dragging = "position";

  wasPlayingBeforeSeek = uiState.playing;

  lcd.startSeek();

  requestUIUpdate();

  // Delay pause one microtask to avoid pointer interruption
  if (wasPlayingBeforeSeek) {
    setTimeout(() => {
      transport.pause();
    }, 0);
  }
},

  onChange: v => {
    uiState.position = v;

    if (engineDuration) {
      lcd.updateTime(v * engineDuration);
    }

    requestUIUpdate();
  },
  
  onEnd: () => {
    isSeeking = false;
    uiState.interaction.dragging = null;

    transport.seek(uiState.position);

    lcd.endSeek();

    if (wasPlayingBeforeSeek) {
      transport.play();
    }

    requestUIUpdate();
  }
});

//--------------
//* BUTTONS */
//--------------
createButtons({
   onPlay: () => {
    transport.play();
  },

  onPause: () => {
    transport.pause();
  },

  onStop: () => {
    transport.stop();
  },
  
  onNext: () => {
    transport.next();
  },

  onPrev: () => {
    transport.prev();
  },

  onEject: () => {
    transport.stop();
  },

  onPress: id => {
    uiState.interaction.pressed = id;
    requestUIUpdate();
  },

  onRelease: () => {
    uiState.interaction.pressed = null;
    requestUIUpdate();
  },

  onToggleShuffle: () => {
    uiState.shuffle = !uiState.shuffle;
    transport.setShuffle(uiState.shuffle);
    requestUIUpdate();
  },

  onToggleRepeat: () => {
    uiState.repeat = !uiState.repeat;
    transport.setRepeat(uiState.repeat);
    requestUIUpdate();
  },

  onToggleMono: () => {
    uiState.mono = !uiState.mono;
    engine.setMono(uiState.mono);
    balanceSlider.setDisabled(uiState.mono);
    requestUIUpdate();
  },

  onToggleEQ: () => {
    uiState.eqOpen = !uiState.eqOpen;
    requestUIUpdate();
  },

  onTogglePL: () => {
    uiState.plOpen = !uiState.plOpen;
    requestUIUpdate();
  }
});

//--------------
//* EQ + PL WINDOWS */
//--------------
function syncWindows() {
  if (uiState.eqOpen && !eqWindow) {
    eqWindow = createWinampWindow("eq");
  }
  if (eqWindow) {
    eqWindow.style.display = uiState.eqOpen ? "block" : "none";
  }

  if (uiState.plOpen && !plWindow) {
    plWindow = createWinampWindow("pl");
  }
  if (plWindow) {
    plWindow.style.display = uiState.plOpen ? "block" : "none";
  }
}

//--------------
//* UI SYNC */
//--------------
function syncUI() {
  const { pressed, dragging } = uiState.interaction;

  // ----- Transport buttons (pressed) -----
  ["play", "pause", "stop", "prev", "next", "eject"].forEach(id => {
    const el = DOM[id];
    if (el) el.classList.toggle("pressed", pressed === id);
  });

  // ----- Toggle buttons (active) -----
  DOM.shuffle?.classList.toggle("active", uiState.shuffle);
  DOM.repeat?.classList.toggle("active", uiState.repeat);

  DOM.eq?.classList.toggle("pressed", pressed === "eq");
  DOM.pl?.classList.toggle("pressed", pressed === "pl");

  // ----- Window state -----
  DOM.winamp.classList.toggle("eq-open", uiState.eqOpen);
  DOM.winamp.classList.toggle("pl-open", uiState.plOpen);

  // ----- Mono / Stereo -----
  DOM.winamp.classList.toggle("mono", uiState.mono);
  DOM.winamp.classList.toggle("stereo", !uiState.mono);

  // ----- Slider pressed states -----
  DOM.volumeKnob?.classList.toggle("pressed", dragging === "volume");
  DOM.balanceKnob?.classList.toggle("pressed", dragging === "balance");
  DOM.posKnob?.classList.toggle("pressed", dragging === "position");

  // ----- Volume slider -----
  if (DOM.volumeBar && DOM.volumeKnob) {
    const volumeIndex = Math.max(
      0,
      Math.min(27, Math.round(uiState.volume * 27))
    );
    const frame = VOLUME_FRAMES[volumeIndex];
    const vol = Math.max(0, Math.min(1, uiState.volume));
    uiState.volume = vol;

    DOM.volumeKnob.style.left = `${Math.round(vol * 54)}px`;
    DOM.volumeBar.style.backgroundPosition = `${frame.x}px ${frame.y}px`;
  }

  // ----- Balance slider -----
  if (DOM.balanceBar && DOM.balanceKnob) {
    const balanceValue = uiState.mono ? 0.5 : uiState.balance;
    const balanceIndex = Math.max(
      0,
      Math.min(27, Math.round(balanceValue * 27))
    );
    const frame = BALANCE_FRAMES[balanceIndex];

    DOM.balanceKnob.style.left = `${Math.round(balanceValue * 24)}px`;
   
  }

  // ----- Position slider -----
  if (DOM.posKnob) {
    DOM.posKnob.style.left = `${Math.round(uiState.position * 218)}px`;
  }

  // ----- Dragging classes -----
  DOM.volumeBar?.classList.toggle("dragging", dragging === "volume");
  DOM.balanceBar?.classList.toggle("dragging", dragging === "balance");
  DOM.posBar?.classList.toggle("dragging", dragging === "position");

  syncWindows();
}

//--------------
//* ENGINE STATES */
//--------------
  engine.on("playing", () => {
  uiState.playing = true;
  lcd.play();
  requestUIUpdate();
  });

  engine.on("paused", () => {
    uiState.playing = false;
    lcd.pause();
    requestUIUpdate();
  });

  engine.on("stopped", () => {
    uiState.playing = false;
    uiState.position = 0;
    lcd.stop();
    requestUIUpdate();
  });

  engine.on("time", ({ position, duration }) => {
    engineDuration = duration;

    if (!isSeeking && duration) {
      uiState.position = position / duration;
      lcd.updateTime(position);
      requestUIUpdate();
    }
  });


//--------------
//* TITLEBAR */
//--------------
makeTitlebarDraggable({
  root: document.getElementById("winamp"),
  handle: document.getElementById("titlebar")
});

//--------------
//* WINDOW CREATION */
//--------------
function createWinampWindow(type) {
  const el = document.createElement("div");
  el.className = `winamp-window ${type}`;
  el.style.left = "300px";
  el.style.top = "200px";

  document.body.appendChild(el);
  makeTitlebarDraggable({
    root: el,
    handle: el,
  });

  return el;
}

//--------------
//* LCDs */
//--------------
function drawMiniLCD(container, value, digits) {
  if (!container) return;

  const text = String(value ?? "")
    .padStart(digits, " ")
    .slice(0, digits)
    .split("");

  // Ensure slots
  while (container.children.length < digits) {
    const el = document.createElement("div");
    el.className = "mini-lcd-char";
    container.appendChild(el);
  }

  while (container.children.length > digits) {
    container.lastChild.remove();
  }

  let x = 0;

  text.forEach((ch, i) => {
    const el = container.children[i];
    const glyph = LCD_GLYPHS[ch];

    if (!glyph) {
      el.style.visibility = "hidden";
      x += LCD_CELL_WIDTH;
      return;
    }

    el.style.visibility = "visible";
    el.style.left = `${x}px`;
    el.style.backgroundPosition = `-${glyph.x}px -${glyph.y}px`;

    x += glyph.w || LCD_CELL_WIDTH;
  });

}

drawMiniLCD(document.getElementById("kbps-lcd"), 128, 3);
drawMiniLCD(document.getElementById("khz-lcd"), 44, 2);


//-----------------------
//* DRAG & DROP HELPER */
//-----------------------

function handleFileDrop(fileList) {
  const files = Array.from(fileList).filter(file => 
    file.type.startsWith("audio/")
  );

  if (!files.length) return;

  const tracks = files.map(file => ({
    title: file.name.replace(/\.[^/.]+$/, ""),
    artist: "Local File",
    album: "",
    year: "",
    kbps: "",
    khz: "",
    url: URL.createObjectURL(file),
  }));

  transport.addTracks(tracks);

  lcd.showTemp(
    `ADDED ${tracks.length} TRACK${tracks.length > 1 ? "S" : ""}`,
    900
  );

  if (!uiState.playing) {
    transport.playIndex(transport.length - tracks.length);
  }
}



//--------------
//* INIT */
//--------------
engine.setRepeat(false);
engine.setVolume(1);
engine.setMono(true);
engine.setPan(0);
transport.init();

setTimeout(() => {
  PLAYLIST.slice(0, 4).forEach(track => engine.preload(track));
}, 500);

const defaultIndex = PLAYLIST.findIndex(t => t.default);
if (defaultIndex !== -1) {
  transport.selectIndex(defaultIndex);
}

requestUIUpdate();
