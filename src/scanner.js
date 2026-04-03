import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import { PROFILES, abs } from "./profiles.js";

// ─── Secret redaction patterns (ordered: specific before generic) ────
const SECRET_PATTERNS = [
  // Anthropic
  /sk-ant-[a-zA-Z0-9_-]{20,}/g,
  // OpenAI
  /sk-proj-[a-zA-Z0-9_-]{20,}/g,
  /sk-[a-zA-Z0-9_-]{20,}/g,
  // Google
  /AIza[a-zA-Z0-9_-]{30,}/g,
  // AWS
  /AKIA[A-Z0-9]{16}/g,
  // GitHub
  /ghp_[a-zA-Z0-9]{36}/g,
  /gho_[a-zA-Z0-9]{36}/g,
  /github_pat_[a-zA-Z0-9_]{22,}/g,
  // GitLab
  /glpat-[a-zA-Z0-9_-]{20,}/g,
  // HuggingFace
  /hf_[a-zA-Z0-9]{34,}/g,
  // Slack
  /xoxb-[a-zA-Z0-9-]+/g,
  /xoxp-[a-zA-Z0-9-]+/g,
  // Replicate
  /r8_[a-zA-Z0-9]{40}/g,
  // Vercel
  /vercel_[a-zA-Z0-9_-]{20,}/g,
  // Supabase
  /sbp_[a-zA-Z0-9]{40,}/g,
  // Generic key-value patterns in JSON/YAML configs
  /(?<="(?:api[_-]?key|api[_-]?secret|secret[_-]?key|access[_-]?token|auth[_-]?token|bearer|password|credential)"\s*:\s*")[^"]{8,}/gi,
  /(?<=(?:api[_-]?key|api[_-]?secret|secret[_-]?key|access[_-]?token|auth[_-]?token|password)\s*[:=]\s*)[^\s,;"']{8,}/gi,
];

function redact(content) {
  let result = content;
  for (const p of SECRET_PATTERNS) {
    result = result.replace(p, "__REDACTED__");
  }
  return result;
}

// ─── File/dir skip rules ─────────────────────────────────
const SKIP_EXTENSIONS = new Set([
  ".bak", ".tmp", ".log", ".sqlite", ".sqlite-wal", ".sqlite-shm",
  ".sqlite-journal", ".db", ".pb", ".lock", ".swp", ".swo",
  ".exe", ".dll", ".so", ".dylib", ".pem", ".key", ".p12",
]);

const SKIP_NAMES = new Set([
  ".DS_Store", "Thumbs.db", "desktop.ini",
  "auth.json", "credentials.json", "tokens.json",
  ".credentials.json", ".env", ".env.local",
]);

const SKIP_DIRS = new Set([
  "node_modules", ".git", "cache", "Cache",
  "sessions", "session-env", "debug", "log", "logs",
  "telemetry", "statsig", "backups", "file-history",
  "paste-cache", "shell-snapshots", "stats-cache.json",
  "data", ".sandbox", ".sandbox-bin", ".sandbox-secrets",
]);

const MAX_FILE_SIZE = 1024 * 1024; // 1 MB
const MAX_DEPTH = 10;

function shouldSkipFile(name) {
  if (SKIP_NAMES.has(name)) return true;
  if (name.endsWith("~")) return true;
  const dotIdx = name.lastIndexOf(".");
  if (dotIdx > 0) {
    const ext = name.slice(dotIdx);
    if (SKIP_EXTENSIONS.has(ext)) return true;
    // Also catch compound extensions like .sqlite-wal
    const dashIdx = ext.indexOf("-");
    if (dashIdx > 0 && SKIP_EXTENSIONS.has(ext.slice(0, dashIdx))) return true;
  }
  return false;
}

// Normalize rel paths to always use forward slashes (cross-platform)
function posixRel(base, name) {
  return base + "/" + name;
}

function readDir(dirPath, baseRel, cat, depth = 0) {
  const out = [];
  if (depth > MAX_DEPTH) return out;
  if (!existsSync(dirPath)) return out;

  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = join(dirPath, entry.name);
      const rel = posixRel(baseRel, entry.name);
      out.push(...readDir(full, rel, cat, depth + 1));
    } else {
      if (shouldSkipFile(entry.name)) continue;
      const full = join(dirPath, entry.name);

      // Size guard
      try {
        const st = statSync(full);
        if (st.size > MAX_FILE_SIZE || st.size === 0) continue;
      } catch { continue; }

      // Read and verify text content (skip binary)
      try {
        const content = readFileSync(full, "utf-8");
        if (content.includes("\0")) continue; // binary detection
        const rel = posixRel(baseRel, entry.name);
        out.push({ rel, absPath: full, content, cat });
      } catch { /* skip unreadable */ }
    }
  }
  return out;
}

// Returns [{ profile, files: [{ rel, absPath, content, cat }] }]
export function scan() {
  const results = [];
  for (const profile of PROFILES) {
    const files = [];
    for (const p of profile.paths) {
      const absPath = abs(p.rel);
      if (!existsSync(absPath)) continue;
      if (p.dir) {
        files.push(...readDir(absPath, p.rel, p.cat || "etc"));
      } else {
        try {
          const st = statSync(absPath);
          if (st.size > MAX_FILE_SIZE || st.size === 0) continue;
          const content = readFileSync(absPath, "utf-8");
          if (content.includes("\0")) continue;
          files.push({ rel: p.rel, absPath, content, cat: p.cat || "etc" });
        } catch { /* skip */ }
      }
    }
    if (files.length > 0) {
      results.push({ profile, files });
    }
  }
  return results;
}

// Collect files into { rel: content } map for upload
export function collectFiles(scanResults, { skipRedact = false } = {}) {
  const map = {};
  for (const { files } of scanResults) {
    for (const f of files) {
      map[f.rel] = skipRedact ? f.content : redact(f.content);
    }
  }
  return map;
}
