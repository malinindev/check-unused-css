import { describe, expect, test } from 'bun:test';
import path from 'node:path';
import { getUnusedClassesFromCss } from './getUnusedClassesFromCss.js';

describe('getUnusedClassesFromCss', () => {
  const srcDir = path.join(process.cwd(), 'src/__tests__');

  describe('should handle CSS files without classes', () => {
    test('returns notImported when CSS file is not imported', async () => {
      const result = await getUnusedClassesFromCss({
        cssFile: 'withError/NotImportedModule/NotImported.module.css',
        srcDir,
      });

      expect(result?.status).toBe('notImported');
    });
  });

  describe('should handle files with unused classes', () => {
    test('returns correct status with unused classes and location info', async () => {
      const result = await getUnusedClassesFromCss({
        cssFile: 'withError/Plain/Plain.module.css',
        srcDir,
      });

      expect(result?.status).toBe('correct');

      // Type guard to ensure we have the correct result type
      if (result?.status === 'correct') {
        expect(result.unusedClasses).toHaveLength(2);

        const classNames = result.unusedClasses.map((usage) => usage.className);
        expect(classNames).toContain('unusedClass');
        expect(classNames).toContain('unusedClass2');

        // Check that location info is present
        const firstClass = result.unusedClasses[0];
        expect(firstClass?.line).toBeGreaterThan(0);
        expect(firstClass?.column).toBeGreaterThan(0);
      }
    });
  });

  describe('should handle dynamic usage detection', () => {
    test('returns withDynamicImports status when dynamic usage is detected', async () => {
      const result = await getUnusedClassesFromCss({
        cssFile: 'noDynamic/WithDynamic/WithDynamic.module.css',
        srcDir,
      });

      expect(result?.status).toBe('withDynamicImports');
    });
  });

  describe('should handle files with all classes used', () => {
    test('returns null when all classes are used', async () => {
      const result = await getUnusedClassesFromCss({
        cssFile: 'noError/AllClassesExist/AllClassesExist.module.css',
        srcDir,
      });

      expect(result).toBeNull();
    });
  });
});
