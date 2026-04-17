import readline from 'node:readline';
import type { Readable, Writable } from 'node:stream';

export type ConfirmPromptOptions = {
  input?: Readable;
  output?: Writable;
};

/**
 * Prints `question` to `output` (default: stdout), reads one line from `input`
 * (default: stdin), and resolves with `true` only for an explicit affirmative
 * (`y` / `Y` / `yes` / `YES`). Anything else (including empty input or EOF)
 * resolves to `false`.
 *
 * The readline interface is closed before the promise resolves so the process
 * can exit cleanly afterwards.
 *
 * The `input` / `output` parameters exist purely for test injection — real
 * callers should pass nothing.
 */
export const confirmPrompt = (
  question: string,
  options: ConfirmPromptOptions = {}
): Promise<boolean> => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: options.input ?? process.stdin,
      output: options.output ?? process.stdout,
    });

    let answered = false;

    rl.question(question, (answer) => {
      answered = true;
      const normalized = answer.trim().toLowerCase();
      const accepted = normalized === 'y' || normalized === 'yes';
      rl.close();
      resolve(accepted);
    });

    // If stdin closes before any line is read (EOF in non-TTY), treat it as
    // "no" so we never hang or silently proceed.
    rl.once('close', () => {
      if (!answered) resolve(false);
    });
  });
};
