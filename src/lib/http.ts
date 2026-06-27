export function ok<T>(data: T, init?: ResponseInit) {
  return Response.json(data, init);
}

export function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function routeError(error: unknown) {
  if (error instanceof Response) {
    return error;
  }

  const message = error instanceof Error ? error.message : "Unexpected server error";
  const status = message.includes("Missing required environment variable") ? 500 : 400;

  return fail(message, status);
}
