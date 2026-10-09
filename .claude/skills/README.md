# Vendored skills

These skills are copied from the Claude Code plugins listed below so the repository works without installing the plugins. They are third-party content. Do not edit them here; update them by re-copying from the upstream plugin.

| Skills | Plugin | Source | License |
| --- | --- | --- | --- |
| brainstorming, diagnosing-superpowers, dispatching-parallel-agents, executing-plans, finishing-a-development-branch, receiving-code-review, requesting-code-review, subagent-driven-development, systematic-debugging, test-driven-development, using-git-worktrees, using-superpowers, verification-before-completion, writing-plans, writing-skills | superpowers 6.4.2 | https://github.com/obra/superpowers | MIT, see `licenses/superpowers-MIT-LICENSE` |
| frontend-design | frontend-design | Anthropic plugin | Apache-2.0, see `licenses/frontend-design-Apache-2.0-LICENSE` |
| none | playwright | Microsoft Playwright MCP | The plugin is an MCP server and ships no skills. It stays enabled through `.claude/settings.json`. |

The Figma plugin's skills are left out for now because the plugin ships no license file (it falls under the Figma Developer Terms). Add them back once redistribution is confirmed. The linters, formatters and secret scanner skip this folder.
