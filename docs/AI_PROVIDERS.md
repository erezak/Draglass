# AI provider interfaces · researched 2026-10-06

The adapter boundary is `core/ai/providers.cjs`; orchestration and local persistence are separate in `service.cjs` and `store.cjs`. Reviewed note actions now live in `core/ai/actions.cjs`; provider adapters carry application tool calls while file mutations remain behind review. The renderer receives no API keys and has no network access under its CSP. All provider I/O runs in Electron's main process.

## Primary sources and implementation choices

- [GitHub Copilot CLI programmatic reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-programmatic-reference) and [command reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference): CLI chosen to reuse the installed executable and login without adding a runtime SDK dependency. Prompt supplied on stdin; silent text output, no user questions, nonempty unmatched tool allowlist, separate denial rules for read/write/shell/URL/memory, built-in MCP disabled, custom instructions disabled. No allow-all/autopilot flags. Auto updates are disabled for this invocation. [Tool restrictions](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/allowing-tools) document the availability/permission distinction. The alternative [Copilot SDK](https://github.com/github/copilot-sdk) was reviewed but is not used.
- [Codex non-interactive mode](https://developers.openai.com/codex/noninteractive) and [configuration reference](https://developers.openai.com/codex/config-reference): `exec --json`, ephemeral session, explicit read-only sandbox, no shell/unified exec, disabled web search, no user config, stdin prompt. Parse completed `agent_message` items; other events are not shown as answers. Existing CLI authentication is reused. CLI custom model provider configuration is intentionally not loaded; use the API adapter for custom gateways.
- [OpenCode CLI](https://opencode.ai/docs/cli), [configuration](https://opencode.ai/docs/config/), and [permissions](https://opencode.ai/docs/permissions/): `run --format json --agent draglass-chat`, a dedicated primary agent and runtime config denying every permission, no autoupdate. Parse `text` events' `part.text`. [Official implementation](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/cli/cmd/run.ts) confirms piped stdin input and text-event shape. Existing provider credentials/model config remain available. Organization-managed settings can override runtime config; native enterprise validation is required.
- [OpenAI Chat Completions](https://platform.openai.com/docs/api-reference/chat/create): model/messages/stream POST with optional bearer key, SSE text deltas. This is a protocol connection, so any compatible vendor can be configured rather than hardcoding a model catalog.
- [LiteLLM proxy client examples](https://docs.litellm.ai/docs/proxy/user_keys): gateway base URL, gateway model alias and bearer key work through the compatible adapter.
- [Anthropic API overview](https://platform.claude.com/docs/en/api/overview) and [streaming](https://platform.claude.com/docs/en/build-with-claude/streaming): Messages protocol with system separate from messages, version/key headers, max_tokens and text deltas.

Normal conversations start with note reference paths and bounded history. Application tools retrieve sections on demand; the host validates arguments, caps results and enforces a total per-request context budget. Propose changes tools stage revisions for separate user review. See ARCHITECTURE.md for the tool, revision and budget contracts. The entity-template draft flow remains an explicitly selected-context proposal, constrained by the same total input guard. CLI permissions add restrictions beyond the prompt. This is not an OS security boundary for arbitrary manually configured executables or administrator-modified CLI configuration. Use trusted installed CLIs.

- [Electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage): OS encryption for persisted keys; Linux basic_text is rejected in favor of session-only keys. Native Keychain/DPAPI/keyring validation remains required.

## Native verification

The automated tests use fake transports and CLIs; they do not verify subscription access or real accounts. On macOS, Windows and Linux:

1. Open Settings and check CLI detection, including launching the app from the dock/menu rather than a terminal. Use the executable override if necessary.
2. Sign in in your terminal with each CLI; chat with a simple note and confirm response/model errors are actionable. Check recent CLI versions accept every flag.
3. Try a gateway API connection, keyless local server, direct OpenAI and Anthropic. Confirm tool calls, authentication errors, Stop, timeout and proxy certificate configuration in your environment.
4. Mention a second note. Edit the first note then send immediately and ask the model to read it. Confirm the response uses the current draft. Switch tabs during generation and check the conversation stays on the original note.
5. In Discuss mode, ask for a write/delete or external tool and verify files remain unchanged. In Propose changes mode, verify generation leaves files unchanged, then review an edit/create proposal and accept one note. Verify stale snapshots are blocked. Check any enterprise-managed OpenCode configuration.
6. Restart and verify settings, keys and conversations. On Linux with no secure key backend, verify session-only key behavior.
7. On Windows, test native .exe CLIs and npm .cmd launchers. Standard npm Node shims are resolved to their JS entrypoint without a shell; other .cmd wrappers require an executable override.

No provider accounts, credentials, native CLI binaries or graphical runtime were available in the creation environment. OS login/keychain behavior, real provider calls, CLI version compatibility, Windows process cancellation and native renderer interaction remain unverified.

## 0.4.1 compatibility correction

Inspected the official `@github/copilot@0.0.420` npm package. Its permission parser accepts a single `Kind(argument)` pattern, rejecting the previous comma-separated denial argument. Its argument normalization also filters empty tool names and turns an empty allowlist into an unspecified filter. Each denial is now its own repeated flag; `draglass_chat_no_tools` keeps the allowlist nonempty while matching no tool. Unknown allowlisted tool names produce a configuration warning in this version rather than enabling tools.

A real 0.0.420 CLI invocation with the original arguments exited 1 before authentication and supplied no stderr; with the corrected arguments it reached authentication and returned `No authentication information found`, as expected in this environment without an account. This verifies startup argument handling, not a signed-in model response. The downloaded native 1.0.92 binary could print its version but failed with SIGBUS even on --help in this environment, so it was not used as evidence of compatibility. No CLI packages were added to Draglass dependencies.

macOS branding follows [Electron application packaging](https://www.electronjs.org/docs/latest/tutorial/application-distribution/). [app.setName](https://www.electronjs.org/docs/latest/api/app/) affects Electron's internal name and does not change the OS bundle name. Development starts use a private branded bundle copy; native menu rendering and ad-hoc signing still need validation on a Mac.

## Protocols and custom HTTP headers · 0.12.1

OpenAI-compatible/LiteLLM connections choose Chat Completions (`/v1/chat/completions`) or Responses (`/v1/responses`). Existing connections default to Chat Completions. Recognized full endpoint paths are preserved or adapted to the selected protocol; custom base paths retain their prefix. Responses sends instructions separately, includes conversation history and current prompt as input, sets `store: false`, and handles typed text delta/completion events plus JSON message output. Reasoning is not shown as answer text. The tool adapter executes only validated Draglass application tool requests; built-in CLI tools remain disabled. Failed, incomplete and truncated responses fail without persisting an answer or proposal. The existing proposal validation/diff/acceptance workflow is shared by both protocols.

API connections accept up to 50 custom headers. Names are case-insensitively unique, HTTP-token validated and cannot replace transport-controlled headers such as Host, Content-Length or Connection. Values reject CR/LF/control injection, with 8 KB per value and 64 KB total limits. Values are masked in Settings; ordinary Settings responses contain only names and a saved-value indicator. All header values are encrypted with OS safeStorage, with session-only fallback when unavailable. Existing values can be retained, renamed, replaced or removed. A value is required for a new header; blank saved values retain the previous value. Request headers override matching auth/protocol defaults, including Authorization and x-api-key, case-insensitively. HTTP errors never include a provider's response body. Redirects remain disabled.

Primary Responses sources checked 2026-10-07:
- https://developers.openai.com/api/docs/guides/streaming-responses
- https://developers.openai.com/api/docs/guides/migrate-to-responses
- https://developers.openai.com/api/reference/resources/responses/streaming-events

Native gateway/provider access remains unverified; a server must implement the selected protocol.

## Ontology and date tools · 0.23.1

All existing native API tool adapters and CLI envelopes expose `inspect_ontology`; it works without a vault. With a vault, `find_notes_by_date` adds paginated date-filtered references. Tool descriptions are compact, and definitions/results count toward every request’s context budget. Schema lookup is not note evidence and cannot grant write access. Date-only ranges use inclusive UTC days; filesystem time, named YAML properties and filename dates are separate choices.

## Device clock tool · 0.23.2

`get_current_time` works through the same native API and CLI envelopes as other application tools. It needs no vault, credentials or additional network connection. The device supplies time; Intl supplies local timezone and daylight-saving offsets. Optional time_zone selects another IANA zone or UTC. Instructions request a fresh read for relative/current dates on each user turn, and clock results remain under the request context cap.

## Component boundary · 0.23.4

`core/ai/tools/` owns application schemas, validation, capability gating, per-result bounds and execution. `vault-agent.cjs` manages model turns/context budgets through its session API. `providers.cjs` and `tool-provider.cjs` only adapt the model transport. Both native function calls and CLI JSON envelopes execute through the same active tool session. Tool sessions receive no provider credentials or direct file-write capability.
