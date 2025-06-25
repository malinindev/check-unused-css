import postcss, { type Rule, type Node } from 'postcss';
import { extractComposedClasses } from './utils/extractComposedClasses.js';
import { extractClassNamesFromRule } from './utils/extractClassNamesFromRule.js';

const processNode = (node: Node, classNames: Set<string>): void => {
  if (node.type === 'rule') {
    const ruleClassNames = extractClassNamesFromRule(node as Rule);

    for (const className of ruleClassNames) {
      classNames.add(className);
    }
  }

  if ('nodes' in node && Array.isArray(node.nodes)) {
    for (const childNode of node.nodes) {
      processNode(childNode, classNames);
    }
  }
};

export const extractCssClasses = (cssContent: string): string[] => {
  const classNames = new Set<string>();

  const root = postcss.parse(cssContent);

  for (const node of root.nodes) {
    processNode(node, classNames);
  }

  const composedClasses = extractComposedClasses(root);
  for (const composedClassName of composedClasses) {
    classNames.delete(composedClassName);
  }

  return Array.from(classNames);
};
