import { describe, expect, test } from 'bun:test';
import type { AstSelector, Parser } from 'css-selector-parser';
import { createParser } from 'css-selector-parser';
import { findClassNamesInSelector } from './findClassNamesInSelector.js';

const parseSelector: Parser = createParser();

const createAstSelector = (selector: string): AstSelector =>
  parseSelector(selector);

describe('findClassNamesInSelector', () => {
  describe('should extract class names from simple selectors', () => {
    test('extracts single class name', () => {
      const selector = createAstSelector('.container');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['container']);
    });

    test('extracts multiple class names from compound selector', () => {
      const selector = createAstSelector('.container.active');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['container', 'active']);
    });

    test('extracts class names from descendant selectors', () => {
      const selector = createAstSelector('.parent .child');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['parent', 'child']);
    });

    test('extracts class names from child selectors', () => {
      const selector = createAstSelector('.parent > .child');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['parent', 'child']);
    });

    test('extracts class names from sibling selectors', () => {
      const selector = createAstSelector('.first + .second');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['first', 'second']);
    });

    test('extracts class names from general sibling selectors', () => {
      const selector = createAstSelector('.first ~ .second');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['first', 'second']);
    });
  });

  describe('should handle complex selectors', () => {
    test('extracts class names from pseudo-class selectors', () => {
      const selector = createAstSelector('.button:hover');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['button']);
    });

    test('extracts class names from pseudo-element selectors', () => {
      const selector = createAstSelector('.text::before');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['text']);
    });

    test('extracts class names from attribute selectors', () => {
      const selector = createAstSelector('.input[type="text"]');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['input']);
    });

    test('extracts class names from complex nested selectors', () => {
      const selector = createAstSelector('.header .nav .item:hover > .link');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['header', 'nav', 'item', 'link']);
    });

    test('extracts class names from selectors with multiple pseudo-classes', () => {
      const selector = createAstSelector('.button:hover:focus:active');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['button']);
    });

    test('extracts class names from selectors with functional pseudo-classes', () => {
      const selector = createAstSelector('.item:nth-child(2n+1)');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['item']);
    });
  });

  describe('should handle mixed selectors', () => {
    test('ignores element selectors but extracts class names', () => {
      const selector = createAstSelector('div.container');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['container']);
    });

    test('ignores ID selectors but extracts class names', () => {
      const selector = createAstSelector('#header .container');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['container']);
    });

    test('extracts class names from complex mixed selectors', () => {
      const selector = createAstSelector('div#main .header h1.title');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['header', 'title']);
    });

    test('handles universal selector with class names', () => {
      const selector = createAstSelector('* .container');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['container']);
    });

    test('extracts class names from attribute and class combination', () => {
      const selector = createAstSelector('.form input[type="text"].required');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['form', 'required']);
    });
  });

  describe('should handle nested rules', () => {
    test('extracts class names from nested selectors', () => {
      const selector = createAstSelector('.card .header .title');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['card', 'header', 'title']);
    });

    test('extracts class names from deeply nested selectors', () => {
      const selector = createAstSelector('.a .b .c .d .e');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['a', 'b', 'c', 'd', 'e']);
    });

    test('extracts class names from nested selectors with combinators', () => {
      const selector = createAstSelector(
        '.parent > .child + .sibling ~ .other'
      );
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['parent', 'child', 'sibling', 'other']);
    });
  });

  describe('should handle special class name patterns', () => {
    test('extracts class names with hyphens', () => {
      const selector = createAstSelector('.my-component');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['my-component']);
    });

    test('extracts class names with underscores', () => {
      const selector = createAstSelector('.my_component');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['my_component']);
    });

    test('extracts class names with numbers', () => {
      const selector = createAstSelector('.component-123');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['component-123']);
    });

    test('extracts BEM-style class names', () => {
      const selector = createAstSelector('.block__element--modifier');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['block__element--modifier']);
    });

    test('extracts utility-style class names', () => {
      const selector = createAstSelector('.text-center.font-bold.text-lg');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['text-center', 'font-bold', 'text-lg']);
    });
  });

  describe('should handle edge cases', () => {
    test('returns empty array for selectors without class names', () => {
      const selector = createAstSelector('div');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual([]);
    });

    test('returns empty array for element selectors only', () => {
      const selector = createAstSelector('h1 p span');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual([]);
    });

    test('returns empty array for ID selectors only', () => {
      const selector = createAstSelector('#header');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual([]);
    });

    test('returns empty array for attribute selectors only', () => {
      const selector = createAstSelector('[type="text"]');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual([]);
    });

    test('returns empty array for pseudo-selectors only', () => {
      const selector = createAstSelector(':hover');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual([]);
    });

    test('handles empty selector rules', () => {
      const emptySelector: AstSelector = { type: 'Selector', rules: [] };
      const result = findClassNamesInSelector(emptySelector);
      expect(result).toEqual([]);
    });
  });

  describe('should handle real-world CSS patterns', () => {
    test('extracts class names from CSS framework selectors', () => {
      const selector = createAstSelector('.btn.btn-primary.btn-lg');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['btn', 'btn-primary', 'btn-lg']);
    });

    test('extracts class names from component library selectors', () => {
      const selector = createAstSelector('.card .card-header .card-title');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['card', 'card-header', 'card-title']);
    });

    test('extracts class names from layout selectors', () => {
      const selector = createAstSelector('.container .row .col-md-6');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['container', 'row', 'col-md-6']);
    });

    test('extracts class names from state selectors', () => {
      const selector = createAstSelector('.dropdown.open .dropdown-menu');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['dropdown', 'open', 'dropdown-menu']);
    });

    test('extracts class names from responsive selectors', () => {
      const selector = createAstSelector('.hidden-xs.visible-md');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['hidden-xs', 'visible-md']);
    });

    test('extracts class names from CSS-in-JS generated selectors', () => {
      const selector = createAstSelector('.css-1234567.css-abcdefg');
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['css-1234567', 'css-abcdefg']);
    });
  });

  describe('should handle complex nested structures', () => {
    test('extracts class names from deeply nested component selectors', () => {
      const selector = createAstSelector(
        '.app .sidebar .nav .nav-item .nav-link.active'
      );
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual([
        'app',
        'sidebar',
        'nav',
        'nav-item',
        'nav-link',
        'active',
      ]);
    });

    test('extracts class names from form validation selectors', () => {
      const selector = createAstSelector(
        '.form-group .form-control.is-invalid + .invalid-feedback'
      );
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual([
        'form-group',
        'form-control',
        'is-invalid',
        'invalid-feedback',
      ]);
    });

    test('extracts class names from table selectors', () => {
      const selector = createAstSelector(
        '.table .table-striped tbody tr:nth-child(odd) td.highlight'
      );
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual(['table', 'table-striped', 'highlight']);
    });

    test('extracts class names from modal selectors', () => {
      const selector = createAstSelector(
        '.modal.fade.show .modal-dialog .modal-content .modal-body'
      );
      const result = findClassNamesInSelector(selector);
      expect(result).toEqual([
        'modal',
        'fade',
        'show',
        'modal-dialog',
        'modal-content',
        'modal-body',
      ]);
    });
  });
});
