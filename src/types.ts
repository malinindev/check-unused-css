export type UnusedClassResultWithClasses = {
  file: string;
  unusedClasses: string[];
  status: 'correct';
};

export type UnusedClassResultNoClasses = {
  file: string;
  status: 'notImported' | 'withDynamicImports';
};

export type UnusedClassResult =
  | UnusedClassResultWithClasses
  | UnusedClassResultNoClasses;

export type Args = {
  targetPath?: string;
  excludePatterns?: string[];
};
