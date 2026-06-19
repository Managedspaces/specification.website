---
title: "Agentic Resource Discovery (ARD)"
slug: agentic-resource-discovery
category: agent-readiness
summary: "Publish an AI Catalog at /.well-known/ai-catalog.json listing the agent capabilities your domain offers — MCP servers, A2A agents — so registries and agents can find and trust them from one fetch."
status: optional
order: 86
appliesTo: [all]
relatedSlugs: [dns-aid, mcp-and-tool-discovery, a2a-agent-cards, agent-skills-discovery, link-headers, well-known-overview]
updated: "2026-06-19T00:00:00.000Z"
sources:
  - title: "Agentic Resource Discovery (ARD) specification"
    url: "https://agenticresourcediscovery.org/"
    publisher: "ARD Project (Linux Foundation)"
  - title: "AI Catalog standard"
    url: "https://github.com/Agent-Card/ai-catalog"
    publisher: "AI Catalog Working Group, Linux Foundation"
  - title: "RFC 8141 — Uniform Resource Names (URNs)"
    url: "https://www.rfc-editor.org/rfc/rfc8141"
    publisher: "IETF"
  - title: "Announcing the Agentic Resource Discovery specification"
    url: "https://developers.googleblog.com/announcing-the-agentic-resource-discovery-specification/"
    publisher: "Google"
---

## What it is

Agentic Resource Discovery (ARD) is a draft discovery layer — not a runtime — that lets a domain advertise which agent capabilities it offers and how to verify them. It answers three questions for an agent: where the right capability lives, which one to use, and whether it is safe to connect. It builds on the **AI Catalog** standard, both developed under a Linux Foundation working group and published Apache 2.0.

The core is a manifest at `/.well-known/ai-catalog.json`. Each `entries[]` item has a URN `identifier`, a `displayName`, a `mediaType`, and either an inline `data` object or a `url` pointing at the real artefact. The media types tie ARD to the rest of the agent-readiness graph:

| `mediaType` | Points at |
|---|---|
| `application/mcp-server-card+json` | An [MCP server card](/spec/agent-readiness/mcp-and-tool-discovery/) |
| `application/a2a-agent-card+json` | An [A2A agent card](/spec/agent-readiness/a2a-agent-cards/) |
| `application/ai-catalog+json` | A nested catalog |

Beyond the well-known file itself, three mechanisms point agents at it: a `<link rel="ai-catalog">` (also emittable as an HTTP `Link` header); an `Agentmap:` directive in `robots.txt`; and DNS service-binding records `_catalog._agents.<domain>` and `_search._agents.<domain>` — the same `_agents` namespace as [DNS-AID](/spec/agent-readiness/dns-aid/).

## Why it matters

- **One fetch, typed answer.** Instead of guessing at well-known paths one by one, an agent reads a single manifest that names every capability and its media type.
- **Domain-anchored trust.** An optional `trustManifest` (SPIFFE ID, DID, or HTTPS identity, plus attestations and an optional JWS signature) lets a client verify the publisher cryptographically. The signature is a detached JWS over the JCS-canonicalised ([RFC 8785](https://www.rfc-editor.org/rfc/rfc8785)) trust manifest with the `signature` field removed; for an HTTPS identity, the verifier fetches the JWK Set at the identity URL and selects the key by the JWS `kid`.
- **Registry-friendly.** Registries crawl published catalogs and make them searchable, so a capability listed once becomes discoverable across the agentic web.

## How to implement

Publish `/.well-known/ai-catalog.json` with a `specVersion`, a `host` block, and one entry per capability you actually run. Reference your existing MCP and A2A cards by `url` rather than duplicating them. Advertise the manifest with a `link rel`, the `robots.txt` `Agentmap:` directive, and, if you publish DNS, the `_catalog._agents` record. Don't list endpoints you don't offer.

This site ships it: [`/.well-known/ai-catalog.json`](/.well-known/ai-catalog.json) catalogues our MCP server and A2A agent, advertised through the `Link` header, a `link rel`, `robots.txt`, and a `_catalog._agents` DNS record. The host `trustManifest` carries a detached ES256 JWS signature; the public key is published as a JWK Set at [`/.well-known/jwks.json`](/.well-known/jwks.json). We sign offline and commit the signature — the private key never enters CI.

## Common mistakes

- Inventing fields. The entry schema is small — `identifier`, `displayName`, `mediaType`, and exactly one of `url` or `data`.
- A URN publisher segment that doesn't match the `trustManifest` identity domain — verification then fails.
- Listing aspirational capabilities. The catalogue is a contract; only list what resolves.

## Verification

- `curl -s https://example.com/.well-known/ai-catalog.json | jq .` returns valid JSON with `specVersion` and `entries`.
- Each entry `url` resolves to a document of the declared `mediaType`.
- The `Agentmap:` line is present in `robots.txt` and the `ai-catalog` `Link` rel is on the homepage response.
- If a `trustManifest.signature` is present, it verifies: fetch the JWK Set at the `identity` URL, JCS-canonicalise the manifest minus `signature`, and check the detached JWS against the key named by its `kid`.
