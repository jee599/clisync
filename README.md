<p align="center">
  <strong>⚡ llm-configsync</strong>
</p>

<p align="center">
  <strong>Sync all your LLM CLI settings across machines. 6 tools, 1 command.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/llm-configsync"><img src="https://img.shields.io/npm/v/llm-configsync?style=flat-square" alt="npm" /></a>
  <a href="https://github.com/jidonglab/llm-configsync/blob/main/LICENSE"><img src="https://img.shields.io/github/license/jidonglab/llm-configsync?style=flat-square" alt="License" /></a>
  <img src="https://img.shields.io/badge/dependencies-0-brightgreen?style=flat-square" alt="Zero Dependencies" />
</p>

---

New machine. Claude Code, Gemini CLI, Codex all installed — but none of your settings, MCP servers, hooks, or slash commands carried over. You're setting everything up from scratch. Again.

**llm-configsync** backs up all your LLM CLI configs to a private GitHub Gist and restores them anywhere in one command.

```
Machine A                     GitHub Gist              Machine B
                               (private)
~/.claude/*  ─┐                                   ┌─> ~/.claude/*
~/.gemini/*  ─┼── lcs save ──▶  JSON bundle ──▶ lcs load ──┼─> ~/.gemini/*
~/.codex/*   ─┘                                   └─> ~/.codex/*
```

## Install

```bash
npm install -g llm-configsync
```

## Quick Start

```bash
# Machine A — save your settings
lcs init     # paste GitHub token (gist scope only)
lcs save     # done

# Machine B — restore everything
lcs init     # same token
lcs load     # done — all configs restored
```

```
lcs save

  ✓ Claude Code — 5 files, 3.2KB
    .claude/settings.json (436B)
    .claude/mcp_servers.json (812B)
    .claude/CLAUDE.md (1.1KB)
    .claude/hooks/pre-commit.sh (128B)
    .claude/skills/deploy.md (96B)
  ✓ Gemini CLI — 1 file, 320B
    .gemini/settings.json (320B)

  Total: 6 files, 3.5KB
  Settings 2 | MCP 1 | Hooks 1 | Skills 1 | Instructions 1

  ✓ Uploaded to Gist
```

## What Gets Synced

| Tool | Settings | MCP | Hooks | Skills | Instructions |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Claude Code** | ✓ | ✓ | ✓ | ✓ `skills/` | ✓ `CLAUDE.md` |
| **Gemini CLI** | ✓ | ✓ | | | ✓ `GEMINI.md` |
| **OpenAI Codex** | ✓ | | | | ✓ `instructions.md` |
| **Aider** | ✓ | | | | |
| **Continue** | ✓ | | | | |
| **Copilot CLI** | ✓ | | | | |

## Commands

| Command | What it does |
|:---|:---|
| `lcs init` | Set up GitHub token (once per machine) |
| `lcs save` | Upload configs to private Gist |
| `lcs load` | Download and restore configs |
| `lcs list` | Show detected local configs |
| `lcs status` | Show sync status |
| `lcs save --no-redact` | Upload without redacting API keys |
| `lcs load --force` | Overwrite without backups |

## Safety

- **API keys auto-redacted** — OpenAI, Anthropic, Google, GitHub, Slack token patterns detected and masked before upload
- **Private Gist** — only you can see it
- **Backups** — existing files saved as `.bak` before overwriting
- **Zero dependencies** — Node.js 18+ built-in modules only, nothing to audit

## How It Works

```
lcs save:
  ~/.claude/* ──→ scan ──→ redact secrets ──→ JSON bundle ──→ GitHub Gist API
                                                                    │
lcs load:                                                           │
  GitHub Gist API ──→ download ──→ backup existing ──→ write files ─┘
```

No server, no database, no account to create. Just your GitHub token and a private Gist.

## Adding a New Tool

Edit `src/profiles.js`:

```js
{
  name: "My Tool",
  id: "my-tool",
  paths: [
    { rel: ".my-tool/config.json", desc: "Config", cat: "settings" },
    { rel: ".my-tool/plugins/", desc: "Plugins", dir: true, cat: "skills" },
  ],
}
```

> [!TIP]
> PRs welcome for new LLM CLI tools. Just add the config paths.

## License

MIT

---

<p align="center">
  <sub>Built by <a href="https://github.com/jidonglab">jidonglab</a> · Build things with AI</sub>
</p>
