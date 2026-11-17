import { describe, expect, test } from 'bun:test';
import { extractKeyframeNames } from './extractKeyframeNames.js';

describe('extractKeyframeNames', () => {
  test('collects plain and vendor-prefixed keyframe names', () => {
    const css = `
      @keyframes fadeIn { from { opacity: 0; } }
      @-webkit-keyframes spin { to { transform: rotate(1turn); } }
      @-moz-keyframes slide-out { to { left: 0; } }
    `;
    expect(extractKeyframeNames(css).sort()).toEqual([
      'fadeIn',
      'slide-out',
      'spin',
    ]);
  });

  test('unwraps :local(name)', () => {
    expect(extractKeyframeNames('@keyframes :local(pulse) {}')).toEqual([
      'pulse',
    ]);
  });

  test('skips :global names, which css-loader does not export', () => {
    expect(extractKeyframeNames('@keyframes :global(fade) {}')).toEqual([]);
    expect(extractKeyframeNames('@keyframes :global fade {}')).toEqual([]);
  });

  test('skips names built with Sass interpolation or variables', () => {
    const scss = `
      @keyframes #{$prefix}-in {}
      @keyframes $name {}
    `;
    expect(extractKeyframeNames(scss)).toEqual([]);
  });

  test('finds keyframes nested in other at-rules', () => {
    const css = '@media (min-width: 1px) { @keyframes grow {} }';
    expect(extractKeyframeNames(css)).toEqual(['grow']);
  });

  test('does not return class names', () => {
    expect(extractKeyframeNames('.box { animation: x 1s; }')).toEqual([]);
  });
});
