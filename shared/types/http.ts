import { Method } from 'axios';

export type HttpBody = string | number | boolean | Record<string, unknown> | unknown[] | null;

export interface HttpRequest {
  body?: HttpBody;
  headers: Record<string, string>;
  method: Method | string;
  url: string;
}

export interface HttpResponse {
  body: HttpBody;
  headers: Record<string, string>;
  status: string;
  time: number;
}
