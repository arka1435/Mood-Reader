/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'display': ['Syne', 'sans-serif'],
        'body': ['"DM Sans"', 'sans-serif'],
        'mono': ['"JetBrains Mono"', 'monospace']
      },
      colors: {
        base: 'var(--bg-base)',
        card: 'var(--bg-card)',
        elevated: 'var(--bg-elevated)',
        hover: 'var(--bg-hover)',
        active: 'var(--bg-active)',
        
        'accent-primary': 'var(--accent-primary)',
        'accent-primary-light': 'var(--accent-primary-light)',
        'accent-primary-lighter': 'var(--accent-primary-lighter)',
        
        'accent-secondary': 'var(--accent-secondary)',
        'accent-secondary-light': 'var(--accent-secondary-light)',
        'accent-secondary-lighter': 'var(--accent-secondary-lighter)',
        
        'accent-tertiary': 'var(--accent-tertiary)',
        'accent-tertiary-light': 'var(--accent-tertiary-light)',
        'accent-tertiary-lighter': 'var(--accent-tertiary-lighter)',
        
        'accent-highlight': 'var(--accent-highlight)',
        'accent-highlight-light': 'var(--accent-highlight-light)',
        'accent-highlight-lighter': 'var(--accent-highlight-lighter)',
        
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        
        'border-default': 'var(--border-default)',
        
        'emotion-angry': 'var(--emotion-angry)',
        'emotion-fearful': 'var(--emotion-fearful)',
        'emotion-happy': 'var(--emotion-happy)',
        'emotion-neutral': 'var(--emotion-neutral)',
        'emotion-sad': 'var(--emotion-sad)',
        'emotion-surprised': 'var(--emotion-surprised)',
      }
    },
  },
  plugins: [],
}
