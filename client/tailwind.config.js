/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
                mono: ["JetBrains Mono", "monospace"],
            },
            colors: {
                cyber: {
                    50: "#f0fdf8",
                    100: "#ccfbef",
                    200: "#99f6e0",
                    300: "#5eead4",
                    400: "#2dd4bf",
                    500: "#14b8a6",
                    600: "#0d9488",
                    700: "#0f766e",
                    800: "#115e59",
                    900: "#134e4a",
                },
                dark: {
                    900: "#050a0e",
                    800: "#0a1628",
                    700: "#0e1f3d",
                    600: "#142952",
                    500: "#1a3568",
                },
            },
            backgroundImage: {
                "cyber-grid":
                    "linear-gradient(rgba(20,184,166,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(20,184,166,0.05) 1px, transparent 1px)",
                "hero-glow":
                    "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(20,184,166,0.25), transparent)",
            },
            animation: {
                "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                glow: "glow 2s ease-in-out infinite alternate",
                "slide-up": "slideUp 0.4s ease-out",
                "fade-in": "fadeIn 0.5s ease-out",
            },
            keyframes: {
                glow: {
                    "0%": { boxShadow: "0 0 5px #14b8a6, 0 0 10px #14b8a6" },
                    "100%": { boxShadow: "0 0 15px #14b8a6, 0 0 30px #14b8a6, 0 0 60px #14b8a620" },
                },
                slideUp: {
                    "0%": { transform: "translateY(20px)", opacity: "0" },
                    "100%": { transform: "translateY(0)", opacity: "1" },
                },
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
            },
        },
    },
    plugins: [],
};
