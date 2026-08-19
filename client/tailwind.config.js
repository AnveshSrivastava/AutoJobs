/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      "colors": {
        "on-tertiary-container": "#912038",
        "surface-container-highest": "#353534",
        "surface": "#131313",
        "on-primary": "#003731",
        "inverse-primary": "#006b5f",
        "on-surface": "#e5e2e1",
        "surface-container-lowest": "#0e0e0e",
        "surface-variant": "#353534",
        "error": "#ffb4ab",
        "secondary": "#9ddf2e",
        "outline-variant": "#3c4a46",
        "primary-fixed-dim": "#3cddc7",
        "tertiary-fixed-dim": "#ffb2b9",
        "on-primary-container": "#00574d",
        "background": "#131313",
        "surface-tint": "#3cddc7",
        "on-surface-variant": "#bacac5",
        "surface-container": "#201f1f",
        "on-tertiary-fixed": "#400010",
        "surface-container-low": "#1c1b1b",
        "on-primary-fixed-variant": "#005047",
        "secondary-container": "#83c300",
        "on-secondary": "#213600",
        "inverse-on-surface": "#313030",
        "on-error-container": "#ffdad6",
        "inverse-surface": "#e5e2e1",
        "surface-dim": "#131313",
        "secondary-fixed-dim": "#98da27",
        "primary": "#57f1db",
        "primary-container": "#2dd4bf",
        "outline": "#859490",
        "surface-container-high": "#2a2a2a",
        "on-primary-fixed": "#00201c",
        "secondary-fixed": "#b2f746",
        "error-container": "#93000a",
        "tertiary-container": "#ffa5ae",
        "on-tertiary-fixed-variant": "#891933",
        "tertiary-fixed": "#ffdadc",
        "on-error": "#690005",
        "on-secondary-container": "#304b00",
        "on-secondary-fixed": "#121f00",
        "primary-fixed": "#62fae3",
        "on-tertiary": "#67001f",
        "on-secondary-fixed-variant": "#334f00",
        "on-background": "#e5e2e1",
        "surface-bright": "#3a3939",
        "tertiary": "#ffcdd1"
      },
      "borderRadius": {
        "DEFAULT": "1rem",
        "lg": "2rem",
        "xl": "3rem",
        "full": "9999px"
      },
      "spacing": {
        "container-max": "1280px",
        "unit": "8px",
        "gutter": "32px",
        "margin-mobile": "20px",
        "section-gap": "160px"
      },
      "fontFamily": {
        "headline-md": ["Plus Jakarta Sans"],
        "body-lg": ["Manrope"],
        "display-lg-mobile": ["Plus Jakarta Sans"],
        "body-md": ["Manrope"],
        "display-lg": ["Plus Jakarta Sans"],
        "label-sm": ["JetBrains Mono"]
      },
      "fontSize": {
        "headline-md": ["40px", { "lineHeight": "48px", "letterSpacing": "-0.02em", "fontWeight": "700" }],
        "body-lg": ["18px", { "lineHeight": "28px", "fontWeight": "400" }],
        "display-lg-mobile": ["48px", { "lineHeight": "52px", "letterSpacing": "-0.03em", "fontWeight": "800" }],
        "body-md": ["16px", { "lineHeight": "24px", "fontWeight": "400" }],
        "display-lg": ["72px", { "lineHeight": "80px", "letterSpacing": "-0.04em", "fontWeight": "800" }],
        "label-sm": ["12px", { "lineHeight": "16px", "letterSpacing": "0.05em", "fontWeight": "500" }]
      },
      keyframes: {
        bob: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      },
      animation: {
        bob: 'bob 4s ease-in-out infinite',
      }
    }
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
}
