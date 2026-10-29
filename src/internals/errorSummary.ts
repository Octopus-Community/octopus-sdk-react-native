/** Keep host request metadata, tokens and nested causes out of bridge logs. */
export function errorSummary(error: unknown): {
  name: string;
  message: string;
} {
  if (typeof error !== 'object' || error === null) {
    return { name: 'UnknownError', message: 'Non-Error rejection' };
  }

  try {
    const { name, message } = error as { name?: unknown; message?: unknown };
    return {
      name: typeof name === 'string' ? name : 'UnknownError',
      message: typeof message === 'string' ? message : 'Unknown error',
    };
  } catch {
    return { name: 'UnknownError', message: 'Unreadable error' };
  }
}
