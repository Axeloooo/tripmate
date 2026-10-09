# Vendored skills

These skills are copied from the Claude Code plugins listed below so the repository works without installing the plugins. They are third-party content. Do not edit them here; update them by re-copying from the upstream plugin.

| Skills | Plugin | Source | License |
| --- | --- | --- | --- |
| brainstorming, diagnosing-superpowers, dispatching-parallel-agents, executing-plans, finishing-a-development-branch, receiving-code-review, requesting-code-review, subagent-driven-development, systematic-debugging, test-driven-development, using-git-worktrees, using-superpowers, verification-before-completion, writing-plans, writing-skills | superpowers 6.4.2 | https://github.com/obra/superpowers | MIT, see `licenses/superpowers-MIT-LICENSE` |
| frontend-design | frontend-design | Anthropic plugin | Apache-2.0, see `licenses/frontend-design-Apache-2.0-LICENSE` |
| figma-code-connect, figma-create-new-file, figma-design-to-code, figma-generate-design, figma-generate-diagram, figma-generate-library, figma-generative-plugins, figma-implement-motion, figma-shaders, figma-swiftui, figma-use, figma-use-figjam, figma-use-motion, figma-use-slides | figma 2.2.127 | https://github.com/figma/mcp-server-guide | No license file ships with the plugin. Use is governed by the [Figma Developer Terms](https://www.figma.com/legal/developer-terms/). |
| none | playwright | Microsoft Playwright MCP | The plugin is an MCP server and ships no skills. It stays enabled through `.claude/settings.json`. |

The Figma skills need the Figma MCP server, which is not vendored. The linters, formatters and secret scanner skip this folder.
