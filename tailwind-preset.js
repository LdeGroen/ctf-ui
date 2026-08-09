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
  // De componenten uit dit pakket staan in node_modules en worden dus niet
  // gescand door de './src/**'-regel van de app zelf. Bij een app die volledig
  // op ctf-ui draait (zoals cafes) staat er dan géén enkele klasse meer in src,
  // snoeit Tailwind alles weg en verschijnt de site zonder opmaak. Vandaar dat
  // het preset zijn eigen bestanden meelevert; Tailwind voegt content uit
  // presets samen met die van de app.
  content: ['./node_modules/ctf-ui/dist/**/*.js'],
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
