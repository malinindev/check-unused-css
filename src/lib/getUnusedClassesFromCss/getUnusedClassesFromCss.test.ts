import {
  afterEach,
  beforeEach,
  describe,
  expect,
  type Mock,
  spyOn,
  test,
} from 'bun:test';
import * as getContentOfFilesModule from '../../utils/getContentOfFiles.js';
import { getUnusedClassesFromCss } from './getUnusedClassesFromCss.js';
import * as extractCssClassesModule from './utils/extractCssClasses/index.js';
import * as findFilesImportingCssModuleModule from './utils/findFilesImportingCssModule.js';
import * as findUnusedClassesModule from './utils/findUnusedClasses/index.js';

describe('getUnusedClassesFromCss', () => {
  let extractCssClassesSpy: Mock<
    (typeof extractCssClassesModule)['extractCssClasses']
  >;

  let findFilesImportingCssModuleSpy: Mock<
    (typeof findFilesImportingCssModuleModule)['findFilesImportingCssModule']
  >;

  let findUnusedClassesSpy: Mock<
    (typeof findUnusedClassesModule)['findUnusedClasses']
  >;

  let getContentOfFilesSpy: Mock<
    (typeof getContentOfFilesModule)['getContentOfFiles']
  >;

  beforeEach(() => {
    extractCssClassesSpy = spyOn(
      extractCssClassesModule,
      'extractCssClasses'
    ).mockReturnValue([]);

    findFilesImportingCssModuleSpy = spyOn(
      findFilesImportingCssModuleModule,
      'findFilesImportingCssModule'
    ).mockResolvedValue([]);

    findUnusedClassesSpy = spyOn(
      findUnusedClassesModule,
      'findUnusedClasses'
    ).mockReturnValue({ unusedClasses: [], hasDynamicUsage: false });

    getContentOfFilesSpy = spyOn(
      getContentOfFilesModule,
      'getContentOfFiles'
    ).mockReturnValue('');
  });

  afterEach(() => {
    extractCssClassesSpy.mockRestore();
    findFilesImportingCssModuleSpy.mockRestore();
    findUnusedClassesSpy.mockRestore();
    getContentOfFilesSpy.mockRestore();
  });

  describe('should handle CSS files without classes', () => {
    test('returns null when CSS file has no classes', async () => {
      extractCssClassesSpy.mockReturnValue([]);
      getContentOfFilesSpy.mockReturnValue('.empty { }');

      const result = await getUnusedClassesFromCss({
        cssFile: 'components/Empty.module.css',
        srcDir: '/src',
      });

      expect(result).toBeNull();
      expect(extractCssClassesSpy).toHaveBeenCalledWith('.empty { }');
      expect(findFilesImportingCssModuleSpy).not.toHaveBeenCalled();
    });

    test('returns null when CSS content is empty', async () => {
      extractCssClassesSpy.mockReturnValue([]);
      getContentOfFilesSpy.mockReturnValue('');

      const result = await getUnusedClassesFromCss({
        cssFile: 'components/Empty.module.css',
        srcDir: '/src',
      });

      expect(result).toBeNull();
      expect(extractCssClassesSpy).toHaveBeenCalledWith('');
    });
  });

  describe('should handle CSS files not imported anywhere', () => {
    test('returns notImported status when no files import the CSS module', async () => {
      extractCssClassesSpy.mockReturnValue(['button', 'text']);
      findFilesImportingCssModuleSpy.mockResolvedValue([]);
      getContentOfFilesSpy.mockReturnValue(
        '.button { color: red; } .text { font-size: 14px; }'
      );

      const result = await getUnusedClassesFromCss({
        cssFile: 'components/Button.module.css',
        srcDir: '/src',
      });

      expect(result).toEqual({
        file: 'components/Button.module.css',
        status: 'notImported',
      });
      expect(findFilesImportingCssModuleSpy).toHaveBeenCalledWith(
        'components/Button.module.css',
        '/src'
      );
      expect(findUnusedClassesSpy).not.toHaveBeenCalled();
    });
  });

  describe('should handle dynamic usage detection', () => {
    test('returns withDynamicImports status when dynamic usage is detected', async () => {
      extractCssClassesSpy.mockReturnValue(['button', 'text']);
      findFilesImportingCssModuleSpy.mockResolvedValue([
        { file: 'components/Button.tsx', importName: 'styles' },
      ]);
      getContentOfFilesSpy
        .mockReturnValueOnce(
          '.button { color: red; } .text { font-size: 14px; }'
        )
        .mockReturnValueOnce('const className = styles[dynamicKey];');
      findUnusedClassesSpy.mockReturnValue({
        unusedClasses: null,
        hasDynamicUsage: true,
      });

      const result = await getUnusedClassesFromCss({
        cssFile: 'components/Button.module.css',
        srcDir: '/src',
      });

      expect(result).toEqual({
        file: 'components/Button.module.css',
        status: 'withDynamicImports',
      });
      expect(findUnusedClassesSpy).toHaveBeenCalledWith({
        cssClasses: ['button', 'text'],
        importNames: ['styles'],
        tsContent: 'const className = styles[dynamicKey];',
      });
    });
  });

  describe('should handle files with all classes used', () => {
    test('returns null when all classes are used', async () => {
      extractCssClassesSpy.mockReturnValue(['button', 'text']);
      findFilesImportingCssModuleSpy.mockResolvedValue([
        { file: 'components/Button.tsx', importName: 'styles' },
      ]);
      getContentOfFilesSpy
        .mockReturnValueOnce(
          '.button { color: red; } .text { font-size: 14px; }'
        )
        .mockReturnValueOnce(
          'const button = styles.button; const text = styles.text;'
        );
      findUnusedClassesSpy.mockReturnValue({
        unusedClasses: [],
        hasDynamicUsage: false,
      });

      const result = await getUnusedClassesFromCss({
        cssFile: 'components/Button.module.css',
        srcDir: '/src',
      });

      expect(result).toBeNull();
      expect(findUnusedClassesSpy).toHaveBeenCalledWith({
        cssClasses: ['button', 'text'],
        importNames: ['styles'],
        tsContent: 'const button = styles.button; const text = styles.text;',
      });
    });
  });

  describe('should handle files with unused classes', () => {
    test('returns correct status with unused classes', async () => {
      extractCssClassesSpy.mockReturnValue(['button', 'text', 'unused']);
      findFilesImportingCssModuleSpy.mockResolvedValue([
        { file: 'components/Button.tsx', importName: 'styles' },
      ]);
      getContentOfFilesSpy
        .mockReturnValueOnce(
          '.button { color: red; } .text { font-size: 14px; } .unused { display: none; }'
        )
        .mockReturnValueOnce(
          'const button = styles.button; const text = styles.text;'
        );
      findUnusedClassesSpy.mockReturnValue({
        unusedClasses: ['unused'],
        hasDynamicUsage: false,
      });

      const result = await getUnusedClassesFromCss({
        cssFile: 'components/Button.module.css',
        srcDir: '/src',
      });

      expect(result).toEqual({
        file: 'components/Button.module.css',
        unusedClasses: ['unused'],
        status: 'correct',
      });
    });

    test('returns multiple unused classes', async () => {
      extractCssClassesSpy.mockReturnValue([
        'button',
        'text',
        'unused1',
        'unused2',
      ]);
      findFilesImportingCssModuleSpy.mockResolvedValue([
        { file: 'components/Button.tsx', importName: 'styles' },
      ]);
      getContentOfFilesSpy
        .mockReturnValueOnce('.button { } .text { } .unused1 { } .unused2 { }')
        .mockReturnValueOnce('const button = styles.button;');
      findUnusedClassesSpy.mockReturnValue({
        unusedClasses: ['text', 'unused1', 'unused2'],
        hasDynamicUsage: false,
      });

      const result = await getUnusedClassesFromCss({
        cssFile: 'components/Button.module.css',
        srcDir: '/src',
      });

      expect(result).toEqual({
        file: 'components/Button.module.css',
        unusedClasses: ['text', 'unused1', 'unused2'],
        status: 'correct',
      });
    });
  });

  describe('should handle multiple importing files', () => {
    test('handles multiple files importing same CSS module', async () => {
      extractCssClassesSpy.mockReturnValue(['button', 'text']);
      findFilesImportingCssModuleSpy.mockResolvedValue([
        { file: 'components/Button.tsx', importName: 'styles' },
        { file: 'components/Card.tsx', importName: 'css' },
      ]);
      getContentOfFilesSpy
        .mockReturnValueOnce(
          '.button { color: red; } .text { font-size: 14px; }'
        )
        .mockReturnValueOnce(
          'const button = styles.button; const card = css.text;'
        );
      findUnusedClassesSpy.mockReturnValue({
        unusedClasses: [],
        hasDynamicUsage: false,
      });

      const result = await getUnusedClassesFromCss({
        cssFile: 'components/Button.module.css',
        srcDir: '/src',
      });

      expect(result).toBeNull();
      expect(getContentOfFilesSpy).toHaveBeenCalledWith({
        files: ['components/Button.tsx', 'components/Card.tsx'],
        srcDir: '/src',
      });
      expect(findUnusedClassesSpy).toHaveBeenCalledWith({
        cssClasses: ['button', 'text'],
        importNames: ['styles', 'css'],
        tsContent: 'const button = styles.button; const card = css.text;',
      });
    });

    test('deduplicates import names from multiple files', async () => {
      extractCssClassesSpy.mockReturnValue(['button']);
      findFilesImportingCssModuleSpy.mockResolvedValue([
        { file: 'components/Button.tsx', importName: 'styles' },
        { file: 'components/Card.tsx', importName: 'styles' }, // Same import name
        { file: 'components/Header.tsx', importName: 'css' },
      ]);
      getContentOfFilesSpy
        .mockReturnValueOnce('.button { color: red; }')
        .mockReturnValueOnce(
          'const button1 = styles.button; const button2 = styles.button; const button3 = css.button;'
        );
      findUnusedClassesSpy.mockReturnValue({
        unusedClasses: [],
        hasDynamicUsage: false,
      });

      await getUnusedClassesFromCss({
        cssFile: 'components/Button.module.css',
        srcDir: '/src',
      });

      expect(findUnusedClassesSpy).toHaveBeenCalledWith({
        cssClasses: ['button'],
        importNames: ['styles', 'css'], // Deduplicated
        tsContent:
          'const button1 = styles.button; const button2 = styles.button; const button3 = css.button;',
      });
    });
  });

  describe('should call dependencies with correct parameters', () => {
    test('calls getContentOfFiles for CSS file first', async () => {
      extractCssClassesSpy.mockReturnValue(['button']);
      findFilesImportingCssModuleSpy.mockResolvedValue([
        { file: 'components/Button.tsx', importName: 'styles' },
      ]);
      getContentOfFilesSpy
        .mockReturnValueOnce('.button { color: red; }')
        .mockReturnValueOnce('const button = styles.button;');
      findUnusedClassesSpy.mockReturnValue({
        unusedClasses: [],
        hasDynamicUsage: false,
      });

      await getUnusedClassesFromCss({
        cssFile: 'components/Button.module.css',
        srcDir: '/src',
      });

      expect(getContentOfFilesSpy).toHaveBeenNthCalledWith(1, {
        files: ['components/Button.module.css'],
        srcDir: '/src',
      });
    });

    test('calls extractCssClasses with CSS content', async () => {
      const cssContent = '.button { color: red; } .text { font-size: 14px; }';
      extractCssClassesSpy.mockReturnValue(['button', 'text']);
      getContentOfFilesSpy.mockReturnValue(cssContent);

      await getUnusedClassesFromCss({
        cssFile: 'components/Button.module.css',
        srcDir: '/src',
      });

      expect(extractCssClassesSpy).toHaveBeenCalledWith(cssContent);
    });

    test('calls findFilesImportingCssModule with correct parameters', async () => {
      extractCssClassesSpy.mockReturnValue(['button']);
      getContentOfFilesSpy.mockReturnValue('.button { color: red; }');

      await getUnusedClassesFromCss({
        cssFile: 'components/Button.module.css',
        srcDir: '/src',
      });

      expect(findFilesImportingCssModuleSpy).toHaveBeenCalledWith(
        'components/Button.module.css',
        '/src'
      );
    });

    test('calls getContentOfFiles for TypeScript files when imports found', async () => {
      extractCssClassesSpy.mockReturnValue(['button']);
      findFilesImportingCssModuleSpy.mockResolvedValue([
        { file: 'components/Button.tsx', importName: 'styles' },
        { file: 'components/Card.tsx', importName: 'css' },
      ]);
      getContentOfFilesSpy
        .mockReturnValueOnce('.button { color: red; }')
        .mockReturnValueOnce('const button = styles.button;');
      findUnusedClassesSpy.mockReturnValue({
        unusedClasses: [],
        hasDynamicUsage: false,
      });

      await getUnusedClassesFromCss({
        cssFile: 'components/Button.module.css',
        srcDir: '/src',
      });

      expect(getContentOfFilesSpy).toHaveBeenNthCalledWith(2, {
        files: ['components/Button.tsx', 'components/Card.tsx'],
        srcDir: '/src',
      });
    });

    test('calls findUnusedClasses with all required parameters', async () => {
      const cssClasses = ['button', 'text'];
      const tsContent = 'const button = styles.button;';
      const importNames = ['styles', 'css'];

      extractCssClassesSpy.mockReturnValue(cssClasses);
      findFilesImportingCssModuleSpy.mockResolvedValue([
        { file: 'components/Button.tsx', importName: 'styles' },
        { file: 'components/Card.tsx', importName: 'css' },
      ]);
      getContentOfFilesSpy
        .mockReturnValueOnce('.button { } .text { }')
        .mockReturnValueOnce(tsContent);
      findUnusedClassesSpy.mockReturnValue({
        unusedClasses: ['text'],
        hasDynamicUsage: false,
      });

      await getUnusedClassesFromCss({
        cssFile: 'components/Button.module.css',
        srcDir: '/src',
      });

      expect(findUnusedClassesSpy).toHaveBeenCalledWith({
        cssClasses,
        importNames,
        tsContent,
      });
    });
  });

  describe('should handle edge cases', () => {
    test('handles empty srcDir', async () => {
      extractCssClassesSpy.mockReturnValue(['button']);
      getContentOfFilesSpy.mockReturnValue('.button { color: red; }');

      await getUnusedClassesFromCss({
        cssFile: 'Button.module.css',
        srcDir: '',
      });

      expect(findFilesImportingCssModuleSpy).toHaveBeenCalledWith(
        'Button.module.css',
        ''
      );
    });

    test('handles relative CSS file paths', async () => {
      extractCssClassesSpy.mockReturnValue(['button']);
      getContentOfFilesSpy.mockReturnValue('.button { color: red; }');

      await getUnusedClassesFromCss({
        cssFile: './components/Button.module.css',
        srcDir: '/src',
      });

      expect(getContentOfFilesSpy).toHaveBeenNthCalledWith(1, {
        files: ['./components/Button.module.css'],
        srcDir: '/src',
      });
    });

    test('handles complex file paths', async () => {
      extractCssClassesSpy.mockReturnValue(['button']);
      getContentOfFilesSpy.mockReturnValue('.button { color: red; }');

      await getUnusedClassesFromCss({
        cssFile: 'components/ui/buttons/PrimaryButton.module.css',
        srcDir: '/src/app',
      });

      expect(findFilesImportingCssModuleSpy).toHaveBeenCalledWith(
        'components/ui/buttons/PrimaryButton.module.css',
        '/src/app'
      );
    });
  });

  describe('should handle integration scenarios', () => {
    test('complete flow with unused classes found', async () => {
      // Setup: CSS with 3 classes, 1 imported file, 1 class unused
      extractCssClassesSpy.mockReturnValue(['primary', 'secondary', 'unused']);
      findFilesImportingCssModuleSpy.mockResolvedValue([
        { file: 'Button.tsx', importName: 'buttonStyles' },
      ]);
      getContentOfFilesSpy
        .mockReturnValueOnce('.primary { } .secondary { } .unused { }')
        .mockReturnValueOnce(
          'const btn = buttonStyles.primary; const btn2 = buttonStyles.secondary;'
        );
      findUnusedClassesSpy.mockReturnValue({
        unusedClasses: ['unused'],
        hasDynamicUsage: false,
      });

      const result = await getUnusedClassesFromCss({
        cssFile: 'Button.module.css',
        srcDir: '/src',
      });

      // Verify complete flow
      expect(getContentOfFilesSpy).toHaveBeenCalledTimes(2);
      expect(extractCssClassesSpy).toHaveBeenCalledTimes(1);
      expect(findFilesImportingCssModuleSpy).toHaveBeenCalledTimes(1);
      expect(findUnusedClassesSpy).toHaveBeenCalledTimes(1);

      expect(result).toEqual({
        file: 'Button.module.css',
        unusedClasses: ['unused'],
        status: 'correct',
      });
    });

    test('complete flow ending with dynamic usage', async () => {
      extractCssClassesSpy.mockReturnValue(['button']);
      findFilesImportingCssModuleSpy.mockResolvedValue([
        { file: 'Button.tsx', importName: 'styles' },
      ]);
      getContentOfFilesSpy
        .mockReturnValueOnce('.button { }')
        .mockReturnValueOnce('const className = styles[getButtonClass()];');
      findUnusedClassesSpy.mockReturnValue({
        unusedClasses: null,
        hasDynamicUsage: true,
      });

      const result = await getUnusedClassesFromCss({
        cssFile: 'Button.module.css',
        srcDir: '/src',
      });

      expect(result).toEqual({
        file: 'Button.module.css',
        status: 'withDynamicImports',
      });
    });

    test('complete flow ending with no unused classes', async () => {
      extractCssClassesSpy.mockReturnValue(['button', 'text']);
      findFilesImportingCssModuleSpy.mockResolvedValue([
        { file: 'Button.tsx', importName: 'styles' },
      ]);
      getContentOfFilesSpy
        .mockReturnValueOnce('.button { } .text { }')
        .mockReturnValueOnce(
          'const btn = styles.button; const txt = styles.text;'
        );
      findUnusedClassesSpy.mockReturnValue({
        unusedClasses: [],
        hasDynamicUsage: false,
      });

      const result = await getUnusedClassesFromCss({
        cssFile: 'Button.module.css',
        srcDir: '/src',
      });

      expect(result).toBeNull();
    });
  });
});
