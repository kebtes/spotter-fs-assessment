/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        risk: {
          low: '#22c55e',       // green-500
          moderate: '#eab308',  // yellow-500
          high: '#f97316',      // orange-500
          severe: '#ef4444',    // red-500
          no_travel: '#7f1d1d', // red-900 / dark maroon
        }
      }
    },
  },
  plugins: [],
}
