export type UnusedClassUsage = {
  className: string;
  line: number;
  column: number;
};

export type UnusedClassResultWithClasses = {
  file: string;
  unusedClasses: UnusedClassUsage[];
  status: 'correct';
};

export type UnusedClassResultNoClasses = {
  file: string;
  status: 'notImported' | 'withDynamicImports';
};

export type NonExistentClassUsage = {
  className: string;
  file: string;
  line: number;
  column: number;
};

export type NonExistentClassResult = {
  file: string;
  nonExistentClasses: NonExistentClassUsage[];
  status: 'nonExistentClasses';
};

export type UnusedClassResult =
  | UnusedClassResultWithClasses
  | UnusedClassResultNoClasses;

export type CssAnalysisResult = UnusedClassResult | NonExistentClassResult;

export type Args = {
  targetPath?: string;
  excludePatterns?: string[];
  noDynamic?: boolean;
};
