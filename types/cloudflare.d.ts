declare type D1Database = any;
declare type D1PreparedStatement = any;
declare type D1Result = any;
declare type D1Response = any;

declare interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

declare module "cloudflare:workers" {
  export const env: {
    DB: D1Database;
  };
}
