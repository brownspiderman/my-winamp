// ui/lcd.js - Winamp LCD Display System
import { LCD_GLYPHS, LCD_CELL_WIDTH, LCD_GLYPH_HEIGHT } from "../data/lcdGlyphs.js";

function setSmallLCD(id, value) {
  const el = document.getElementById(`lcd-${id}`);
  if (!el) return;

  el.textContent = value;
}

/* ============================================
   MAIN LCD - TIME DISPLAY ONLY
   Shows: M:SS format track time
   ============================================ */

class MainLCD {
  constructor(container) {
    this.container = container;

    this.paused = false;
    this.seeking = false;

    this.blinkTimer = null;
    this.blinkVisible = true;

    this.lastTimeStr = "0:00";
    
    // Constants for layout
    this.START_X = 25;
    this.START_Y = 10;
    this.DIGIT_GAP = 5;

    this.render(this.lastTimeStr);
  }

  updateTime(seconds) {
    this.lastTimeStr = this.formatTime(seconds);
    this.render(this.lastTimeStr);
  }

  formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "0:00";

    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);

    // Pad to 5 characters total (e.g., " 1:23")
    return `${m}:${String(s).padStart(2, "0")}`.padStart(5, " ");
  }

  render(timeStr) {
    this.ensureSlots();

    const chars = timeStr.slice(0, 5).split("");

    const show = this.seeking 
    ? true 
    : !(this.paused && !this.blinkVisible);

    let x = this.START_X;

    [...this.container.children].forEach((el, i) => {
      const ch = chars[i];
      const glyph = LCD_GLYPHS[ch];

      // Handle spaces or missing glyphs
      if (!glyph || ch === " ") {
        el.style.visibility = "hidden";
        x += LCD_CELL_WIDTH + this.DIGIT_GAP;
        return;
      }

      // Standard rendering for digits AND colons
      el.style.visibility = show ? "visible" : "hidden";
      el.style.left = `${Math.floor(x)}px`;
      el.style.top = `${Math.floor(this.START_Y)}px`;
      el.style.width = `${glyph.w || LCD_CELL_WIDTH}px`;
      el.style.height = `${LCD_GLYPH_HEIGHT}px`; // Uses the height from your data
      el.style.backgroundPosition = `-${glyph.x}px -${glyph.y}px`;

      // Advance X cursor
      x += (glyph.w || LCD_CELL_WIDTH) + this.DIGIT_GAP;
    });
  }

  ensureSlots() {
    while (this.container.children.length < 5) {
      const el = document.createElement("div");
      el.className = "lcd-time-char";
      this.container.appendChild(el);
    }
  }

  play() {
    this.paused = false;
    this.stopBlinking();
  }

  pause() {
    this.paused = true;
    this.startBlinking();
  }

  stop() {
    this.paused = false;
    this.stopBlinking();
    this.updateTime(0);
  }

  eject() {
    this.stop();
  }

 
  startSeek() {
    this.seeking = true;
    this.stopBlinking();
    this.render(this.lastTimeStr);
  }

  endSeek() {
    this.seeking = false;

  if (this.paused) {
    this.startBlinking();
   }
  }

  startBlinking() {
    if (this.blinkTimer) return;
    this.blinkTimer = setInterval(() => {
      this.blinkVisible = !this.blinkVisible;
      this.render(this.lastTimeStr);
    }, 500);
  }

  stopBlinking() {
    if (this.blinkTimer) {
      clearInterval(this.blinkTimer);
      this.blinkTimer = null;
    }
      this.blinkVisible = true;
  }

  destroy() {
    this.stopBlinking();
  }
}

/* ============================================
   TRACK LCD - METADATA SCROLLING ONLY
   Shows: Title - Artist - Album - (Year)
   ============================================ */

class TrackLCD {
  constructor(container) {
    this.container = container;
    this.metadata = "";
    this.tempMessage = null;
    this.scrollOffset = 0;
    this.scrollTimer = null;
    this.pauseTimer = null;
    this.tempTimer = null;
    
    this.VISIBLE_CHARS = 31; // 155px / 5px per cell
    this.SCROLL_SPEED = 220; // ms between scroll steps
    this.PAUSE_START = 1800; // ms to pause before scrolling starts
    this.PAUSE_END = 700; // ms to pause before loop
  }
  
  // Set metadata from track info
  setMetadata(title, artist, album, year) {
    const parts = [];
    if (title) parts.push(title);
    if (artist) parts.push(artist);
    if (album) parts.push(album);
    if (year) parts.push(`(${year})`);
    
    this.metadata = parts
      .join(" - ")
      .toUpperCase()
      .replace(/[^A-Z0-9 :\-!|+=\/]/g, " ");
    
    if (!this.tempMessage) {
      this.startScroll();
    }
  }
  
  // Show temporary message (SEEK, PLAY, PAUSE, etc)
  showTemp(msg, duration = 900) {
    this.tempMessage = msg.toUpperCase();
    this.scrollOffset = 0;
    this.stopTimers();
    this.render();
    
    if (this.tempTimer) clearTimeout(this.tempTimer);
    this.tempTimer = setTimeout(() => {
      this.tempMessage = null;
      this.startScroll();
    }, duration);
  }
  
  render() {
    const text = this.tempMessage || this.metadata;
    
    if (!text) {
      this.paintChars("");
      return;
    }
    
    // Don't scroll if text fits
    if (text.length <= this.VISIBLE_CHARS) {
      this.paintChars(text);
      return;
    }
    
    // Scrolling text with separator
    const scrollText = text + "     ";
    const slice = scrollText.slice(this.scrollOffset, this.scrollOffset + this.VISIBLE_CHARS);
    this.paintChars(slice);
  }
  
  startScroll() {
    this.stopTimers();
    this.scrollOffset = 0;
    
    const text = this.tempMessage || this.metadata;
    
    if (!text || text.length <= this.VISIBLE_CHARS) {
      this.render();
      return;
    }
    
    // Pause before starting scroll (classic Winamp behavior)
    this.pauseTimer = setTimeout(() => {
      const scrollText = text + "     ";
      
      this.scrollTimer = setInterval(() => {
        this.render();
        this.scrollOffset++;
        
        // Loop back to start
        if (this.scrollOffset >= scrollText.length) {
          this.scrollOffset = 0;
          this.stopTimers();
          this.pauseTimer = setTimeout(() => this.startScroll(), this.PAUSE_END);
        }
      }, this.SCROLL_SPEED);
    }, this.PAUSE_START);
    
    this.render();
  }
  
  paintChars(text) {
    const chars = text.padEnd(this.VISIBLE_CHARS, " ").slice(0, this.VISIBLE_CHARS).split("");
    
    // Ensure correct number of character elements
    while (this.container.children.length < chars.length) {
      const el = document.createElement("div");
      el.className = "lcd-char";
      this.container.appendChild(el);
    }
    
    while (this.container.children.length > chars.length) {
      this.container.lastChild.remove();
    }
    
    // Paint each character
    let x = 0;
    
    [...this.container.children].forEach((el, i) => {
      const ch = chars[i];
      const glyph = LCD_GLYPHS[ch];
      
      if (!glyph) {
        el.style.visibility = "hidden";
        x += LCD_CELL_WIDTH;
        return;
      }
      
      el.style.visibility = "visible";
      el.style.left = `${x}px`;
      el.style.backgroundPosition = `-${glyph.x}px -${glyph.y}px`;
      
      // Advance cursor
      x += glyph.w || LCD_CELL_WIDTH;
    });
  }
  
  stopTimers() {
    if (this.scrollTimer) clearInterval(this.scrollTimer);
    if (this.pauseTimer) clearTimeout(this.pauseTimer);
    this.scrollTimer = null;
    this.pauseTimer = null;
  }
  
  destroy() {
    this.stopTimers();
    if (this.tempTimer) clearTimeout(this.tempTimer);
  }
}

/* ============================================
   PUBLIC API
   ============================================ */

export function createLCD() {
  const mainLCDEl = document.getElementById("main-lcd"); 
  const trackLCDEl = document.getElementById("track-lcd");

  function setIcon(state) {
    const el = document.getElementById("lcd-icon");

    if (!el) {
      console.warn("lcd-icon not found");
      return;
    }

    if (!state) {
      el.removeAttribute("data-state");
    } else {
      el.setAttribute("data-state", state);
    }
  }

  if (!mainLCDEl || !trackLCDEl) {
    return createNullLCD();
  }

  const mainLCD = new MainLCD(mainLCDEl);
  const trackLCD = new TrackLCD(trackLCDEl);
  
  return {
    play() { 
      mainLCD.play(); 
      setIcon("play");
    },
    pause() { 
      mainLCD.pause(); 
      setIcon("pause");
    },
    stop() { 
      mainLCD.stop(); 
      setIcon("stop");
    },

    setIcon,

    loading() {
      trackLCD.showTemp("LOADING");
    },

    loop() {
      trackLCD.showTemp("LOOP", 700);
    },

    seek() {
      trackLCD.showTemp("SEEK", 600);
    },

    updateTime(seconds) {
      mainLCD.updateTime(seconds);
    },

    showTemp(msg, duration) {
      trackLCD.showTemp(msg, duration);
    },

    setMetadata(title, artist, album, year) {
      trackLCD.setMetadata(title, artist, album, year);
    },

    setStats({ kbps, khz }) {
      setSmallLCD("kbps", kbps);
      setSmallLCD("khz", khz);
    },

    destroy() {
      mainLCD.destroy();
      trackLCD.destroy();
    }
  };
}

function createNullLCD() {
  return {
    play() {},
    loading() {},
    pause() {},
    stop() {},
    showTemp() {},
    setMetadata() {},
    setStats() {},
    setSmallLCD() {},
    destroy() {}
  };
}