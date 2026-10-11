import type { IRecordedRequest } from "#api-tests/unit/shared/providers/providers.interfaces";

const realFetch = globalThis.fetch;

export const recordedRequests: IRecordedRequest[] = [];

export function stubFetch(status: number, body: unknown): void {
  recordedRequests.length = 0;
  globalThis.fetch = Object.assign(
    (input: string | URL | Request, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(String(input), init);
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
