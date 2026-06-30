import styles from './TsTypeAssertions.module.scss';

export const cls = styles.a;

// Angle-bracket syntax that is only valid in a non-JSX (.ts) file.
export const empty = <string[]>[];
export const identity = <T>(x: T): T => x;
