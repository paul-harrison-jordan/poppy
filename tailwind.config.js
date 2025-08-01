/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				foreground: 'hsl(var(--success-foreground))'
  			},
  			warning: {
  				DEFAULT: 'hsl(var(--warning))',
  				foreground: 'hsl(var(--warning-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			// Semantic Brand Colors
  			'poppy-primary': {
  				DEFAULT: 'hsl(var(--poppy-primary))',
  				hover: 'hsl(var(--poppy-primary-hover))',
  				light: 'hsl(var(--poppy-primary-light))',
  				foreground: 'hsl(var(--poppy-primary-foreground))'
  			},
  			'sprout-success': {
  				DEFAULT: 'hsl(var(--sprout-success))',
  				hover: 'hsl(var(--sprout-success-hover))',
  				light: 'hsl(var(--sprout-success-light))',
  				foreground: 'hsl(var(--sprout-success-foreground))'
  			},
  			'lavender-secondary': {
  				DEFAULT: 'hsl(var(--lavender-secondary))',
  				hover: 'hsl(var(--lavender-secondary-hover))',
  				light: 'hsl(var(--lavender-secondary-light))',
  				foreground: 'hsl(var(--lavender-secondary-foreground))'
  			},
  			'warm-neutral': {
  				DEFAULT: 'hsl(var(--warm-neutral))',
  				hover: 'hsl(var(--warm-neutral-hover))',
  				light: 'hsl(var(--warm-neutral-light))',
  				foreground: 'hsl(var(--warm-neutral-foreground))'
  			},
  			// Legacy colors for backward compatibility
  			cream: '#FFFAF3',
  			neutral: '#F9FAFB',
  			poppy: {
  				DEFAULT: '#FF5757',
  				50: '#FFF5F5',
  				100: '#FED7D7', 
  				200: '#FEB2B2',
  				300: '#FC8181',
  				400: '#F56565',
  				500: '#FF5757',
  				600: '#E53E3E',
  				700: '#C53030',
  				800: '#9B2C2C',
  				900: '#742A2A'
  			},
  			sprout: {
  				DEFAULT: '#3DDC97',
  				50: '#F0FDF4',
  				100: '#DCFCE7',
  				200: '#BBF7D0',
  				300: '#86EFAC',
  				400: '#4ADE80',
  				500: '#3DDC97',
  				600: '#16A34A',
  				700: '#15803D',
  				800: '#166534',
  				900: '#14532D'
  			},
  			lavender: {
  				DEFAULT: '#A78BFA',
  				50: '#F5F3FF',
  				100: '#EDE9FE',
  				200: '#DDD6FE', 
  				300: '#C4B5FD',
  				400: '#A78BFA',
  				500: '#8B5CF6',
  				600: '#7C3AED',
  				700: '#6D28D9',
  				800: '#5B21B6',
  				900: '#4C1D95'
  			},
  			warmGray: {
  				DEFAULT: '#78716C',
  				50: '#FAFAF9',
  				100: '#F5F5F4',
  				200: '#E7E5E4',
  				300: '#D6D3D1',
  				400: '#A8A29E',
  				500: '#78716C',
  				600: '#57534E',
  				700: '#44403C',
  				800: '#292524',
  				900: '#1C1917'
  			}
  		},
  		fontFamily: {
  			sans: ['Inter', 'sans-serif'],
  			mono: ['JetBrains Mono', 'monospace'],
  		},
  		spacing: {
  			'space-1': 'var(--space-1)',
  			'space-2': 'var(--space-2)',
  			'space-3': 'var(--space-3)',
  			'space-4': 'var(--space-4)',
  			'space-6': 'var(--space-6)',
  			'space-8': 'var(--space-8)',
  			'space-12': 'var(--space-12)',
  			'space-16': 'var(--space-16)',
  		},
  		transitionDuration: {
  			'fast': 'var(--duration-fast)',
  			'normal': 'var(--duration-normal)',
  			'slow': 'var(--duration-slow)',
  		},
  		transitionTimingFunction: {
  			'smooth': 'var(--ease-smooth)',
  			'bounce': 'var(--ease-bounce)',
  		},
  		boxShadow: {
  			'sm': 'var(--shadow-sm)',
  			'md': 'var(--shadow-md)',
  			'lg': 'var(--shadow-lg)',
  			'xl': 'var(--shadow-xl)',
  			'poppy': 'var(--shadow-poppy)',
  			'sprout': 'var(--shadow-sprout)',
  			'lavender': 'var(--shadow-lavender)',
  		}
  	}
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} 