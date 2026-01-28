type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function isEnabled(): boolean {
  // In production, default off unless explicitly enabled.
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_DEBUG === 'true';
  }
  return true;
}

function write(level: LogLevel, ...args: unknown[]): void {
  if (!isEnabled()) return;

  const fn =
    level === 'error'
      ? console.error
      : level === 'warn'
        ? console.warn
        : level === 'info'
          ? console.info
          : console.log;

  fn(...args);
}

export const logger = {
  debug: (...args: unknown[]) => write('debug', ...args),
  info: (...args: unknown[]) => write('info', ...args),
  warn: (...args: unknown[]) => write('warn', ...args),
  error: (...args: unknown[]) => write('error', ...args),
};
