import type { Rule } from 'postcss';

const CLASS_NAME_PATTERN = /\.([a-zA-Z_][\w-]*)/;

const getParentRule = (rule: Rule): Rule | null => {
  const { parent } = rule;
  if (parent && parent.type === 'rule') {
    return parent as Rule;
  }
  return null;
};

export const getParentClassName = (rule: Rule): string | null => {
  const parentRule = getParentRule(rule);
  if (!parentRule) {
    return null;
  }

  const grandParentClassName = getParentClassName(parentRule);

  if (grandParentClassName && parentRule.selector.includes('&')) {
    const resolved = resolveAmpersandSelector(
      parentRule.selector,
      grandParentClassName
    );
    const match = resolved.match(CLASS_NAME_PATTERN);
    return match?.[1] ?? null;
  }

  const match = parentRule.selector.match(CLASS_NAME_PATTERN);
  return match?.[1] ?? null;
};

export const resolveAmpersandSelector = (
  selector: string,
  parentClassName: string | null
): string => {
  if (!parentClassName) {
    return selector;
  }

  return selector.replace(/&(?=[A-Za-z0-9_-])/g, `.${parentClassName}`);
};
