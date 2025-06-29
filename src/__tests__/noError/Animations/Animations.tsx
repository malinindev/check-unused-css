import styles from './Animations.module.css';

export const Animations: React.FC = () => (
  <div>
    <div className={styles.fadeInAnimation}>Fade in animation</div>
    <div className={styles.slideInAnimation}>Slide in animation</div>
    <div className={styles.transformScale}>Scale on hover</div>
    <div className={styles.transformRotate}>Rotate on hover</div>
    <div className={styles.transformTranslate}>Translate on hover</div>
    <div className={styles.withVariables}>Using CSS variables</div>
    <div className={styles.usingVariables}>Using variables background</div>
  </div>
);
