import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { getContentOfFiles } from './getContentOfFiles.js';

describe('getContentOfFiles', () => {
  const testDir = path.join(process.cwd(), 'test-temp');

  beforeEach(() => {
    // Create test directory and files
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('reads content from single file', () => {
    const fileName = 'test1.txt';
    const fileContent = 'Hello, world!';

    fs.writeFileSync(path.join(testDir, fileName), fileContent);

    const result = getContentOfFiles({
      files: [fileName],
      srcDir: testDir,
    });

    expect(result).toBe(`${fileContent}\n`);
  });

  test('reads content from multiple files', () => {
    const file1 = 'test1.txt';
    const file2 = 'test2.txt';
    const content1 = 'First file content';
    const content2 = 'Second file content';

    fs.writeFileSync(path.join(testDir, file1), content1);
    fs.writeFileSync(path.join(testDir, file2), content2);

    const result = getContentOfFiles({
      files: [file1, file2],
      srcDir: testDir,
    });

    expect(result).toBe(`${content1}\n${content2}\n`);
  });

  test('returns empty string for empty files array', () => {
    const result = getContentOfFiles({
      files: [],
      srcDir: testDir,
    });

    expect(result).toBe('');
  });

  test('handles files in subdirectories', () => {
    const subDir = 'subdir';
    const fileName = 'nested.txt';
    const fileContent = 'Nested file content';

    fs.mkdirSync(path.join(testDir, subDir), { recursive: true });
    fs.writeFileSync(path.join(testDir, subDir, fileName), fileContent);

    const result = getContentOfFiles({
      files: [path.join(subDir, fileName)],
      srcDir: testDir,
    });

    expect(result).toBe(`${fileContent}\n`);
  });

  test('handles empty files', () => {
    const fileName = 'empty.txt';

    fs.writeFileSync(path.join(testDir, fileName), '');

    const result = getContentOfFiles({
      files: [fileName],
      srcDir: testDir,
    });

    expect(result).toBe('\n');
  });

  test('handles files with special characters', () => {
    const fileName = 'special.txt';
    const fileContent = 'Content with\nnewlines\tand\ttabs';

    fs.writeFileSync(path.join(testDir, fileName), fileContent);

    const result = getContentOfFiles({
      files: [fileName],
      srcDir: testDir,
    });

    expect(result).toBe(`${fileContent}\n`);
  });

  test('handles Unicode content', () => {
    const fileName = 'unicode.txt';
    const fileContent = 'Unicode: 🚀 こんにちは мир';

    fs.writeFileSync(path.join(testDir, fileName), fileContent);

    const result = getContentOfFiles({
      files: [fileName],
      srcDir: testDir,
    });

    expect(result).toBe(`${fileContent}\n`);
  });

  test('concatenates files in the specified order', () => {
    const file1 = 'first.txt';
    const file2 = 'second.txt';
    const file3 = 'third.txt';
    const content1 = 'A';
    const content2 = 'B';
    const content3 = 'C';

    fs.writeFileSync(path.join(testDir, file1), content1);
    fs.writeFileSync(path.join(testDir, file2), content2);
    fs.writeFileSync(path.join(testDir, file3), content3);

    const result = getContentOfFiles({
      files: [file3, file1, file2], // Different order
      srcDir: testDir,
    });

    expect(result).toBe(`${content3}\n${content1}\n${content2}\n`);
  });

  test('handles TypeScript files', () => {
    const fileName = 'example.ts';
    const fileContent = `interface User {
  name: string;
  age: number;
}

const user: User = {
  name: 'John',
  age: 30,
};`;

    fs.writeFileSync(path.join(testDir, fileName), fileContent);

    const result = getContentOfFiles({
      files: [fileName],
      srcDir: testDir,
    });

    expect(result).toBe(`${fileContent}\n`);
  });

  test('handles CSS files', () => {
    const fileName = 'styles.css';
    const fileContent = `.button {
  background-color: blue;
  color: white;
  padding: 10px;
}

.button:hover {
  background-color: darkblue;
}`;

    fs.writeFileSync(path.join(testDir, fileName), fileContent);

    const result = getContentOfFiles({
      files: [fileName],
      srcDir: testDir,
    });

    expect(result).toBe(`${fileContent}\n`);
  });
});
