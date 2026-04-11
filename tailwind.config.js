/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Keeping your custom colors as semantic names if needed, or rely on Slate/Blue
                'primary-blue': '#2563eb',
                'secondary-blue': '#3b82f6',
                'accent-cyan': '#06b6d4',
            },
            fontFamily: {
                sans: ['Outfit', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
