# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).


## [Unreleased]


## [0.1.0] - 2026-08-26

### Added
- Initial `@h1deya/langchain-google-ex` package for `@langchain/google`.
- Add `ChatGoogleEx`, a drop-in replacement for `ChatGoogle` that transforms MCP tool
  schemas for Gemini compatibility during `bindTools()`.
- Add schema normalization for unsupported Gemini function-calling schema constructs,
  including invalid `required` fields, unsupported formats, type arrays, unresolved refs,
  and exclusive numeric bounds.
- Add simple smoke test plus MCP integration test scripts for combined and individual
  server scenarios.

### Changed
- Base the package on LangChain's newer `@langchain/google` package instead of
  `@langchain/google-genai`.
- Require Node.js 20+ to align with the current LangChain.js package family.

### Fixed
- Run `mcp-server-fetch==2025.4.7` integration tests with `mcp<2` to avoid the MCP SDK
  2.x exception class rename breakage.
