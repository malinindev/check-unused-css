import { describe, expect, test } from 'bun:test';
import path from 'node:path';
import { getNonExistentClassesFromCss } from './getNonExistentClassesFromCss.js';

describe('getNonExistentClassesFromCss', () => {
  const srcDir = path.join(process.cwd(), 'src/__tests__');

  test('returns null when CSS file is not imported', async () => {
    const result = await getNonExistentClassesFromCss({
      cssFile: 'withError/NotImportedModule/NotImported.module.css',
      srcDir,
    });

    expect(result).toBeNull();
  });

  test('detects non-existent classes when CSS file is imported', async () => {
    const result = await getNonExistentClassesFromCss({
      cssFile: 'withError/NonExistentClasses/NonExistentClasses.module.css',
      srcDir,
    });

    expect(result).not.toBeNull();
    expect(result?.status).toBe('nonExistentClasses');
    expect(result?.file).toBe(
      'withError/NonExistentClasses/NonExistentClasses.module.css'
    );
    expect(result?.nonExistentClasses).toHaveLength(3);

    const classNames =
      result?.nonExistentClasses.map((usage) => usage.className) || [];
    expect(classNames).toContain('nonExistentClass1');
    expect(classNames).toContain('nonExistentClass2');
    expect(classNames).toContain('nonExistentClass3');
    expect(classNames).not.toContain('existingClass');
    expect(classNames).not.toContain('anotherExistingClass');

    // Check location information
    const firstUsage = result?.nonExistentClasses[0];
    expect(firstUsage?.file).toBe(
      'withError/NonExistentClasses/NonExistentClasses.tsx'
    );
    expect(firstUsage?.line).toBeGreaterThan(0);
    expect(firstUsage?.column).toBeGreaterThan(0);
  });

  test('returns null when all classes exist', async () => {
    const result = await getNonExistentClassesFromCss({
      cssFile: 'noError/AllClassesExist/AllClassesExist.module.css',
      srcDir,
    });

    expect(result).toBeNull();
  });

  test('returns null when dynamic usage is detected', async () => {
    const result = await getNonExistentClassesFromCss({
      cssFile: 'noDynamic/WithDynamic/WithDynamic.module.css',
      srcDir,
    });

    expect(result).toBeNull();
  });

  test('works with SCSS files', async () => {
    const result = await getNonExistentClassesFromCss({
      cssFile:
        'withError/NonExistentClassesScss/NonExistentClassesScss.module.scss',
      srcDir,
    });

    expect(result).not.toBeNull();
    expect(result?.status).toBe('nonExistentClasses');
    const classNames =
      result?.nonExistentClasses.map((usage) => usage.className) || [];
    expect(classNames).toContain('invalidClass');
    expect(classNames).toContain('anotherInvalidClass');
    expect(classNames).not.toContain('validClass');
    expect(classNames).not.toContain('anotherValidClass');
  });
});
