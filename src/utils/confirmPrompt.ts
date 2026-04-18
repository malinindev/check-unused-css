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

    let settled = false;
    const settle = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    rl.question(question, (answer) => {
      const normalized = answer.trim().toLowerCase();
      const accepted = normalized === 'y' || normalized === 'yes';
      settle(accepted);
      rl.close();
    });

    // If stdin closes before any line is read (EOF in non-TTY), treat it as
    // "no" so we never hang or silently proceed.
    rl.once('close', () => settle(false));

    // Stream errors (e.g. EIO on a disconnected terminal) must fail closed —
    // resolving true here could trigger a destructive write without consent.
    // Log before settling so an invisible terminal problem isn't mistaken for
    // a deliberate decline.
    rl.once('error', (err) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`confirmPrompt: input stream error — ${message}`);
      try {
        rl.close();
      } catch {
        // already closed
      }
      settle(false);
    });
  });
};
