export interface IRecordedRequest {
  url: string;
  method: string;
  headers: Headers;
  body: string;
}

export interface IStubResponse {
  status: number;
  body: unknown;
}
