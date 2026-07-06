export function createTransport({ engine, playlist }) {
  let index = 0;
  let shuffle = false;
  let repeat = false;
  let onTrackChange = null;

  // --------------
  // INTERNAL HELPERS
  //------------
  function selectIndex(i) {
    if (!playlist.length) return;

    index = clampIndex(i);
    notify();
  }

  function clampIndex(i) {
    if( !playlist.length) return 0;
    return (i + playlist.length) % playlist.length;
  }

  function notify() {
    const track = playlist[index];
    if (track && onTrackChange) onTrackChange(track);
    return track;
  }

  function getNextIndex() {
    if(!playlist.length) return 0;

    if (shuffle) {
      if (playlist.length === 1) return index;

      let next;
      do {
        next = Math.floor(Math.random() * playlist.length);
      } while (next === index);

      return next;
    }
      
    return clampIndex(index +1);
  }

  //-------------------
  // ENGINE EVENT WIRING
  // ------------------
   
  engine.on ("ended", handleEnded);

  function handleEnded() {
    if (!playlist.length) return;

    if (repeat) {
      return;
    }

    const isLastTrack = index === playlist.length -1;

    if (!shuffle && isLastTrack) {
      engine.stop();
      return;
    }

    index = getNextIndex();
    engine.play(notify());
  }

  //-------------------
  // PLAYLIST
  // ------------------
  function addTracks(newTracks) {
    const wasEmpty = playlist.length === 0;
    playlist.push(...newTracks);

    if (wasEmpty && playlist.length) {
      index = 0;
      notify();
    }
  }

    function init() {
    if (playlist.length) notify();
    }

  //-------------------
  // PLAYBACK
  // ------------------

   function play() {
    if (!playlist.length) return;
    engine.play(playlist[index]);
   }
  
   function playIndex(i) {
    if (!playlist.length) return;
    index = clampIndex(i);
    engine.play(notify());
   }

   function pause() {
    engine.pause();
   }

   function stop() {
    engine.stop();
   }

   function next() {
    if (!playlist.length) return;
    index = getNextIndex();
    engine.play(notify());
   }

   function prev() {
    if (!playlist.length) return;
    index = clampIndex(index -1);
    engine.play(notify());
  }

   function seek(ratio) {
    engine.seek(ratio);
   }


  //------------
  // MODES
  // -----------
  
  function setRepeat(v) {
    repeat = !!v;
    engine.setRepeat(repeat);
  }

  function setShuffle(v) {
    shuffle = !!v;
  }

  //----------------
  // PUBLIC API
  // ---------------

  return {
    init,
    play,
    playIndex,
    selectIndex,
    pause,
    stop,
    next,
    prev,
    seek,
    setShuffle,
    setRepeat,
    addTracks,

    get length() {
      return playlist.length;
    },

    get current() {
      return playlist[index] || null;
    },

    setOnTrackChange(cb) {
      onTrackChange = cb;
      }
    };
   }
