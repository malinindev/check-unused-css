import { COLORS } from '../consts.js';

export const formatLocationLine = (
  file: string,
  line: number,
  column: number,
  className: string,
  color: string = COLORS.red
): string => {
  return (
    `  ${COLORS.cyan}${file}:${line}:${column}${COLORS.reset} - ` +
    `${color}.${className}${COLORS.reset}`
  );
};
