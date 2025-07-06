import { test, describe, expect, beforeEach, afterEach } from 'bun:test';
import { findFilesImportingCssModule } from './findFilesImportingCssModule.js';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';

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
    // Принудительно записываем на диск для избежания race condition
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

      expect(result).toEqual([
        {
          file: 'components/ui/buttons/PrimaryButton.tsx',
          importName: 'styles',
        },
        { file: 'components/ui/forms/Input.tsx', importName: 'inputStyles' },
      ]);
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
  });
});
