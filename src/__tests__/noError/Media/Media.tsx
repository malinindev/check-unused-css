import styles from './Media.module.css';

export const Media: React.FC = () => (
  <div>
    <div className={styles.desktopOnly}>Desktop only content</div>
    <div className={styles.mobileOnly}>Mobile only content</div>
    <div className={styles.largeScreen}>Large screen content</div>
    <div className={styles.printOnly}>Print only content</div>
    <div className={styles.landscapeOnly}>Landscape only content</div>
  </div>
);
