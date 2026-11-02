import type { Mock } from 'bun:test';
import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { getNonExistentClassesFromCss } from '../../../getNonExistentClassesFromCss.js';
import { getUnusedClassesFromCss } from '../../getUnusedClassesFromCss.js';
import { buildCssImportIndex } from './buildCssImportIndex.js';
import { findFilesImportingCssModule } from './findFilesImportingCssModule.js';

describe('buildCssImportIndex', () => {
  let testDir: string;
  let readSpy: Mock<typeof fs.readFileSync> | null = null;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'buildCssImportIndex-'));
  });

  afterEach(() => {
    readSpy?.mockRestore();
    readSpy = null;
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  const createFile = (filePath: string, content: string): void => {
    const fullPath = path.join(testDir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
  };

  const countReads = (spy: Mock<typeof fs.readFileSync>, file: string) =>
    spy.mock.calls.filter(
      ([readPath]) =>
        typeof readPath === 'string' &&
        path.resolve(readPath) === path.resolve(testDir, file)
    ).length;

  test('lists a file under every module it imports', async () => {
    createFile(
      'Card.tsx',
      `import a from './a.module.css';
import b from './b.module.css';`
    );
    createFile('a.module.css', '.a {}');
    createFile('b.module.css', '.b {}');

    const index = await buildCssImportIndex(testDir);

    expect(
      await findFilesImportingCssModule('a.module.css', testDir, index)
    ).toEqual([{ file: 'Card.tsx', importName: 'a' }]);
    expect(
      await findFilesImportingCssModule('b.module.css', testDir, index)
    ).toEqual([{ file: 'Card.tsx', importName: 'b' }]);
  });

  test('keeps the first import when one file imports a module twice', async () => {
    createFile(
      'app/Card.tsx',
      `import first from './Card.module.css';
import second from '../app/Card.module.css';`
    );
    createFile('app/Card.module.css', '.card {}');

    const index = await buildCssImportIndex(testDir);

    expect(
      await findFilesImportingCssModule('app/Card.module.css', testDir, index)
    ).toEqual([{ file: 'app/Card.tsx', importName: 'first' }]);
  });

  test('reads each source file once while analyzing several modules', async () => {
    const modules = ['A', 'B', 'C'];
    for (const name of modules) {
      createFile(`${name}.module.css`, `.${name.toLowerCase()} {}`);
      createFile(
        `${name}.tsx`,
        `import styles from './${name}.module.css';
export const ${name} = () => styles.${name.toLowerCase()};`
      );
    }
    const unrelatedFiles = ['util.ts', 'deep/helper.js', 'deep/View.jsx'];
    for (const file of unrelatedFiles) {
      createFile(file, 'export const x = 1;');
    }

    readSpy = spyOn(fs, 'readFileSync');

    const cssImportIndex = await buildCssImportIndex(testDir);
    for (const name of modules) {
      const params = {
        cssFile: `${name}.module.css`,
        srcDir: testDir,
        cssImportIndex,
      };
      expect(await getUnusedClassesFromCss(params)).toBeNull();
      expect(await getNonExistentClassesFromCss(params)).toBeNull();
    }

    for (const file of unrelatedFiles) {
      expect({ file, reads: countReads(readSpy, file) }).toEqual({
        file,
        reads: 1,
      });
    }
  });
});
