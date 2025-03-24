/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./**/*.{js,ts,jsx,tsx,html}",
    ],
    theme: {
        extend: {
            colors: {
                'editor-blue': '#007bff',
                'editor-dark': '#37495d',
                'editor-light-dark': '#1d2839',
                'editor-info': '#00BCD4',
                'editor-btn': '#34495E',
                'editor-btn-hover': '#2f3e50',
            },
            fontFamily: {
                'poppins': ['Poppins', 'sans-serif'],
                'roboto': ['Roboto', 'sans-serif'],
            },
            boxShadow: {
                'editor': '0px 0px 10px 0px rgba(221, 221, 221, 0.73)',
            },
        },
    },
    plugins: [],
}