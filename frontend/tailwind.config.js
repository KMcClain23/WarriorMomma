// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    fontFamily: {
      serif: ['Cormorant Garamond', 'serif'],
    },
    extend: {
      colors: {
        ink: 'var(--raven-ink)',
        paper: 'var(--paper)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        accent2: 'var(--accent-2)',
        danger: 'var(--rose-blood)',
        'rose-blood': 'var(--rose-blood)',
        'plum-velvet': 'var(--plum-velvet)',
        'jade-venom': 'var(--jade-venom)',
        'raven-ink': 'var(--raven-ink)',
        'gold-ritual': 'var(--gold-ritual)',
        'violet-phantom': 'var(--violet-phantom)',
        'steel-mafia': 'var(--steel-mafia)',
        'ember-temptation': 'var(--ember-temptation)',
        'noir-neon': 'var(--noir-neon)'
      },
      borderRadius: { velvet: '14px', ritual: '999px' },
      boxShadow: {
        soft: '0 10px 30px -10px rgba(0,0,0,.45)',
        sharp: '0 2px 0 0 rgba(255,255,255,.06), 0 0 0 1px rgba(255,255,255,.06) inset',
        glow: '0 0 0 2px var(--accent-2), 0 10px 30px -10px var(--accent-2)'
      },
      transitionTimingFunction: {
        velvet: 'cubic-bezier(.22,.61,.36,1)',
        whiplash: 'cubic-bezier(.3,1.3,.3,1)'
      },
      keyframes: {
        velvetFade: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        ravenWing: { '0%': { transform: 'translateY(2px) rotate(-2deg)' }, '50%': { transform: 'translateY(-2px) rotate(2deg)' }, '100%': { transform: 'translateY(0) rotate(0)' } },
        knifeFlash: { '0%': { filter: 'brightness(1)' }, '40%': { filter: 'brightness(1.8)' }, '100%': { filter: 'brightness(1)' } },
        neonPulse: { '0%,100%': { boxShadow: '0 0 0 rgba(0,0,0,0)' }, '50%': { boxShadow: '0 0 24px var(--noir-neon)' } },
        roseBloom: { '0%': { letterSpacing: '-.04em', opacity: .8 }, '100%': { letterSpacing: '0', opacity: 1 } },
        phantomCurtain: { '0%': { clipPath: 'inset(0 0 100% 0)' }, '100%': { clipPath: 'inset(0 0 0 0)' } }
      },
      animation: {
        velvetFade: 'velvetFade .5s ease-in-out both',
        ravenWing: 'ravenWing 800ms ease-in-out',
        knifeFlash: 'knifeFlash 350ms linear',
        neonPulse: 'neonPulse 2.2s ease-in-out infinite',
        roseBloom: 'roseBloom 700ms ease-out',
        phantomCurtain: 'phantomCurtain .7s ease-in-out both'
      },
      backgroundImage: {
        'thorn-gradient': 'linear-gradient(135deg, transparent 0 40%, var(--rose-blood) 40% 42%, transparent 42% 58%, var(--rose-blood) 58% 60%, transparent 60%)',
        'neon-rain': 'radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,.08) 1px, transparent 1px), radial-gradient(1px 1px at 40px 60px, rgba(255,255,255,.06) 1px, transparent 1px)'
      }
    }
  },
  plugins: []
};
