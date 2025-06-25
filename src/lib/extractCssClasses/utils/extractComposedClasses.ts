import type postcss from 'postcss';

export const extractComposedClasses = (root: postcss.Root): string[] => {
  const composedClasses = new Set<string>();

  root.walkDecls('composes', (decl) => {
    const classNames = decl.value
      .split(/\s+/)
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    for (const className of classNames) {
      composedClasses.add(className);
    }
  });

  return Array.from(composedClasses);
};
