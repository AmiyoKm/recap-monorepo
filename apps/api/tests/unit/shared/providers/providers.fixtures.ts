import type { IRecordedRequest } from "#api-tests/unit/shared/providers/providers.interfaces";

const realFetch = globalThis.fetch;

export const recordedRequests: IRecordedRequest[] = [];

function toRequest(input: string | URL | Request, init?: RequestInit): Request {
  if (input instanceof Request) {
    return input;
  }
  return new Request(String(input), init);
}

export function stubFetch(status: number, body: unknown): void {
  recordedRequests.length = 0;
  globalThis.fetch = Object.assign(
    (input: string | URL | Request, init?: RequestInit) => {
      const request = toRequest(input, init);
      recordedRequests.push({ url: request.url, headers: request.headers });
      return Promise.resolve(
        new Response(JSON.stringify(body), {
          status,
          headers: { "content-type": "application/json" },
        }),
      );
    },
    { preconnect: realFetch.preconnect },
  );
}

export function restoreFetch(): void {
  globalThis.fetch = realFetch;
}
