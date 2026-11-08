/* ui/icons.js: the icon set, once. Lucide geometry on a 24 unit grid, drawn with the stroke
   settings in base.css, so every icon in the app comes from the same library and the same hand.
   Add an icon here rather than inlining a path at the call site. */
const PATHS = {
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  left: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  right: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
};
const icon = name => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name] || ''}</svg>`;

export { icon };
