import { LogLevel } from '../enums/LogLevel.enum';

export type LoggerFunction = (
  level: LogLevel,
  message: string,
  data?: Error | Record<string, unknown> | unknown
) => void;

const defaultLogger: LoggerFunction = (
  _level: LogLevel,
  message: string,
  data?: Error | Record<string, unknown> | unknown
): void => {
  console.log(`[Octopus] ${message}`, data);
};

let currentLogger: LoggerFunction = defaultLogger;

/**
 * Set a custom logger function to handle all logs
 *
 * @param logger A function that takes a log level and message and handles the logging
 */
export const setLogger = (logger: LoggerFunction): void => {
  currentLogger = logger;
};

/**
 * Get the current logger function
 */
export const getLogger = (): LoggerFunction => currentLogger;

/**
 * Reset the logger to the default implementation
 */
export const resetLogger = (): void => {
  currentLogger = defaultLogger;
};

let logLevel = LogLevel.WARN;

export const setLogLevel = (level: LogLevel) => {
  logLevel = level;
};

export const getLogLevel = () => logLevel;

export function log(
  level: LogLevel,
  message: string,
  data?: Error | Record<string, unknown> | unknown
): void {
  const currentLogLevel = getLogLevel();
  if (level < currentLogLevel) {
    return;
  }

  const logger = getLogger();
  logger(level, message, data);
}
