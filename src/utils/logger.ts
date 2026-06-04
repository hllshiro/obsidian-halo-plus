export class Logger {
  private prefix: string;
  private isVerbose: () => boolean;

  private static instance: Logger;

  private constructor(prefix: string, isVerbose: () => boolean) {
    this.prefix = prefix;
    this.isVerbose = isVerbose;
  }

  static init(prefix: string, isVerbose: () => boolean): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(prefix, isVerbose);
    }
    return Logger.instance;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      throw new Error('Logger not initialized. Call Logger.init() first.');
    }
    return Logger.instance;
  }

  log(...args: unknown[]): void {
    console.log(this.prefix, ...args);
  }

  warn(...args: unknown[]): void {
    console.warn(this.prefix, ...args);
  }

  error(...args: unknown[]): void {
    console.error(this.prefix, ...args);
  }

  verbose(...args: unknown[]): void {
    if (this.isVerbose()) {
      console.debug(this.prefix, ...args);
    }
  }
}
