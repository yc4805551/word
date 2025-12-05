/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Noto Sans SC"', 'sans-serif'],
                serif: ['"Noto Serif SC"', 'serif'],
            },
            colors: {
                official: {
                    blue: '#1e3a8a', // blue-900
                    red: '#b91c1c', // red-700
                    green: '#15803d', // green-700
                }
            }
        },
    },
    plugins: [],
}
