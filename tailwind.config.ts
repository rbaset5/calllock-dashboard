import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-plus-jakarta)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // CallLock Navy (Primary - Trust/Reliability)
        navy: {
          50: 'hsl(var(--cl-navy-50))',
          100: 'hsl(var(--cl-navy-100))',
          200: 'hsl(var(--cl-navy-200))',
          300: 'hsl(var(--cl-navy-300))',
          400: 'hsl(var(--cl-navy-400))',
          500: 'hsl(var(--cl-navy-500))',
          600: 'hsl(var(--cl-navy-600))',
          700: 'hsl(var(--cl-navy-700))',
          800: 'hsl(var(--cl-navy-800))',
          900: 'hsl(var(--cl-navy-900))',
          DEFAULT: 'hsl(var(--cl-navy-600))',
        },
        // CallLock Gold (Accent - Warmth/Action)
        gold: {
          50: 'hsl(var(--cl-gold-50))',
          100: 'hsl(var(--cl-gold-100))',
          200: 'hsl(var(--cl-gold-200))',
          300: 'hsl(var(--cl-gold-300))',
          400: 'hsl(var(--cl-gold-400))',
          500: 'hsl(var(--cl-gold-500))',
          600: 'hsl(var(--cl-gold-600))',
          700: 'hsl(var(--cl-gold-700))',
          800: 'hsl(var(--cl-gold-800))',
          900: 'hsl(var(--cl-gold-900))',
          DEFAULT: 'hsl(var(--cl-gold-500))',
        },
        // Semantic Colors
        success: {
          50: 'hsl(var(--cl-success-50))',
          100: 'hsl(var(--cl-success-100))',
          500: 'hsl(var(--cl-success-500))',
          600: 'hsl(var(--cl-success-600))',
          700: 'hsl(var(--cl-success-700))',
          DEFAULT: 'hsl(var(--cl-success-500))',
        },
        warning: {
          50: 'hsl(var(--cl-warning-50))',
          100: 'hsl(var(--cl-warning-100))',
          500: 'hsl(var(--cl-warning-500))',
          600: 'hsl(var(--cl-warning-600))',
          700: 'hsl(var(--cl-warning-700))',
          DEFAULT: 'hsl(var(--cl-warning-500))',
        },
        error: {
          50: 'hsl(var(--cl-error-50))',
          100: 'hsl(var(--cl-error-100))',
          500: 'hsl(var(--cl-error-500))',
          600: 'hsl(var(--cl-error-600))',
          700: 'hsl(var(--cl-error-700))',
          DEFAULT: 'hsl(var(--cl-error-500))',
        },
        info: {
          50: 'hsl(var(--cl-info-50))',
          100: 'hsl(var(--cl-info-100))',
          500: 'hsl(var(--cl-info-500))',
          600: 'hsl(var(--cl-info-600))',
          700: 'hsl(var(--cl-info-700))',
          DEFAULT: 'hsl(var(--cl-info-500))',
        },
        // shadcn CSS variable colors (preserved for compatibility)
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
