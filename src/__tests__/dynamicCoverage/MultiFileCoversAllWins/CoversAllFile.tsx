import styles from './shared.module.css';

// Bare variable -> coversAll -> the whole module must be skipped for unused
// checking, so `loner` must NOT be reported even though the pattern file alone
// would leave it uncovered.
export const CoversAllFile = ({ variant }: { variant: string }) => {
  return <div className={styles[variant]} />;
};
