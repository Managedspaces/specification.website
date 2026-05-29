// The Website Specification — MCP server (Cloudflare Worker).
//
// Streamable HTTP transport (the modern MCP transport, per the
// 2025-03-26 spec revision): the client POSTs JSON-RPC 2.0 messages to
// /mcp and gets back JSON-RPC responses. No sessions, no server-initiated
// messages, no SSE — this server is stateless and read-only.
//
// All spec content is bundled at build time via scripts/build-data.mjs.
// The Worker holds the manifest in module scope, so it is parsed once per
// isolate and reused across requests.

import data from './data.json' with { type: 'json' };
import {
  TOOLS,
  PROMPTS,
  searchTool,
  listTopicsTool,
  getTopicTool,
  getChecklistTool,
  getCategoriesTool,
  buildAuditPrompt,
} from './tools';
import type { Manifest, RpcRequest, RpcResponse } from './types';

const manifest = data as unknown as Manifest;

const PROTOCOL_VERSION = '2025-03-26';
const SERVER_INFO = {
  name: 'specification-website',
  version: '0.1.0',
  title: 'The Website Specification',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Mcp-Session-Id, Mcp-Protocol-Version',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id',
  'Access-Control-Max-Age': '86400',
};

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  ...CORS_HEADERS,
};

function ok(id: string | number | null | undefined, result: unknown): RpcResponse {
  return { jsonrpc: '2.0', id: id ?? null, result };
}

function err(
  id: string | number | null | undefined,
  code: number,
  message: string,
  data?: unknown,
): RpcResponse {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message, data } };
}

function handleRpc(req: RpcRequest): RpcResponse | null {
  const { id, method, params = {} } = req;

  switch (method) {
    case 'initialize':
      return ok(id, {
        protocolVersion: PROTOCOL_VERSION,
        serverInfo: SERVER_INFO,
        capabilities: {
          tools: { listChanged: false },
          prompts: { listChanged: false },
          logging: {},
        },
        instructions:
          'Read-only MCP server for The Website Specification at https://specification.website. ' +
          'Use `search` for free-text queries, `list_topics` for filtered lists, `get_topic` to fetch ' +
          'a single page as Markdown, and `get_checklist` for audit-style output.',
      });

    case 'notifications/initialized':
    case 'notifications/cancelled':
      return null; // notifications get no reply

    case 'ping':
      return ok(id, {});

    case 'tools/list':
      return ok(id, { tools: TOOLS });

    case 'tools/call': {
      const name = params.name as string;
      const args = (params.arguments as Record<string, unknown>) ?? {};
      try {
        switch (name) {
          case 'search':
            return ok(id, searchTool(manifest, args as { query: string; limit?: number }));
          case 'list_topics':
            return ok(id, listTopicsTool(manifest, args as any));
          case 'get_topic':
            return ok(id, getTopicTool(manifest, args as { slug: string }));
          case 'get_checklist':
            return ok(id, getChecklistTool(manifest, args as any));
          case 'get_categories':
            return ok(id, getCategoriesTool(manifest));
          default:
            return err(id, -32602, `Unknown tool: ${name}`);
        }
      } catch (e) {
        return err(id, -32603, `Tool error: ${(e as Error).message}`);
      }
    }

    case 'prompts/list':
      return ok(id, { prompts: PROMPTS });

    case 'prompts/get': {
      const name = params.name as string;
      const args = (params.arguments as Record<string, string>) ?? {};
      if (name !== 'audit_url') return err(id, -32602, `Unknown prompt: ${name}`);
      const url = args.url;
      if (!url) return err(id, -32602, 'Missing required argument: url');
      return ok(id, buildAuditPrompt(manifest, url, args.focus));
    }

    case 'logging/setLevel':
      return ok(id, {});

    default:
      return err(id, -32601, `Method not found: ${method}`);
  }
}

function htmlLanding(): Response {
  const body = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>specification.website — MCP server</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="canonical" href="https://mcp.specification.website/">
<style>
  body { font: 16px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #1a1a20; background: #fff; max-width: 48rem; margin: 4rem auto; padding: 0 1.5rem; }
  h1 { font-size: 1.75rem; margin: 0 0 0.5rem; }
  h2 { font-size: 1.125rem; margin: 2rem 0 0.5rem; }
  code, pre { font-family: ui-monospace, Menlo, Consolas, monospace; }
  pre { background: #f7f7f8; border: 1px solid #d8d8df; border-radius: .375rem;
    padding: .75rem 1rem; overflow-x: auto; }
  code { background: #eeeef1; padding: .1em .35em; border-radius: .25rem; font-size: .9em; }
  a { color: #15803d; }
</style>
</head>
<body>
<h1>The Website Specification — MCP server</h1>
<p>Streamable HTTP MCP endpoint at <code>POST /mcp</code>. Stateless, read-only, no authentication.</p>

<h2>Connect (Claude Desktop, MCP-aware clients)</h2>
<pre>{
  "mcpServers": {
    "specification-website": {
      "transport": "http",
      "url": "https://mcp.specification.website/mcp"
    }
  }
}</pre>

<h2>Tools</h2>
<ul>
  <li><code>search(query, limit?)</code> — full-text across every spec page</li>
  <li><code>list_topics({ category?, status?, limit? })</code> — filtered index</li>
  <li><code>get_topic({ slug })</code> — full Markdown for one page</li>
  <li><code>get_checklist({ category?, status? })</code> — flat checklist</li>
  <li><code>get_categories()</code> — taxonomy with counts</li>
</ul>

<h2>Prompts</h2>
<ul>
  <li><code>audit_url(url, focus?)</code> — generates an audit plan for a target URL</li>
</ul>

<h2>Discovery</h2>
<ul>
  <li>Server card: <a href="https://specification.website/.well-known/mcp/server-card.json">specification.website/.well-known/mcp/server-card.json</a></li>
  <li>Spec page: <a href="https://specification.website/spec/agent-readiness/mcp-and-tool-discovery/">spec/agent-readiness/mcp-and-tool-discovery</a></li>
  <li>Source: <a href="https://github.com/jdevalk/specification.website">github.com/jdevalk/specification.website</a></li>
</ul>
</body>
</html>`;
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...CORS_HEADERS },
  });
}

function metadata(): Response {
  return new Response(
    JSON.stringify(
      {
        name: SERVER_INFO.name,
        title: SERVER_INFO.title,
        version: SERVER_INFO.version,
        protocolVersion: PROTOCOL_VERSION,
        transport: 'http',
        endpoint: 'https://mcp.specification.website/mcp',
        capabilities: { tools: true, prompts: true },
        tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
        prompts: PROMPTS.map((p) => ({ name: p.name, description: p.description })),
        manifest: {
          generatedAt: manifest.generatedAt,
          pages: manifest.pages.length,
          categories: manifest.categories.length,
        },
        sources: {
          site: 'https://specification.website',
          repo: 'https://github.com/jdevalk/specification.website',
          spec: 'https://specification.website/spec/agent-readiness/mcp-and-tool-discovery/',
        },
      },
      null,
      2,
    ),
    { headers: JSON_HEADERS },
  );
}

async function handleMcp(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify(err(null, -32600, 'MCP endpoint requires POST with a JSON-RPC body.')),
      { status: 405, headers: JSON_HEADERS },
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify(err(null, -32700, 'Parse error: invalid JSON')), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  // Batch or single
  if (Array.isArray(body)) {
    const responses = body
      .map((r) => handleRpc(r as RpcRequest))
      .filter((r): r is RpcResponse => r !== null);
    return new Response(JSON.stringify(responses), { headers: JSON_HEADERS });
  }
  const response = handleRpc(body as RpcRequest);
  if (response === null) {
    // Pure notification — no response
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  return new Response(JSON.stringify(response), { headers: JSON_HEADERS });
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    switch (url.pathname) {
      case '/':
        return htmlLanding();
      case '/mcp':
      case '/mcp/':
        return handleMcp(request);
      case '/.well-known/mcp/server-card.json':
        return metadata();
      case '/health':
        return new Response('ok', { headers: { 'Content-Type': 'text/plain', ...CORS_HEADERS } });
      default:
        return new Response('Not found.', {
          status: 404,
          headers: { 'Content-Type': 'text/plain', ...CORS_HEADERS },
        });
    }
  },
} satisfies ExportedHandler;
