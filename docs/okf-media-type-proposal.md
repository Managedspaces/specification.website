# Draft proposal: a blessed media type for OKF bundles

Status: **filed.**

- OKF spec (define/register the type): GoogleCloudPlatform/knowledge-catalog#111
  — <https://github.com/GoogleCloudPlatform/knowledge-catalog/issues/111>
- ARD layer (recognise it in the AI Catalog): ards-project/ard-spec#27
  — <https://github.com/ards-project/ard-spec/issues/27>

## Problem

OKF defines a bundle's *structure* but deliberately leaves *serving and
discovery* out of scope. ARD's AI Catalog solves discovery — a publisher lists
an entry pointing at the bundle artefact — but an entry is keyed by an **IANA
media type** (`mediaType` / `type`). There is no registered media type for an
OKF bundle, so a consumer can *find* the artefact but cannot *recognise* it as
OKF without sniffing the contents. Every publisher therefore invents an interim
type, and they will not agree.

We ship this today on specification.website using the interim, unregistered
constant **`application/okf-bundle+gzip`** (our bundle is a gzipped tar). It is
declared once and documented as interim so adoption of a blessed type is a
one-line change.

## Proposal

Define and (eventually) register media types for an OKF bundle artefact:

- `application/okf-bundle` — an OKF bundle, packaging-agnostic.
- `application/okf-bundle+gzip` — a gzipped tar of the bundle tree.
- `application/okf-bundle+zip` — a zip of the bundle tree.

A consumer that recognises any of these knows the artefact is an OKF concept
tree and can ingest it per the OKF spec (`index.md` progressive disclosure,
per-file `type` front matter, `log.md`, `references/`).

### Worked example (real, resolvable)

```json
{
  "identifier": "urn:ai:specification.website:bundle:okf",
  "displayName": "The Website Specification — OKF bundle",
  "type": "application/okf-bundle+gzip",
  "mediaType": "application/okf-bundle+gzip",
  "url": "https://specification.website/okf.tar.gz"
}
```

Browsable tree: <https://specification.website/okf/index.md>.
Tarball: <https://specification.website/okf.tar.gz>.

## Notes

- Keep `+gzip` / `+zip` structured suffixes so the compression is explicit;
  fall back to `application/okf-bundle` when packaging is irrelevant.
- Until something is blessed, the interim constant stays in one place
  (`public/.well-known/ai-catalog.json`, mirrored in the spec page prose) so
  swapping it is trivial.
