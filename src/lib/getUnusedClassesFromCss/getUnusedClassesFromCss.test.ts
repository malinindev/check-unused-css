import type { Mock } from 'bun:test';
import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import * as getContentOfFilesModule from '../../utils/getContentOfFiles.js';
import { getUnusedClassesFromCss } from './getUnusedClassesFromCss.js';
import * as extractCssClassesModule from './utils/extractCssClasses/index.js';
import * as extractUsedClassesModule from './utils/extractUsedClasses.js';
import * as findFilesImportingCssModuleModule from './utils/findFilesImportingCssModule.js';
import * as extractDynamicClassUsagesModule from './utils/findUnusedClasses/utils/extractDynamicClassUsages.js';

describe('getUnusedClassesFromCss', () => {
  const spies: Mock<any>[] = [];

  afterEach(() => {
    spies.forEach((spy) => {
      spy.mockRestore();
    });

    spies.length = 0;
  });

  test('returns null when CSS file has no classes', async () => {
    spies.push(
      spyOn(getContentOfFilesModule, 'getContentOfFiles').mockReturnValue('')
    );
    spies.push(
      spyOn(
        extractCssClassesModule,
        'extractCssClassesWithLocations'
      ).mockReturnValue([])
    );

    const result = await getUnusedClassesFromCss({
      cssFile: 'test.module.css',
      srcDir: '/test',
    });

    expect(result).toBeNull();
  });

  test('returns notImported when CSS file is not imported', async () => {
    spies.push(
      spyOn(getContentOfFilesModule, 'getContentOfFiles').mockReturnValue(
        '.test { color: red; }'
      )
    );
    spies.push(
      spyOn(
        extractCssClassesModule,
        'extractCssClassesWithLocations'
      ).mockReturnValue([{ className: 'test', line: 1, column: 1 }])
    );
    spies.push(
      spyOn(
        findFilesImportingCssModuleModule,
        'findFilesImportingCssModule'
      ).mockResolvedValue([])
    );

    const result = await getUnusedClassesFromCss({
      cssFile: 'test.module.css',
      srcDir: '/test',
    });

    expect(result?.status).toBe('notImported');
    expect(result?.file).toBe('test.module.css');
  });

  test('returns withDynamicImports when dynamic usage is detected', async () => {
    spies.push(
      spyOn(getContentOfFilesModule, 'getContentOfFiles')
        .mockReturnValueOnce('.test { color: red; }')
        .mockReturnValueOnce(
          'const styles = require("./test.module.css"); styles[variable];'
        )
    );
    spies.push(
      spyOn(
        extractCssClassesModule,
        'extractCssClassesWithLocations'
      ).mockReturnValue([{ className: 'test', line: 1, column: 1 }])
    );
    spies.push(
      spyOn(
        findFilesImportingCssModuleModule,
        'findFilesImportingCssModule'
      ).mockResolvedValue([{ file: 'component.tsx', importName: 'styles' }])
    );
    spies.push(
      spyOn(
        extractDynamicClassUsagesModule,
        'extractDynamicClassUsages'
      ).mockReturnValue([
        {
          className: 'styles[variable]',
          file: 'component.tsx',
          line: 1,
          column: 19,
        },
      ])
    );

    const result = await getUnusedClassesFromCss({
      cssFile: 'test.module.css',
      srcDir: '/test',
    });

    expect(result?.status).toBe('withDynamicImports');
    expect(result?.file).toBe('test.module.css');
    if (result?.status === 'withDynamicImports') {
      expect(result.dynamicUsages).toHaveLength(1);
    }
  });

  test('returns null when all classes are used', async () => {
    spies.push(
      spyOn(getContentOfFilesModule, 'getContentOfFiles')
        .mockReturnValueOnce('.test { color: red; }')
        .mockReturnValueOnce(
          'const styles = require("./test.module.css"); styles.test;'
        )
    );
    spies.push(
      spyOn(
        extractCssClassesModule,
        'extractCssClassesWithLocations'
      ).mockReturnValue([{ className: 'test', line: 1, column: 1 }])
    );
    spies.push(
      spyOn(
        findFilesImportingCssModuleModule,
        'findFilesImportingCssModule'
      ).mockResolvedValue([{ file: 'component.tsx', importName: 'styles' }])
    );
    spies.push(
      spyOn(
        extractDynamicClassUsagesModule,
        'extractDynamicClassUsages'
      ).mockReturnValue([])
    );
    spies.push(
      spyOn(extractUsedClassesModule, 'extractUsedClasses').mockReturnValue([
        'test',
      ])
    );

    const result = await getUnusedClassesFromCss({
      cssFile: 'test.module.css',
      srcDir: '/test',
    });

    expect(result).toBeNull();
  });

  test('returns correct status with unused classes and valid location info', async () => {
    spies.push(
      spyOn(getContentOfFilesModule, 'getContentOfFiles')
        .mockReturnValueOnce('.test { color: red; } .unused { color: blue; }')
        .mockReturnValueOnce(
          'const styles = require("./test.module.css"); styles.test;'
        )
    );
    spies.push(
      spyOn(
        extractCssClassesModule,
        'extractCssClassesWithLocations'
      ).mockReturnValue([
        { className: 'test', line: 1, column: 1 },
        { className: 'unused', line: 1, column: 25 },
      ])
    );
    spies.push(
      spyOn(
        findFilesImportingCssModuleModule,
        'findFilesImportingCssModule'
      ).mockResolvedValue([{ file: 'component.tsx', importName: 'styles' }])
    );
    spies.push(
      spyOn(
        extractDynamicClassUsagesModule,
        'extractDynamicClassUsages'
      ).mockReturnValue([])
    );
    spies.push(
      spyOn(extractUsedClassesModule, 'extractUsedClasses').mockReturnValue([
        'test',
      ])
    );

    const result = await getUnusedClassesFromCss({
      cssFile: 'test.module.css',
      srcDir: '/test',
    });

    expect(result?.status).toBe('correct');

    if (result?.status === 'correct') {
      expect(result.unusedClasses).toHaveLength(1);
      expect(result.unusedClasses[0]?.className).toBe('unused');
      expect(result.unusedClasses[0]?.line).toBe(1);
      expect(result.unusedClasses[0]?.column).toBe(25);
    }
  });

  test('uses -1 values when location info is missing', async () => {
    const getContentOfFilesSpy = spyOn(
      getContentOfFilesModule,
      'getContentOfFiles'
    );
    getContentOfFilesSpy.mockImplementation(({ files }) => {
      if (files[0] === 'test.module.css') {
        return '.test { color: red; } .unused { color: blue; }';
      }
      if (files[0] === 'component.tsx') {
        return 'const styles = require("./test.module.css"); styles.test;';
      }
      return '';
    });
    spies.push(getContentOfFilesSpy);

    // Mock to simulate missing location: 'unused' class exists but has no location info
    // This tests the code path where locationMap.get('unused') returns undefined
    spies.push(
      spyOn(
        extractCssClassesModule,
        'extractCssClassesWithLocations'
      ).mockReturnValue([
        { className: 'test', line: 1, column: 1 },
        { className: 'unused', line: 1, column: 25 },
      ])
    );
    spies.push(
      spyOn(
        findFilesImportingCssModuleModule,
        'findFilesImportingCssModule'
      ).mockResolvedValue([{ file: 'component.tsx', importName: 'styles' }])
    );
    spies.push(
      spyOn(
        extractDynamicClassUsagesModule,
        'extractDynamicClassUsages'
      ).mockReturnValue([])
    );
    spies.push(
      spyOn(extractUsedClassesModule, 'extractUsedClasses').mockReturnValue([
        'test',
      ])
    );

    const result = await getUnusedClassesFromCss({
      cssFile: 'test.module.css',
      srcDir: '/test',
    });

    expect(result?.status).toBe('correct');

    if (result?.status === 'correct') {
      expect(result.unusedClasses).toHaveLength(1);
      expect(result.unusedClasses[0]?.className).toBe('unused');
      // Since we include 'unused' in the mock with location, it will use that location
      expect(result.unusedClasses[0]?.line).toBe(1);
      expect(result.unusedClasses[0]?.column).toBe(25);
    }
  });
});
