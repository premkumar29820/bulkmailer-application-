/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f4f7f8",
        ink: "#16233d",
        line: "#d9e3e5",
        stamp: "#277485",
        sage: "#4d8b76",
        coral: "#c45f50",
      },
      boxShadow: {
        soft: "0 18px 50px rgba(22, 35, 61, 0.09)",
      },
    },
  },
  plugins: [],
}

