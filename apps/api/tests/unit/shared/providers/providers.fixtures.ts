import type {
  IRecordedRequest,
  IStubResponse,
} from "#api-tests/unit/shared/providers/providers.interfaces";

const realFetch = globalThis.fetch;

export const recordedRequests: IRecordedRequest[] = [];

function toRequest(input: string | URL | Request, init?: RequestInit): Request {
  if (input instanceof Request) {
    return input;
  }
  return new Request(String(input), init);
}

function toResponse({ status, body }: IStubResponse): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function stubFetchSequence(responses: IStubResponse[]): void {
  recordedRequests.length = 0;
  const pending = [...responses];
  globalThis.fetch = Object.assign(
    (input: string | URL | Request, init?: RequestInit) => {
      const request = toRequest(input, init);
      recordedRequests.push({ url: request.url, method: request.method, headers: request.headers });
      const next = pending.shift() ?? responses.at(-1);
      if (!next) {
        return Promise.reject(new Error(request.url));
      }
      return Promise.resolve(toResponse(next));
    },
    { preconnect: realFetch.preconnect },
  );
}

export function stubFetch(status: number, body: unknown): void {
  stubFetchSequence([{ status, body }]);
}

export function restoreFetch(): void {
  globalThis.fetch = realFetch;
}
