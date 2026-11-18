import postcssScss from 'postcss-scss';
import { parseIgnoreComments } from '../../../../../utils/parseIgnoreComments.js';

const KEYFRAMES_AT_RULE = /^(-[a-z]+-)?keyframes$/i;
const LOCAL_FUNCTION = /^:local\((.+)\)$/;
// A CSS identifier: `--x`, or an optional `-` then a letter, `_` or any
// non-ASCII character. Rules out `#{...}`, `$var`, quotes and `:global`.
const PLAIN_NAME =
  /^(?:--|-?[a-zA-Z_\u0080-\u{10FFFF}])[\w\u0080-\u{10FFFF}-]*$/u;

/**
 * Names declared with `@keyframes` (and its vendor-prefixed forms). css-loader
 * exports local keyframe names next to class names, so `styles.spin` is a real
 * value (issue #107). `:global(...)` names are not exported and are skipped, as
 * are names built with Sass interpolation or variables. A file disabled with
 * `check-unused-css-disable` is not parsed, like in the class extractors.
 */
export const extractKeyframeNames = (cssContent: string): string[] => {
  const names = new Set<string>();

  if (parseIgnoreComments(cssContent).isFileIgnored) {
    return [];
  }

  postcssScss.parse(cssContent).walkAtRules(KEYFRAMES_AT_RULE, (atRule) => {
    const params = atRule.params.trim();
    const name = LOCAL_FUNCTION.exec(params)?.[1]?.trim() ?? params;

    if (PLAIN_NAME.test(name)) {
      names.add(name);
    }
  });

  return Array.from(names);
};
