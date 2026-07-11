import { readFileSync } from 'node:fs';
import { fail, pass } from './report.mjs';

function luminance(hex) {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
function contrast(a, b) { const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (light + 0.05) / (dark + 0.05); }
const css = readFileSync('src/styles/global.css', 'utf8');
for (const required of ['--button-accent-ink:#172126', 'color:var(--button-accent-ink)', 'data-mood="start"', 'data-mood="hope"', 'data-mood="love"', 'data-mood="night"', 'data-mood="memory"']) {
  if (!css.includes(required)) fail({ check: 'verify:styles', problem: `Missing editorial style contract: ${required}`, cause: 'Primary-control contrast or playlist treatment drifted.', path: 'src/styles/global.css', fix: 'Restore approved button foreground and all five stable playlist mood treatments.' });
}
for (const [mode, background] of [['light', '#E85D4A'], ['dark', '#F48A79']]) {
  const ratio = contrast(background, '#172126');
  if (ratio < 4.5) fail({ check: 'verify:styles', problem: `Primary button contrast in ${mode} mode is ${ratio.toFixed(2)}:1.`, cause: 'WCAG AA requires 4.5:1 for normal text.', path: 'src/styles/global.css', fix: 'Use an approved foreground/background pair meeting 4.5:1 in both modes.' });
}
pass('verify:styles', 'primary button contrast meets WCAG AA in light/dark modes; five stable playlist treatments present');
