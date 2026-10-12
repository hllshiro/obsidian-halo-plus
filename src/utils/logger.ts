export type FileWriter = (msg: string) => Promise<void>;

export class Logger {
  private prefix: string;
  private isVerbose: () => boolean;
  private fileWriter?: FileWriter;

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

  setFileWriter(writer: FileWriter): void {
    this.fileWriter = writer;
  }

  log(...args: unknown[]): void {
    if (this.isVerbose()) {
      console.log(this.prefix, ...args);
    }
    this.appendToFile('INFO', args);
  }

  warn(...args: unknown[]): void {
    if (this.isVerbose()) {
      console.warn(this.prefix, ...args);
    }
    this.appendToFile('WARN', args);
  }

  error(...args: unknown[]): void {
    if (this.isVerbose()) {
      console.error(this.prefix, ...args);
    }
    this.appendToFile('ERROR', args);
  }

  verbose(...args: unknown[]): void {
    if (this.isVerbose()) {
      console.debug(this.prefix, ...args);
    }
    this.appendToFile('DEBUG', args);
  }

  private appendToFile(level: string, args: unknown[]): void {
    if (!this.fileWriter) return;
    const msg = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const line = `[${ts}] [${level}] ${msg}\n`;
    this.fileWriter(line).catch(() => {});
  }
}
