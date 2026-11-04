# How to use this agent team

1. Create the repository. Copy this folder's contents into its root (CLAUDE.md, .claude/, docs/).
2. Put the BrandGuard Round 1 proposal and the NimbusDesk Evaluation Pack into docs/research/ as Markdown.
3. **Do not run any coding step until the official build window is open and you have confirmed it.** Planning documents are fine before; product code is not.
4. Open Claude Code in the repo and run /agents to confirm the eight directors loaded.
5. Paste this first command:

> Read CLAUDE.md and everything in docs/. Do not write product code yet. Ask me whether the build window is open. Then have the research scientist and product officer produce their reports in parallel, have the backend architect and AI scientist each draft their design documents, and have the strategy officer score our plan against the official criteria. Challenge weak assumptions, then present the MVP scope, architecture and roadmap for my approval.

## Known limits (verify)
- Nested subagents (directors spawning specialists): older Claude Code documentation says subagents cannot spawn subagents, while at least one newer source says nesting was added. Check https://code.claude.com/docs/en/sub-agents. These files work either way: if nesting is unavailable, the orchestrator launches specialists.
- Tool names and frontmatter options change between versions; use /agents to adjust.
- Subagents are prompts, not independent minds. Independent QA means separate context and separate authority, which still shares model biases; keep your human review.
