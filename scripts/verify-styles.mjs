import { readFileSync } from 'node:fs';
import { fail, pass } from './report.mjs';

function luminance(hex) {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
function contrast(a, b) { const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (light + 0.05) / (dark + 0.05); }
const css = readFileSync('src/styles/global.css', 'utf8');
for (const required of ['--button-accent-ink:#172126', '--coral-text:#B94336', '--green-text:#2F725F', '--muted-text:#656A66', 'color:var(--button-accent-ink)', 'nav a[aria-current="page"] { color:var(--coral-text)', '.eyebrow { color:var(--green-text)', '.meta,.muted { color:var(--muted-text)', 'data-mood="start"', 'data-mood="hope"', 'data-mood="love"', 'data-mood="night"', 'data-mood="memory"']) {
  if (!css.includes(required)) fail({ check: 'verify:styles', problem: `Missing editorial style contract: ${required}`, cause: 'Primary-control contrast or playlist treatment drifted.', path: 'src/styles/global.css', fix: 'Restore approved button foreground and all five stable playlist mood treatments.' });
}
for (const removed of ['data-theme="dark"', '.theme-toggle', '.hero::after']) {
  if (css.includes(removed)) fail({ check: 'verify:styles', problem: `Removed interface treatment returned: ${removed}`, cause: 'The editorial redesign uses one calm reading surface without a theme control or decorative hero placeholder.', path: 'src/styles/global.css', fix: 'Keep the approved single-theme header and text-led hero.' });
}
const themes = {
  light: { ink: '#172126', paper: '#F4EFE6', surface: '#FFFAF2', coral: '#E85D4A', buttonAccentInk: '#172126', coralText: '#B94336', greenText: '#2F725F', sky: '#76B8C4', mutedText: '#656A66' },
};
const contrastPairs = [
  ['body text', 'ink', 'paper'],
  ['surface reading text', 'ink', 'surface'],
  ['primary accent control', 'buttonAccentInk', 'coral'],
  ['default control', 'ink', 'paper'],
  ['default control hover', 'ink', 'buttonHoverBackground'],
  ['skip-link control', 'paper', 'ink'],
  ['active navigation', 'coralText', 'paper'],
  ['link/control hover', 'greenText', 'paper'],
  ['eyebrow text', 'greenText', 'paper'],
  ['eyebrow text on surface', 'greenText', 'surface'],
  ['muted metadata', 'mutedText', 'paper'],
  ['muted metadata on surface', 'mutedText', 'surface'],
  ['footer control', 'mutedText', 'paper'],
];
const results = [];
for (const [mode, tokens] of Object.entries(themes)) {
  tokens.buttonHoverBackground = tokens.sky;
  for (const [label, foreground, background] of contrastPairs) {
    const ratio = contrast(tokens[foreground], tokens[background]);
    if (ratio < 4.5) fail({ check: 'verify:styles', problem: `${label} contrast in ${mode} mode is ${ratio.toFixed(2)}:1.`, cause: 'WCAG AA requires 4.5:1 for normal text and controls.', path: 'src/styles/global.css', fix: 'Use the dedicated text token or a background pair meeting 4.5:1.' });
    results.push(`${mode} ${label} ${ratio.toFixed(2)}:1`);
  }
}
pass('verify:styles', `all small text/control contrast pairs meet WCAG AA (${results.join('; ')}); single-theme editorial treatments and five playlist moods are present`);
