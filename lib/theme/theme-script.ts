// This script runs before React hydrates to prevent theme flashing
export const themeInitScript = `
  (function() {
    try {
      // Get theme from localStorage or default to 'light'
      const stored = localStorage.getItem('theme');
      const theme = stored === 'dark' ? 'dark' : 'light';

      // Apply theme class to html element
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
      document.documentElement.setAttribute('data-theme', theme);

      // Store theme if not already stored
      if (!stored) {
        localStorage.setItem('theme', 'light');
      }
    } catch (e) {
      // Fallback to light theme if localStorage is not available
      document.documentElement.classList.add('light');
    }
  })();
`;