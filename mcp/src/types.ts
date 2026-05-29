// Shapes matching scripts/build-data.mjs output.

export interface Source {
  title: string;
  url: string;
  publisher?: string;
}

export type Status = 'required' | 'recommended' | 'optional' | 'avoid';

export interface Page {
  slug: string;
  category: string;
  title: string;
  summary: string;
  status: Status;
  order: number;
  appliesTo: string[];
  relatedSlugs: string[];
  sources: Source[];
  updated: string | null;
  url: string;
  mdUrl: string;
  body: string;
}

export interface Category {
  slug: string;
  title: string;
  summary: string;
  order: number;
}

export interface Manifest {
  generatedAt: string;
  site: string;
  categories: Category[];
  pages: Page[];
}

// JSON-RPC 2.0
export interface RpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface RpcError {
  code: number;
  message: string;
  data?: unknown;
}

export type RpcResponse =
  | { jsonrpc: '2.0'; id: string | number | null; result: unknown }
  | { jsonrpc: '2.0'; id: string | number | null; error: RpcError };
