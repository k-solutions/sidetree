import ILogger from './interfaces/ILogger.ts';

/**
 * Console Logger.
 */
export default class ConsoleLogger implements ILogger {
  info (data: any): void {
    console.info(data);
  }

  warn (data: any): void {
    console.warn(data);
  }

  error (data: any): void {
    console.error(data);
  }
}
