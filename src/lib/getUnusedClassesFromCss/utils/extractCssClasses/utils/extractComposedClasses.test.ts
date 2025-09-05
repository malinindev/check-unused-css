import { describe, expect, test } from 'bun:test';
import postcss from 'postcss';
import { extractComposedClasses } from './extractComposedClasses.js';

const createPostCSSRoot = (css: string): postcss.Root => postcss.parse(css);

describe('extractComposedClasses', () => {
  describe('should extract class names from composes declarations', () => {
    test('extracts single composed class', () => {
      const css = `
        .button {
          composes: base;
        }
      `;
      const root = createPostCSSRoot(css);
      const result = extractComposedClasses(root);
      expect(result).toEqual(['base']);
    });

    test('extracts multiple composed classes from single declaration', () => {
      const css = `
        .button {
          composes: base primary large;
        }
      `;
      const root = createPostCSSRoot(css);
      const result = extractComposedClasses(root);
      expect(result).toEqual(['base', 'primary', 'large']);
    });

    test('extracts composed classes from multiple declarations', () => {
      const css = `
        .button {
          composes: base;
        }
        .input {
          composes: field;
        }
      `;
      const root = createPostCSSRoot(css);
      const result = extractComposedClasses(root);
      expect(result).toEqual(['base', 'field']);
    });

    test('extracts composed classes from multiple rules', () => {
      const css = `
        .primary {
          composes: button;
        }
        .secondary {
          composes: button outline;
        }
        .large {
          composes: size;
        }
      `;
      const root = createPostCSSRoot(css);
      const result = extractComposedClasses(root);
      expect(result).toEqual(['button', 'outline', 'size']);
    });
  });

  describe('should handle different whitespace patterns', () => {
    test('handles extra spaces between class names', () => {
      const css = `
        .button {
          composes: base    primary     large;
        }
      `;
      const root = createPostCSSRoot(css);
      const result = extractComposedClasses(root);
      expect(result).toEqual(['base', 'primary', 'large']);
    });

    test('handles tabs and newlines in composes value', () => {
      const css = `
        .button {
          composes: base\t\tprimary\n\tlarge;
        }
      `;
      const root = createPostCSSRoot(css);
      const result = extractComposedClasses(root);
      expect(result).toEqual(['base', 'primary', 'large']);
    });

    test('handles leading and trailing spaces', () => {
      const css = `
        .button {
          composes:   base primary large   ;
        }
      `;
      const root = createPostCSSRoot(css);
      const result = extractComposedClasses(root);
      expect(result).toEqual(['base', 'primary', 'large']);
    });

    test('handles mixed whitespace characters', () => {
      const css = `
        .button {
          composes: \t base \n primary \r\n large \t ;
        }
      `;
      const root = createPostCSSRoot(css);
      const result = extractComposedClasses(root);
      expect(result).toEqual(['base', 'primary', 'large']);
    });
  });

  describe('should handle pseudo-selectors and complex selectors', () => {
    test('extracts composed classes from pseudo-selectors', () => {
      const css = `
        .button:hover {
          composes: interactive;
        }
        .button:focus {
          composes: focused;
        }
      `;
      const root = createPostCSSRoot(css);
      const result = extractComposedClasses(root);
      expect(result).toEqual(['interactive', 'focused']);
    });

    test('extracts composed classes from pseudo-elements', () => {
      const css = `
        .button::before {
          composes: icon;
        }
        .button::after {
          composes: decoration;
        }
      `;
      const root = createPostCSSRoot(css);
      const result = extractComposedClasses(root);
      expect(result).toEqual(['icon', 'decoration']);
    });

    test('extracts composed classes from complex selectors', () => {
      const css = `
        .card .header {
          composes: cardHeader;
        }
        .card > .body {
          composes: cardBody;
        }
      `;
      const root = createPostCSSRoot(css);
      const result = extractComposedClasses(root);
      expect(result).toEqual(['cardHeader', 'cardBody']);
    });
  });

  describe('should handle duplicate class names', () => {
    test('removes duplicate composed classes', () => {
      const css = `
        .button {
          composes: base;
        }
        .input {
          composes: base;
        }
      `;
      const root = createPostCSSRoot(css);
      const result = extractComposedClasses(root);
      expect(result).toEqual(['base']);
    });

    test('removes duplicates from same declaration', () => {
      const css = `
        .button {
          composes: base base primary base;
        }
      `;
      const root = createPostCSSRoot(css);
      const result = extractComposedClasses(root);
      expect(result).toEqual(['base', 'primary']);
    });

    test('removes duplicates across multiple declarations', () => {
      const css = `
        .primary {
          composes: button shared;
        }
        .secondary {
          composes: button outline shared;
        }
        .large {
          composes: button size;
        }
      `;
      const root = createPostCSSRoot(css);
      const result = extractComposedClasses(root);
      expect(result).toEqual(['button', 'shared', 'outline', 'size']);
    });
  });

  describe('should handle edge cases', () => {
    test('returns empty array for CSS without composes', () => {
      const css = `
        .button {
          color: blue;
          padding: 10px;
        }
      `;
      const root = createPostCSSRoot(css);
      const result = extractComposedClasses(root);
      expect(result).toEqual([]);
    });

    test('returns empty array for empty CSS', () => {
      const css = '';
      const root = createPostCSSRoot(css);
      const result = extractComposedClasses(root);
      expect(result).toEqual([]);
    });

    test('handles empty composes declaration', () => {
      const css = `
        .button {
          composes: ;
        }
      `;
      const root = createPostCSSRoot(css);
      const result = extractComposedClasses(root);
      expect(result).toEqual([]);
    });

    test('handles whitespace-only composes declaration', () => {
      const css = `
        .button {
          composes:    \t\n   ;
        }
      `;
      const root = createPostCSSRoot(css);
      const result = extractComposedClasses(root);
      expect(result).toEqual([]);
    });

    test('ignores other CSS properties', () => {
      const css = `
        .button {
          color: blue;
          composes: base;
          padding: 10px;
          margin: 5px;
        }
      `;
      const root = createPostCSSRoot(css);
      const result = extractComposedClasses(root);
      expect(result).toEqual(['base']);
    });
  });

  describe('should handle CSS Modules specific patterns', () => {
    test('extracts composed classes from CSS Modules file', () => {
      const css = `
        .baseButton {
          padding: 10px;
          border: none;
        }
        
        .primaryButton {
          composes: baseButton;
          background: blue;
        }
        
        .secondaryButton {
          composes: baseButton;
          background: gray;
        }
      `;
      const root = createPostCSSRoot(css);
      const result = extractComposedClasses(root);
      expect(result).toEqual(['baseButton']);
    });

    test('handles BEM-style composed classes', () => {
      const css = `
        .block__element {
          composes: block__base;
        }
        .block__element--modifier {
          composes: block__element block__modifier;
        }
      `;
      const root = createPostCSSRoot(css);
      const result = extractComposedClasses(root);
      expect(result).toEqual([
        'block__base',
        'block__element',
        'block__modifier',
      ]);
    });

    test('handles utility-style composed classes', () => {
      const css = `
        .btn-primary {
          composes: btn text-white bg-blue;
        }
        .btn-secondary {
          composes: btn text-gray bg-white;
        }
      `;
      const root = createPostCSSRoot(css);
      const result = extractComposedClasses(root);
      expect(result).toEqual([
        'btn',
        'text-white',
        'bg-blue',
        'text-gray',
        'bg-white',
      ]);
    });
  });

  describe('should handle real-world examples', () => {
    test('extracts composed classes from component library', () => {
      const css = `
        .button {
          composes: base interactive;
        }
        .button-primary {
          composes: button;
          composes: primary;
        }
        .button-secondary {
          composes: button secondary;
        }
        .button-large {
          composes: button size-large;
        }
      `;
      const root = createPostCSSRoot(css);
      const result = extractComposedClasses(root);
      expect(result).toEqual([
        'base',
        'interactive',
        'button',
        'primary',
        'secondary',
        'size-large',
      ]);
    });

    test('extracts composed classes from form components', () => {
      const css = `
        .form-control {
          composes: base-input;
        }
        .form-control-error {
          composes: form-control error-state;
        }
        .form-control-success {
          composes: form-control success-state;
        }
      `;
      const root = createPostCSSRoot(css);
      const result = extractComposedClasses(root);
      expect(result).toEqual([
        'base-input',
        'form-control',
        'error-state',
        'success-state',
      ]);
    });

    test('extracts composed classes with special characters', () => {
      const css = `
        .component-1 {
          composes: base-component_v1;
        }
        .component-2 {
          composes: base-component_v2 modifier--active;
        }
      `;
      const root = createPostCSSRoot(css);
      const result = extractComposedClasses(root);
      expect(result).toEqual([
        'base-component_v1',
        'base-component_v2',
        'modifier--active',
      ]);
    });
  });
});
