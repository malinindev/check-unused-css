import styles from './Card.module.scss';

// Dynamic pattern access: `icon${variant}` covers iconHome / iconUser. Only
// `.unusedCard` is genuinely removable — the pattern-covered classes must never
// be deleted (deleting a class used at runtime would break styles).
export const Card = ({ variant }: { variant: string }) => {
  return <div className={styles[`icon${variant}`]} />;
};
