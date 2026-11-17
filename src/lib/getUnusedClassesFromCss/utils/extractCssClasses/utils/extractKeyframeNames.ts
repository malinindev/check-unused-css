import postcssScss from 'postcss-scss';

const KEYFRAMES_AT_RULE = /^(-[a-z]+-)?keyframes$/i;
const LOCAL_FUNCTION = /^:local\((.+)\)$/;
const PLAIN_NAME = /^-?[_a-zA-Z][\w-]*$/;

/**
 * Names declared with `@keyframes` (and its vendor-prefixed forms). css-loader
 * exports local keyframe names next to class names, so `styles.spin` is a real
 * value (issue #107). `:global(...)` names are not exported and are skipped, as
 * are names built with Sass interpolation or variables.
 */
export const extractKeyframeNames = (cssContent: string): string[] => {
  const names = new Set<string>();

  postcssScss.parse(cssContent).walkAtRules(KEYFRAMES_AT_RULE, (atRule) => {
    const params = atRule.params.trim();
    const name = LOCAL_FUNCTION.exec(params)?.[1]?.trim() ?? params;

    if (PLAIN_NAME.test(name)) {
      names.add(name);
    }
  });

  return Array.from(names);
};
