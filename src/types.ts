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

export type DynamicClassUsage = {
  className: string;
  file: string;
  line: number;
  column: number;
};

export type UnusedClassResultNoClasses = {
  file: string;
  status: 'notImported';
};

export type DynamicClassResult = {
  file: string;
  dynamicUsages: DynamicClassUsage[];
  status: 'withDynamicImports';
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
  | UnusedClassResultNoClasses
  | DynamicClassResult;

export type CssAnalysisResult = UnusedClassResult | NonExistentClassResult;

export type Args = {
  targetPath?: string;
  excludePatterns?: string[];
  noDynamic?: boolean;
};
