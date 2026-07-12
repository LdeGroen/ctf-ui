// Gedeeld Tailwind-preset voor alle CTF-apps: de huisstijlkleuren als tokens,
// zodat #20747F niet overal hardgecodeerd hoeft. Gebruik in tailwind.config.js:
//
//   module.exports = {
//     presets: [require('ctf-ui/tailwind-preset')],
//     content: ['./src/**/*.{js,jsx}', './public/index.html'],
//   };
//
// Bestaande arbitrary values (bg-[#20747F]) blijven gewoon werken; dit preset
// voegt alleen nette klassen toe: bg-ctf-green, text-ctf-blue, enz.
module.exports = {
  theme: {
    extend: {
      colors: {
        'ctf-green': '#20747F',
        'ctf-dark-green': '#1a5c66',
        'ctf-blue': '#78b5e3',
      },
    },
  },
};
