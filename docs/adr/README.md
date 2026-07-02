# Architecture Decision Records

This directory holds ADRs for the Plant Identifier PWA project.

## Index

- [ADR 0001 — PlantNet Proxy & API Key Boundary](./0001-plantnet-proxy.md) — locks in Firebase Functions as the single boundary for Pl@ntNet and MiMo calls, with caching and quota accounting.

## Conventions

- File name: `NNNN-kebab-case-title.md`
- Status values: `Proposed`, `Accepted`, `Superseded`, `Deprecated`
- ADRs are immutable once `Accepted`. To change a decision, write a new ADR that supersedes the old one (link it via the new ADR's header).