/** @type {import('tailwindcss').Config} */
tailwind.config = {
  theme: {
    extend: {
      keyframes: {
        "modal-in": {
          "0%":   { opacity: "0", transform: "translateY(14px) scale(0.97)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "modal-in": "modal-in 0.2s ease",
      },
    },
  },
};
