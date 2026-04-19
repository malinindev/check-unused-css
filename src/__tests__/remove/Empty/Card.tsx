import styles from './Card.module.scss';

// Import the module so analysis treats it as used, but never reference any
// specific class — this makes `.unusedCard` an unused class and the file
// fully empties after removal.
void styles;

export const Card = () => <div>empty</div>;
