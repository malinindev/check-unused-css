import { describe, test, expect } from 'bun:test';
import { contentToAst } from './contentToAst.js';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';

describe('contentToAst', () => {
  describe('should parse valid TypeScript/JSX content', () => {
    test('parses simple TypeScript code', () => {
      const content = 'const x = 42;';
      const ast = contentToAst(content);

      expect(ast.type).toBe(AST_NODE_TYPES.Program);
      expect(ast.body).toHaveLength(1);
      expect(ast.body[0]?.type).toBe(AST_NODE_TYPES.VariableDeclaration);
    });

    test('parses JSX component', () => {
      const content = `
        import styles from './test.css';
        export const Component = () => <div className={styles.test}>Hello</div>;
      `;
      const ast = contentToAst(content);

      expect(ast.type).toBe(AST_NODE_TYPES.Program);
      expect(ast.body).toHaveLength(2);
      expect(ast.body[0]?.type).toBe(AST_NODE_TYPES.ImportDeclaration);
      expect(ast.body[1]?.type).toBe(AST_NODE_TYPES.ExportNamedDeclaration);
    });

    test('parses member expressions', () => {
      const content = 'styles.className';
      const ast = contentToAst(content);

      expect(ast.type).toBe(AST_NODE_TYPES.Program);
      expect(ast.body).toHaveLength(1);
      expect(ast.body[0]?.type).toBe(AST_NODE_TYPES.ExpressionStatement);
    });

    test('parses bracket notation', () => {
      const content = "styles['className']";
      const ast = contentToAst(content);

      expect(ast.type).toBe(AST_NODE_TYPES.Program);
      expect(ast.body).toHaveLength(1);
      expect(ast.body[0]?.type).toBe(AST_NODE_TYPES.ExpressionStatement);
    });

    test('parses complex JSX with text content', () => {
      const content = `
        <div className={styles.usedClass1}>
          The ' character is making
          <span className={styles.usedClass2}>the test fail</span>
        </div>
      `;
      const ast = contentToAst(content);

      expect(ast.type).toBe(AST_NODE_TYPES.Program);
      expect(ast.body).toHaveLength(1);
    });

    test('parses content with unclosed quotes in strings', () => {
      const content = `
        const text = 'test error with apostrophe - "';
        <div className={styles.usedClass} />
      `;
      const ast = contentToAst(content);

      expect(ast.type).toBe(AST_NODE_TYPES.Program);
      expect(ast.body).toHaveLength(2);
    });

    test('parses TypeScript with types', () => {
      const content = `
        interface Props {
          className?: string;
        }
        const Component: React.FC<Props> = ({ className }) => (
          <div className={styles.test} />
        );
      `;
      const ast = contentToAst(content);

      expect(ast.type).toBe(AST_NODE_TYPES.Program);
      expect(ast.body).toHaveLength(2);
    });

    test('parses modern JavaScript features', () => {
      const content = `
        const Component = () => {
          const [state, setState] = useState(false);
          return <div className={state ? styles.active : styles.inactive} />;
        };
      `;
      const ast = contentToAst(content);

      expect(ast.type).toBe(AST_NODE_TYPES.Program);
      expect(ast.body).toHaveLength(1);
    });
  });

  describe('should handle edge cases', () => {
    test('parses empty content', () => {
      const content = '';
      const ast = contentToAst(content);

      expect(ast.type).toBe(AST_NODE_TYPES.Program);
      expect(ast.body).toHaveLength(0);
    });

    test('parses whitespace-only content', () => {
      const content = '   \n  \t  ';
      const ast = contentToAst(content);

      expect(ast.type).toBe(AST_NODE_TYPES.Program);
      expect(ast.body).toHaveLength(0);
    });

    test('parses comments only', () => {
      const content = `
        // This is a comment
        /* Multi-line comment */
      `;
      const ast = contentToAst(content);

      expect(ast.type).toBe(AST_NODE_TYPES.Program);
      expect(ast.body).toHaveLength(0);
    });
  });

  describe('should throw errors for invalid syntax', () => {
    test('throws error for unclosed template literal', () => {
      const content = 'const broken = `unclosed template';

      expect(() => contentToAst(content)).toThrow(
        'Failed to parse TypeScript/JSX content'
      );
      expect(() => contentToAst(content)).toThrow(
        'Unterminated template literal'
      );
    });

    test('throws error for unclosed string', () => {
      const content = 'const broken = "unclosed string';

      expect(() => contentToAst(content)).toThrow(
        'Failed to parse TypeScript/JSX content'
      );
    });

    test('throws error for malformed JSX', () => {
      const content = '<div><span></div>';

      expect(() => contentToAst(content)).toThrow(
        'Failed to parse TypeScript/JSX content'
      );
    });

    test('throws error for invalid syntax', () => {
      const content = 'const x = {[}';

      expect(() => contentToAst(content)).toThrow(
        'Failed to parse TypeScript/JSX content'
      );
    });

    test('provides meaningful error message', () => {
      const content = 'const broken = `unclosed';

      try {
        contentToAst(content);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toMatch(
          /Failed to parse TypeScript\/JSX content:/
        );
        expect((error as Error).message).toMatch(
          /Unterminated template literal/
        );
      }
    });
  });

  describe('should handle real-world examples', () => {
    test('parses React component with hooks', () => {
      const content = `
        import React, { useState, useEffect } from 'react';
        import styles from './Component.module.css';

        export const Component: React.FC = () => {
          const [isActive, setIsActive] = useState(false);
          
          useEffect(() => {
            setIsActive(true);
          }, []);

          return (
            <div className={styles.container}>
              <button 
                className={isActive ? styles.activeButton : styles.button}
                onClick={() => setIsActive(!isActive)}
              >
                Toggle
              </button>
            </div>
          );
        };
      `;
      const ast = contentToAst(content);

      expect(ast.type).toBe(AST_NODE_TYPES.Program);
      expect(ast.body.length).toBeGreaterThan(0);
    });

    test('parses component with conditional rendering', () => {
      const content = `
        const Component = ({ show, className }) => (
          show ? (
            <div className={cx(styles.wrapper, className)}>
              <span className={styles.text}>Visible</span>
            </div>
          ) : null
        );
      `;
      const ast = contentToAst(content);

      expect(ast.type).toBe(AST_NODE_TYPES.Program);
      expect(ast.body).toHaveLength(1);
    });
  });
});
