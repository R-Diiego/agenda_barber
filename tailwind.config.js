/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./public/**/*.{html,js}"],
    theme: {
        extend: {
            colors: {
                primary: '#d4af37', // Gold-ish
                dark: '#1a1a1a',
                darker: '#111111',
            }
        },
    },
    plugins: [],
}
