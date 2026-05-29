// Minimal A2A (Agent-to-Agent) protocol handler.
//
// Implements the JSON-RPC `message/send` method from the A2A spec
// (https://a2a-protocol.org/latest/specification/) on top of the same
// search/get tools the MCP transport already uses. The agent receives a
// natural-language Message, runs a keyword search across the spec, and
// returns the matching topics as a text Message.
//
// Streaming, push notifications, and the task lifecycle are intentionally
// out of scope: the work is synchronous and short, so returning a Message
// (the other half of SendMessageResponse's oneof) is sufficient.

import type { Manifest, RpcRequest, RpcResponse } from './types';
import { searchTool, getTopicTool } from './tools';

const A2A_PROTOCOL_VERSION = '1.0';

interface TextPart {
  kind: 'text';
  text: string;
  metadata?: Record<string, unknown>;
}

interface Message {
  messageId: string;
  role: 'user' | 'agent';
  parts: TextPart[];
  contextId?: string;
  taskId?: string;
  kind?: 'message';
}

function textFromMessage(m: Message): string {
  if (!m?.parts?.length) return '';
  return m.parts
    .filter((p) => p?.kind === 'text' && typeof p.text === 'string')
    .map((p) => p.text)
    .join('\n')
    .trim();
}

// Tiny deterministic ID generator — Workers have crypto.randomUUID().
function newId(): string {
  return crypto.randomUUID();
}

function ok(id: RpcRequest['id'], result: unknown): RpcResponse {
  return { jsonrpc: '2.0', id: id ?? null, result };
}

function err(id: RpcRequest['id'], code: number, message: string, data?: unknown): RpcResponse {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message, data } };
}

function reply(text: string, contextId?: string): Message {
  return {
    kind: 'message',
    messageId: newId(),
    role: 'agent',
    contextId,
    parts: [{ kind: 'text', text }],
  };
}

function handleMessageSend(manifest: Manifest, params: Record<string, unknown>): Message {
  const message = (params?.message ?? params) as Message | undefined;
  if (!message || !Array.isArray(message.parts)) {
    return reply(
      "Send a Message with at least one text part. Example: ask 'what is content security policy' " +
        "to search the spec, or 'topic:llms-txt' to fetch a single page.",
      message?.contextId,
    );
  }
  const query = textFromMessage(message);
  if (!query) {
    return reply('I need a text part to act on.', message.contextId);
  }

  // `topic:<slug>` → fetch that page verbatim.
  const slugMatch = query.match(/^\s*topic:\s*([a-z0-9-]+)\s*$/i);
  if (slugMatch) {
    const result = getTopicTool(manifest, { slug: slugMatch[1] });
    const text = result.content?.[0]?.text ?? 'No content.';
    return reply(text, message.contextId);
  }

  // Default: ranked keyword search.
  const search = searchTool(manifest, { query, limit: 5 });
  const text = search.content?.[0]?.text ?? `No matches for "${query}".`;
  return reply(text, message.contextId);
}

export function handleA2aRpc(manifest: Manifest, req: RpcRequest): RpcResponse | null {
  const { id, method, params = {} } = req;
  switch (method) {
    case 'message/send':
      return ok(id, handleMessageSend(manifest, params));

    case 'message/stream':
    case 'tasks/get':
    case 'tasks/cancel':
    case 'tasks/resubscribe':
    case 'tasks/pushNotificationConfig/set':
    case 'tasks/pushNotificationConfig/get':
    case 'tasks/pushNotificationConfig/list':
    case 'tasks/pushNotificationConfig/delete':
    case 'agent/getAuthenticatedExtendedCard':
      return err(
        id,
        -32601,
        `Method "${method}" is not supported by this agent. See the AgentCard at ` +
          `/.well-known/agent-card.json for the capabilities this agent declares.`,
      );

    default:
      return err(id, -32601, `Method not found: ${method}`);
  }
}

export const AGENT_CARD = {
  protocolVersion: A2A_PROTOCOL_VERSION,
  name: 'The Website Specification',
  description:
    'Read-only agent that answers natural-language questions about The Website Specification — ' +
    'a platform-agnostic checklist of what a good website does. Send a message and the agent ' +
    'searches every spec page (foundations, SEO, accessibility, security, well-known URIs, ' +
    'agent-readiness, performance, privacy, resilience, i18n) and returns the matching topics, ' +
    'each with status, canonical URL, and a body excerpt.',
  version: '0.1.0',
  documentationUrl: 'https://specification.website/spec/agent-readiness/a2a-agent-cards/',
  iconUrl: 'https://specification.website/icon-512.png',
  provider: {
    organization: 'Joost de Valk',
    url: 'https://joost.blog',
  },
  supportedInterfaces: [
    {
      url: 'https://mcp.specification.website/a2a/v1',
      protocolBinding: 'JSONRPC',
      protocolVersion: A2A_PROTOCOL_VERSION,
    },
  ],
  capabilities: {
    streaming: false,
    pushNotifications: false,
    extendedAgentCard: false,
  },
  defaultInputModes: ['text/plain'],
  defaultOutputModes: ['text/markdown', 'text/plain'],
  skills: [
    {
      id: 'search-spec',
      name: 'Search the spec',
      description:
        'Free-text search across every spec page. Returns ranked results with title, status, ' +
        'category, canonical URL, and a body excerpt.',
      tags: ['search', 'discovery', 'web-standards'],
      examples: [
        'what is content security policy',
        'how do I implement llms.txt',
        'required SEO topics',
      ],
      inputModes: ['text/plain'],
      outputModes: ['text/markdown'],
    },
    {
      id: 'get-topic',
      name: 'Fetch a spec topic',
      description:
        'Fetch the full canonical Markdown of one spec page by slug. Send a text part of the form ' +
        '`topic:<slug>` — for example `topic:content-security-policy` or `topic:llms-txt`.',
      tags: ['fetch', 'markdown', 'reference'],
      examples: ['topic:content-security-policy', 'topic:meta-robots', 'topic:llms-txt'],
      inputModes: ['text/plain'],
      outputModes: ['text/markdown'],
    },
    {
      id: 'audit-against-spec',
      name: 'Audit a website against the spec',
      description:
        'Pair this agent with a browsing agent: ask it for the relevant required and recommended ' +
        'topics for a category (security, seo, accessibility, performance, privacy, i18n, ' +
        'resilience, agent-readiness, well-known, foundations) and the audit plan falls out.',
      tags: ['audit', 'checklist', 'compliance'],
      examples: [
        'list every required SEO topic',
        'what should a static blog ship for accessibility',
        'security topics I should verify on a payment site',
      ],
      inputModes: ['text/plain'],
      outputModes: ['text/markdown'],
    },
  ],
};
