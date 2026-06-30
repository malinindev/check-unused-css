import styles from './TsTypeAssertions.module.scss';

// Angle-bracket syntax that is only valid in a non-JSX (.ts) file. The class
// extraction must still find the used classes below.
export const empty = <string[]>[];
export const identity = <T>(x: T): T => x;

export const used = styles.usedClass;
export const used2 = styles.usedClass2;
