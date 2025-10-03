import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { findFilesImportingCssModule } from './findFilesImportingCssModule.js';

describe('findFilesImportingCssModule', () => {
  let testDir: string;

  beforeEach(() => {
    // Create a unique temporary directory for each test
    testDir = fs.mkdtempSync(
      path.join(tmpdir(), 'findFilesImportingCssModule-')
    );
  });

  afterEach(() => {
    // Clean up the temporary directory
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  const createFile = (filePath: string, content: string): void => {
    const fullPath = path.join(testDir, filePath);
    const dir = path.dirname(fullPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
    // Force write to disk to avoid race conditions
    const fd = fs.openSync(fullPath, 'r+');
    fs.fsyncSync(fd);
    fs.closeSync(fd);
  };

  describe('should find files importing CSS modules', () => {
    test('finds single file importing CSS module', async () => {
      createFile(
        'components/Button.tsx',
        'import styles from "./Button.module.css";'
      );
      createFile('components/Button.module.css', '.button { color: red; }');

      const result = await findFilesImportingCssModule(
        'components/Button.module.css',
        testDir
      );

      expect(result).toEqual([
        { file: 'components/Button.tsx', importName: 'styles' },
      ]);
    });

    test('finds multiple files importing same CSS module', async () => {
      createFile(
        'components/Button.tsx',
        'import styles from "./shared.module.css";'
      );
      createFile(
        'components/Card.tsx',
        'import css from "./shared.module.css";'
      );
      createFile('components/shared.module.css', '.shared { color: blue; }');

      const result = await findFilesImportingCssModule(
        'components/shared.module.css',
        testDir
      );

      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          { file: 'components/Button.tsx', importName: 'styles' },
          { file: 'components/Card.tsx', importName: 'css' },
        ])
      );
    });

    test('finds files with different import names', async () => {
      createFile(
        'components/Header.tsx',
        'import headerStyles from "./Header.module.css";'
      );
      createFile(
        'components/Header.module.css',
        '.header { font-size: 24px; }'
      );

      const result = await findFilesImportingCssModule(
        'components/Header.module.css',
        testDir
      );

      expect(result).toEqual([
        { file: 'components/Header.tsx', importName: 'headerStyles' },
      ]);
    });
  });

  describe('should handle different import patterns', () => {
    test('matches import with ./ prefix', async () => {
      createFile(
        'components/Button.tsx',
        'import styles from "./Button.module.css";'
      );
      createFile('components/Button.module.css', '.button { color: red; }');

      const result = await findFilesImportingCssModule(
        'components/Button.module.css',
        testDir
      );

      expect(result).toEqual([
        { file: 'components/Button.tsx', importName: 'styles' },
      ]);
    });

    test('matches import with ../ prefix', async () => {
      createFile(
        'components/nested/Button.tsx',
        'import styles from "../Button.module.css";'
      );
      createFile('components/Button.module.css', '.button { color: red; }');

      const result = await findFilesImportingCssModule(
        'components/Button.module.css',
        testDir
      );

      expect(result).toEqual([
        { file: 'components/nested/Button.tsx', importName: 'styles' },
      ]);
    });

    test('handles single and double quotes', async () => {
      createFile(
        'components/Button.tsx',
        'import styles from "./Button.module.css";'
      );
      createFile('components/Card.tsx', "import css from './Card.module.css';");
      createFile('components/Button.module.css', '.button { color: red; }');
      createFile('components/Card.module.css', '.card { padding: 10px; }');

      const buttonResult = await findFilesImportingCssModule(
        'components/Button.module.css',
        testDir
      );
      const cardResult = await findFilesImportingCssModule(
        'components/Card.module.css',
        testDir
      );

      expect(buttonResult).toEqual([
        { file: 'components/Button.tsx', importName: 'styles' },
      ]);
      expect(cardResult).toEqual([
        { file: 'components/Card.tsx', importName: 'css' },
      ]);
    });
  });

  describe('should handle whitespace variations', () => {
    test('handles import with extra spaces', async () => {
      createFile(
        'components/Button.tsx',
        'import   styles   from   "./Button.module.css"  ;'
      );
      createFile('components/Button.module.css', '.button { color: red; }');

      const result = await findFilesImportingCssModule(
        'components/Button.module.css',
        testDir
      );

      expect(result).toEqual([
        { file: 'components/Button.tsx', importName: 'styles' },
      ]);
    });

    test('handles import with tabs and newlines', async () => {
      createFile(
        'components/Button.tsx',
        'import\tstyles\nfrom\t"./Button.module.css";'
      );
      createFile('components/Button.module.css', '.button { color: red; }');

      const result = await findFilesImportingCssModule(
        'components/Button.module.css',
        testDir
      );

      expect(result).toEqual([
        { file: 'components/Button.tsx', importName: 'styles' },
      ]);
    });
  });

  describe('should handle edge cases', () => {
    test('returns empty array when no TypeScript files found', async () => {
      createFile('components/Button.module.css', '.button { color: red; }');

      const result = await findFilesImportingCssModule(
        'components/Button.module.css',
        testDir
      );

      expect(result).toEqual([]);
    });

    test('returns empty array when no files import the CSS module', async () => {
      createFile('components/Button.tsx', 'import React from "react";');
      createFile('components/Card.tsx', 'import { useState } from "react";');
      createFile('components/Button.module.css', '.button { color: red; }');

      const result = await findFilesImportingCssModule(
        'components/Button.module.css',
        testDir
      );

      expect(result).toEqual([]);
    });

    test('ignores non-matching import patterns', async () => {
      createFile(
        'components/Button.tsx',
        `
        import React from "react";
        import { Button } from "./Button";
        import * as utils from "./utils";
        import "./global.css";
        const styles = require("./Button.module.css");
      `
      );
      createFile('components/Button.module.css', '.button { color: red; }');

      const result = await findFilesImportingCssModule(
        'components/Button.module.css',
        testDir
      );

      expect(result).toEqual([]);
    });

    test('handles files with multiple imports but only matches CSS module', async () => {
      createFile(
        'components/Button.tsx',
        `
        import React from "react";
        import { useState } from "react";
        import styles from "./Button.module.css";
        import { helper } from "./utils";
      `
      );
      createFile('components/Button.module.css', '.button { color: red; }');

      const result = await findFilesImportingCssModule(
        'components/Button.module.css',
        testDir
      );

      expect(result).toEqual([
        { file: 'components/Button.tsx', importName: 'styles' },
      ]);
    });

    test('handles empty file content', async () => {
      createFile('components/Button.tsx', '');
      createFile('components/Button.module.css', '.button { color: red; }');

      const result = await findFilesImportingCssModule(
        'components/Button.module.css',
        testDir
      );

      expect(result).toEqual([]);
    });

    test('handles file with only whitespace', async () => {
      createFile('components/Button.tsx', '   \n\t  \n   ');
      createFile('components/Button.module.css', '.button { color: red; }');

      const result = await findFilesImportingCssModule(
        'components/Button.module.css',
        testDir
      );

      expect(result).toEqual([]);
    });
  });

  describe('should handle file extensions', () => {
    test('finds imports in .ts files', async () => {
      createFile(
        'utils/styles.ts',
        'import styles from "./Button.module.css";'
      );
      createFile('utils/Button.module.css', '.button { color: red; }');

      const result = await findFilesImportingCssModule(
        'utils/Button.module.css',
        testDir
      );

      expect(result).toEqual([
        { file: 'utils/styles.ts', importName: 'styles' },
      ]);
    });

    test('finds imports in .tsx files', async () => {
      createFile(
        'components/Button.tsx',
        'import styles from "./Button.module.css";'
      );
      createFile('components/Button.module.css', '.button { color: red; }');

      const result = await findFilesImportingCssModule(
        'components/Button.module.css',
        testDir
      );

      expect(result).toEqual([
        { file: 'components/Button.tsx', importName: 'styles' },
      ]);
    });

    test('searches for both .ts and .tsx files', async () => {
      createFile(
        'components/Button.tsx',
        'import styles from "./Button.module.css";'
      );
      createFile('utils/helper.ts', 'import css from "./Button.module.css";');
      createFile('components/Button.module.css', '.button { color: red; }');
      createFile('utils/Button.module.css', '.button { color: red; }');

      const result = await findFilesImportingCssModule(
        'components/Button.module.css',
        testDir
      );

      expect(result).toEqual([
        { file: 'components/Button.tsx', importName: 'styles' },
      ]);
    });
  });

  describe('should handle complex real-world scenarios', () => {
    test('handles mixed content with comments and code', async () => {
      createFile(
        'components/Button.tsx',
        `
        // This is a React component
        import React from "react";
        /* 
         * Import styles for the button
         */
        import styles from "./Button.module.css";
        
        // Some other imports
        import { helper } from "./utils";
      `
      );
      createFile('components/Button.module.css', '.button { color: red; }');

      const result = await findFilesImportingCssModule(
        'components/Button.module.css',
        testDir
      );

      expect(result).toEqual([
        { file: 'components/Button.tsx', importName: 'styles' },
      ]);
    });

    test('stops at first matching import pattern', async () => {
      createFile(
        'components/Button.tsx',
        `
        import styles from "./Button.module.css";
        import otherStyles from "./Button.module.css";
      `
      );
      createFile('components/Button.module.css', '.button { color: red; }');

      const result = await findFilesImportingCssModule(
        'components/Button.module.css',
        testDir
      );

      // Should only return the first match
      expect(result).toEqual([
        { file: 'components/Button.tsx', importName: 'styles' },
      ]);
    });

    test('handles nested directory structures', async () => {
      createFile(
        'components/ui/buttons/PrimaryButton.tsx',
        'import styles from "./PrimaryButton.module.css";'
      );
      createFile(
        'components/ui/forms/Input.tsx',
        'import inputStyles from "../buttons/PrimaryButton.module.css";'
      );
      createFile(
        'components/ui/buttons/PrimaryButton.module.css',
        '.primary-button { color: blue; }'
      );

      const result = await findFilesImportingCssModule(
        'components/ui/buttons/PrimaryButton.module.css',
        testDir
      );

      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          {
            file: 'components/ui/buttons/PrimaryButton.tsx',
            importName: 'styles',
          },
          { file: 'components/ui/forms/Input.tsx', importName: 'inputStyles' },
        ])
      );
    });

    test('handles case where CSS file does not exist', async () => {
      createFile(
        'components/Button.tsx',
        'import styles from "./Button.module.css";'
      );

      const result = await findFilesImportingCssModule(
        'components/Button.module.css',
        testDir
      );

      expect(result).toEqual([
        { file: 'components/Button.tsx', importName: 'styles' },
      ]);
    });

    test('handles CSS files with special characters in filename', async () => {
      createFile(
        'components/(Documentation)SpecialChars.tsx',
        'import styles from "./(Documentation)SpecialChars.module.css";'
      );
      createFile(
        'components/[Brackets]And.Dots.tsx',
        'import css from "./[Brackets]And.Dots.module.css";'
      );
      createFile(
        'components/(Documentation)SpecialChars.module.css',
        '.class1 { color: #fff; }'
      );
      createFile(
        'components/[Brackets]And.Dots.module.css',
        '.class1 { color: #fff; }'
      );

      const docResult = await findFilesImportingCssModule(
        'components/(Documentation)SpecialChars.module.css',
        testDir
      );
      const bracketsResult = await findFilesImportingCssModule(
        'components/[Brackets]And.Dots.module.css',
        testDir
      );

      expect(docResult).toEqual([
        {
          file: 'components/(Documentation)SpecialChars.tsx',
          importName: 'styles',
        },
      ]);
      expect(bracketsResult).toEqual([
        { file: 'components/[Brackets]And.Dots.tsx', importName: 'css' },
      ]);
    });
  });

  describe('should handle path resolution edge cases', () => {
    test('correctly resolves relative imports when multiple CSS files have same name', async () => {
      // This test reproduces the bug we fixed where the tool incorrectly matched
      // '../styles.module.css' import with wrong CSS file due to similar names

      // Create directory structure:
      // components/
      //   styles.module.css (correct file)
      //   SubscriptionSection/
      //     SubscriptionSection.tsx (imports '../styles.module.css')
      //     styles.module.css (wrong file with same name)

      createFile('components/styles.module.css', '.header { color: red; }');
      createFile(
        'components/SubscriptionSection/styles.module.css',
        '.container { padding: 10px; }'
      );
      createFile(
        'components/SubscriptionSection/SubscriptionSection.tsx',
        'import styles from "../styles.module.css";'
      );

      // Test 1: When analyzing the CORRECT CSS file, it should find the importing file
      const correctResult = await findFilesImportingCssModule(
        'components/styles.module.css',
        testDir
      );

      expect(correctResult).toEqual([
        {
          file: 'components/SubscriptionSection/SubscriptionSection.tsx',
          importName: 'styles',
        },
      ]);

      // Test 2: When analyzing the WRONG CSS file with same name, it should NOT find the importing file
      const wrongResult = await findFilesImportingCssModule(
        'components/SubscriptionSection/styles.module.css',
        testDir
      );

      expect(wrongResult).toEqual([]);
    });

    test('correctly handles complex nested relative imports', async () => {
      // Create a more complex structure to test path resolution
      createFile('shared/styles.module.css', '.shared { color: blue; }');
      createFile(
        'components/deep/nested/Component.tsx',
        'import styles from "../../../shared/styles.module.css";'
      );
      createFile('components/deep/styles.module.css', '.deep { margin: 5px; }');

      // Should find the correct file despite multiple levels of nesting
      const result = await findFilesImportingCssModule(
        'shared/styles.module.css',
        testDir
      );

      expect(result).toEqual([
        { file: 'components/deep/nested/Component.tsx', importName: 'styles' },
      ]);

      // Should not match the wrong file
      const wrongResult = await findFilesImportingCssModule(
        'components/deep/styles.module.css',
        testDir
      );

      expect(wrongResult).toEqual([]);
    });

    test('handles absolute imports from srcDir correctly', async () => {
      createFile('utils/styles.module.css', '.utils { font-size: 12px; }');
      createFile(
        'components/Button.tsx',
        'import styles from "utils/styles.module.css";'
      );

      const result = await findFilesImportingCssModule(
        'utils/styles.module.css',
        testDir
      );

      expect(result).toEqual([
        { file: 'components/Button.tsx', importName: 'styles' },
      ]);
    });

    test('handles mixed relative and absolute imports correctly', async () => {
      createFile('theme/base.module.css', '.base { margin: 0; }');
      createFile(
        'components/Header.tsx',
        'import styles from "../theme/base.module.css";'
      );
      createFile(
        'pages/Home.tsx',
        'import styles from "theme/base.module.css";'
      );

      const result = await findFilesImportingCssModule(
        'theme/base.module.css',
        testDir
      );

      expect(result).toEqual(
        expect.arrayContaining([
          { file: 'components/Header.tsx', importName: 'styles' },
          { file: 'pages/Home.tsx', importName: 'styles' },
        ])
      );
      expect(result).toHaveLength(2);
    });

    test('correctly resolves paths with different separators and normalization', async () => {
      createFile('assets/global.module.css', '.global { padding: 0; }');
      createFile(
        'src/App.tsx',
        'import styles from "../assets/global.module.css";'
      );

      const result = await findFilesImportingCssModule(
        'assets/global.module.css',
        testDir
      );

      expect(result).toEqual([{ file: 'src/App.tsx', importName: 'styles' }]);
    });
  });
});
