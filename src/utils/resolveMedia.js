// src/utils/resolveMedia.js
const MEDIA_BASE = "./media/";

export function resolveMediaURL(filename) {
  return MEDIA_BASE + encodeURIComponent(filename);
}