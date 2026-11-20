// Apply the stored theme before the application stylesheet is loaded.
(() => {
  let preference = 'system';
  try {
    const stored = localStorage.getItem('octopus.theme');
    if (stored === 'light' || stored === 'dark') preference = stored;
  } catch {
    // The application remains usable when browser storage is unavailable.
  }
  document.documentElement.dataset.theme =
    preference === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : preference;
})();
