import { checkUnusedCss } from './lib/checkUnusedCss.js';

const main = async (): Promise<void> => {
  try {
    await checkUnusedCss();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

main();
