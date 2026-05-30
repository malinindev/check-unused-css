import styles from './Comprehensive.module.css';

// File 3 — a variety of template patterns, each covering its own subset:
//  - prefix   `icon${x}`     -> ^icon.*$    (covers icon, iconHome, iconUser)
//  - prefix   `button${y}`   -> ^button.*$  (covers buttonPrimary, buttonSecondary)
//  - middle   `col${n}Span`  -> ^col.*Span$ (covers col3Span, col12Span)
//  - multi    `grid${a}x${b}`-> ^grid.*x.*$ (covers grid2x4)
//  - suffix   `${z}Active`   -> ^.*Active$  (covers tabActive)
//  - overlap  `size${s}` plus literal `sizeLarge` -> sizeLarge covered by both
export const ComprehensivePatterns = ({
  x,
  y,
  n,
  a,
  b,
  z,
  s,
}: {
  x: string;
  y: string;
  n: number;
  a: string;
  b: string;
  z: string;
  s: string;
}) => {
  return (
    <>
      <div className={styles[`icon${x}`]} />
      <div className={styles[`button${y}`]} />
      <div className={styles[`col${n}Span`]} />
      <div className={styles[`grid${a}x${b}`]} />
      <div className={styles[`${z}Active`]} />
      <div className={`${styles.sizeLarge} ${styles[`size${s}`]}`} />
    </>
  );
};
