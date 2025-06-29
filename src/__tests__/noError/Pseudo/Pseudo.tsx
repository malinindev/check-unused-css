import styles from './Pseudo.module.css';

export const Pseudo: React.FC = () => (
  <div>
    <button type="button" className={styles.buttonHover}>
      Hover me
    </button>
    <input className={styles.inputFocus} placeholder="Focus me" />
    <ul>
      <li className={styles.listItemFirst}>First item</li>
      <li>Second item</li>
    </ul>
    <a href="123" className={styles.linkVisited}>
      Visited link
    </a>
    <p className={styles.paragraphAfter}>Text with arrow</p>
    <p className={styles.paragraphBefore}>Text with star</p>
    <input
      className={styles.inputPlaceholder}
      placeholder="Custom placeholder"
    />
  </div>
);
