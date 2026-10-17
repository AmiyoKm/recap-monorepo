export interface IRecordedRequest {
  url: string;
  method: string;
  headers: Headers;
}

export interface IStubResponse {
  status: number;
  body: unknown;
}
