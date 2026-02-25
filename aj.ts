#!/usr/bin/env node
import { Command } from "commander";
import { execSync } from "child_process";
import { createHash, randomUUID } from "crypto";
import {
  readFileSync, writeFileSync, statSync, readdirSync,
  existsSync, watch as fsWatch, createReadStream,
} from "fs";
import { join, resolve, relative, extname } from "path";
import { networkInterfaces } from "os";
import { createServer } from "http";

const program = new Command();

// ANSI colors bina kisi dependency ke
const c = {
  r: (s: string) => `\x1b[31m${s}\x1b[0m`,
  g: (s: string) => `\x1b[32m${s}\x1b[0m`,
  y: (s: string) => `\x1b[33m${s}\x1b[0m`,
  b: (s: string) => `\x1b[34m${s}\x1b[0m`,
  m: (s: string) => `\x1b[35m${s}\x1b[0m`,
  cy: (s: string) => `\x1b[36m${s}\x1b[0m`,
  d: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

program
  .name("aj")
  .version("2.0.0")
  .description("AJ — developer swiss-army knife CLI");

// ─── IP: public + local IP ───
program
  .command("ip")
  .description("Public + local IP dikhao")
  .option("-p, --public", "Sirf public IP")
  .option("-l, --local", "Sirf local IP")
  .action(async (opts: { public?: boolean; local?: boolean }) => {
    if (!opts.public) {
      const nets = networkInterfaces();
      console.log(c.bold("Local IPs:"));
      for (const [name, addrs] of Object.entries(nets)) {
        for (const addr of addrs || []) {
          if (addr.family === "IPv4" && !addr.internal)
            console.log(`  ${c.cy(name)}: ${c.g(addr.address)}`);
        }
      }
    }
    if (!opts.local) {
      try {
        const res = await fetch("https://api.ipify.org?format=json");
        const data: any = await res.json();
        console.log(`${c.bold("Public IP:")} ${c.g(data.ip)}`);
      } catch {
        console.error(c.r("Public IP fetch fail — net check karo"));
      }
    }
  });

// ─── PORT: check / kill process on port ───
program
  .command("port <number>")
  .description("Port pe kya chal raha check / kill karo")
  .option("-k, --kill", "Process kill karo")
  .action((port: string, opts: { kill?: boolean }) => {
    try {
      const out = execSync(`lsof -i :${port} -P -n`, { encoding: "utf-8" });
      console.log(c.bold(`Port ${port}:`));
      console.log(out);
      if (opts.kill) {
        execSync(`lsof -ti :${port} | xargs kill -9`);
        console.log(c.g(`✓ Port ${port} ka process maara`));
      }
    } catch {
      console.log(c.g(`Port ${port} free hai`));
    }
  });

// ─── SERVE: quick static file server ───
program
  .command("serve [dir]")
  .description("Instant static file server")
  .option("-p, --port <port>", "Port", "3000")
  .action((dir: string = ".", opts: { port: string }) => {
    const root = resolve(dir);
    const mime: Record<string, string> = {
      ".html": "text/html", ".css": "text/css", ".js": "application/javascript",
      ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
      ".gif": "image/gif", ".svg": "image/svg+xml", ".ico": "image/x-icon",
      ".pdf": "application/pdf", ".txt": "text/plain", ".woff2": "font/woff2",
      ".mp4": "video/mp4", ".webp": "image/webp", ".wasm": "application/wasm",
    };
    const server = createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url || "/");
      let filePath = join(root, urlPath === "/" ? "index.html" : urlPath);
      try {
        const stat = statSync(filePath);
        if (stat.isDirectory()) {
          const indexPath = join(filePath, "index.html");
          if (existsSync(indexPath)) {
            filePath = indexPath;
          } else {
            const files = readdirSync(filePath);
            const html = `<html><head><title>${urlPath}</title><style>body{font-family:monospace;padding:2rem}a{display:block;padding:4px 0}</style></head><body><h2>📁 ${urlPath}</h2>${files.map(f => `<a href="${join(urlPath, f)}">${statSync(join(filePath, f)).isDirectory() ? "📁 " : "📄 "}${f}</a>`).join("")}</body></html>`;
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(html);
            console.log(`  ${c.g("200")} ${c.d(urlPath)}`);
            return;
          }
        }
        const ext = extname(filePath);
        res.writeHead(200, {
          "Content-Type": mime[ext] || "application/octet-stream",
          "Content-Length": statSync(filePath).size,
        });
        createReadStream(filePath).pipe(res);
        console.log(`  ${c.g("200")} ${c.d(urlPath)}`);
      } catch {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found");
        console.log(`  ${c.r("404")} ${c.d(urlPath)}`);
      }
    });
    server.listen(parseInt(opts.port), () => {
      console.log(c.g(`⚡ http://localhost:${opts.port}`));
      console.log(c.d(`   root: ${root}`));
    });
  });

// ─── JSON: prettify / validate / minify ───
program
  .command("json <file>")
  .description("JSON prettify / validate / minify")
  .option("-m, --minify", "Minify karo")
  .option("-v, --validate", "Sirf validate karo")
  .option("-q, --query <path>", "Dot-path se value nikalo (e.g. scripts.build)")
  .action((file: string, opts: { minify?: boolean; validate?: boolean; query?: string }) => {
    try {
      const parsed = JSON.parse(readFileSync(file, "utf-8"));
      if (opts.validate) { console.log(c.g("✓ Valid JSON")); return; }
      if (opts.query) {
        const val = opts.query.split(".").reduce((o: any, k) => o?.[k], parsed);
        console.log(typeof val === "object" ? JSON.stringify(val, null, 2) : val);
        return;
      }
      console.log(opts.minify ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2));
    } catch (e: any) {
      console.error(c.r(`✗ Invalid: ${e.message}`));
      process.exit(1);
    }
  });

// ─── ENCODE / DECODE ───
program
  .command("encode <string>")
  .description("Base64 / URL encode")
  .option("-u, --url", "URL encode (default: base64)")
  .action((str: string, opts: { url?: boolean }) => {
    console.log(opts.url ? encodeURIComponent(str) : Buffer.from(str).toString("base64"));
  });

program
  .command("decode <string>")
  .description("Base64 / URL decode")
  .option("-u, --url", "URL decode (default: base64)")
  .action((str: string, opts: { url?: boolean }) => {
    try {
      console.log(opts.url ? decodeURIComponent(str) : Buffer.from(str, "base64").toString("utf-8"));
    } catch { console.error(c.r("Decode fail — input check karo")); }
  });

// ─── HASH: md5, sha256, sha512 for strings & files ───
program
  .command("hash <input>")
  .description("Hash generate karo (string ya file)")
  .option("-a, --algo <algo>", "md5 | sha256 | sha512", "sha256")
  .option("-f, --file", "Input ek file hai")
  .action((input: string, opts: { algo: string; file?: boolean }) => {
    const data = opts.file ? readFileSync(resolve(input)) : input;
    console.log(`${c.d(opts.algo + ":")} ${c.g(createHash(opts.algo).update(data).digest("hex"))}`);
  });

// ─── UUID ───
program
  .command("uuid")
  .description("UUID v4 generate karo")
  .option("-n, --count <n>", "Kitne chahiye", "1")
  .action((opts: { count: string }) => {
    for (let i = 0; i < parseInt(opts.count); i++) console.log(randomUUID());
  });

// ─── HTTP: mini-curl with pretty output ───
program
  .command("http <url>")
  .description("Quick HTTP request — pretty printed")
  .option("-m, --method <method>", "HTTP method", "GET")
  .option("-d, --data <body>", "Request body (JSON)")
  .option("-H, --header <h...>", "Headers key:value")
  .option("--head", "Sirf response headers")
  .action(async (url: string, opts: { method: string; data?: string; header?: string[]; head?: boolean }) => {
    const headers: Record<string, string> = { "User-Agent": "aj-cli/2.0" };
    if (opts.header) opts.header.forEach(h => {
      const [k, ...v] = h.split(":"); headers[k.trim()] = v.join(":").trim();
    });
    if (opts.data) headers["Content-Type"] = "application/json";
    const fullUrl = /^https?:\/\//.test(url) ? url : `https://${url}`;
    const t = Date.now();
    try {
      const res = await fetch(fullUrl, {
        method: opts.method.toUpperCase(), headers, body: opts.data || undefined,
      });
      const ms = Date.now() - t;
      const sc = res.status < 300 ? c.g : res.status < 400 ? c.y : c.r;
      console.log(`${sc(`${res.status} ${res.statusText}`)} ${c.d(`${ms}ms`)}`);
      if (opts.head) { res.headers.forEach((v, k) => console.log(`  ${c.cy(k)}: ${v}`)); return; }
      const body = await res.text();
      try { console.log(JSON.stringify(JSON.parse(body), null, 2)); }
      catch {
        console.log(body.substring(0, 3000));
        if (body.length > 3000) console.log(c.d(`\n... ${body.length - 3000} chars truncated`));
      }
    } catch (e: any) { console.error(c.r(`Fail: ${e.message}`)); }
  });

// ─── SIZE: file / directory size ───
program
  .command("size <path>")
  .description("File / folder ka size")
  .action((p: string) => {
    const getSize = (fp: string): number => {
      const s = statSync(fp);
      if (s.isFile()) return s.size;
      return readdirSync(fp).reduce((a, f) => {
        try { return a + getSize(join(fp, f)); } catch { return a; }
      }, 0);
    };
    const fmt = (b: number) => {
      const u = ["B", "KB", "MB", "GB"];
      let i = 0, s = b;
      while (s >= 1024 && i < u.length - 1) { s /= 1024; i++; }
      return `${s.toFixed(2)} ${u[i]}`;
    };
    try { console.log(`${c.bold(p)}: ${c.g(fmt(getSize(resolve(p))))}`); }
    catch { console.error(c.r("Path exist nahi karta")); }
  });

// ─── FIND: recursive file search ───
program
  .command("find <pattern> [dir]")
  .description("Files dhundho regex pattern se")
  .option("-t, --type <type>", "f = files only, d = dirs only")
  .action((pattern: string, dir: string = ".", opts: { type?: string }) => {
    const rx = new RegExp(pattern, "i");
    const results: string[] = [];
    const skip = new Set(["node_modules", ".git", "dist", ".next", "__pycache__", ".cache"]);
    const walk = (d: string) => {
      try {
        for (const f of readdirSync(d)) {
          if (skip.has(f)) continue;
          const full = join(d, f);
          const s = statSync(full);
          if (rx.test(f)) {
            if (opts.type === "f" && s.isFile()) results.push(full);
            else if (opts.type === "d" && s.isDirectory()) results.push(full);
            else if (!opts.type) results.push(full);
          }
          if (s.isDirectory()) walk(full);
        }
      } catch {}
    };
    walk(resolve(dir));
    if (results.length) results.forEach(r => console.log(c.cy(relative(process.cwd(), r))));
    else console.log(c.y("Kuch nahi mila"));
  });

// ─── CLEAN: remove build artifacts ───
program
  .command("clean [dir]")
  .description("Build artifacts clean karo")
  .option("-d, --dry-run", "Sirf dikhao, delete nahi")
  .action((dir: string = ".", opts: { dryRun?: boolean }) => {
    const targets = ["node_modules", "dist", ".cache", ".parcel-cache", "build", ".next", ".nuxt", "coverage", "__pycache__", ".turbo", ".vercel"];
    const root = resolve(dir);
    let found = false;
    for (const t of targets) {
      const p = join(root, t);
      if (existsSync(p)) {
        found = true;
        const sz = (() => {
          try {
            const out = execSync(`du -sh "${p}" 2>/dev/null`, { encoding: "utf-8" });
            return out.split("\t")[0].trim();
          } catch { return ""; }
        })();
        if (opts.dryRun) {
          console.log(c.y(`  Would delete: ${t} ${sz ? c.d(`(${sz})`) : ""}`));
        } else {
          execSync(`rm -rf "${p}"`);
          console.log(c.g(`  ✓ Deleted: ${t} ${sz ? c.d(`(${sz})`) : ""}`));
        }
      }
    }
    if (!found) console.log(c.g("Already clean hai"));
  });

// ─── ENV: .env file manager ───
program
  .command("env [file]")
  .description(".env file read / write / list")
  .option("-g, --get <key>", "Ek key ka value")
  .option("-s, --set <pair>", "KEY=VALUE set karo")
  .option("-d, --del <key>", "Key delete karo")
  .action((file: string = ".env", opts: { get?: string; set?: string; del?: string }) => {
    const envPath = resolve(file);

    if (opts.set) {
      const [key, ...val] = opts.set.split("=");
      const value = val.join("=");
      let content = existsSync(envPath) ? readFileSync(envPath, "utf-8") : "";
      const rx = new RegExp(`^${key}=.*$`, "m");
      content = rx.test(content) ? content.replace(rx, `${key}=${value}`) : content + `\n${key}=${value}`;
      writeFileSync(envPath, content.trim() + "\n");
      console.log(c.g(`✓ ${key}=${value}`));
      return;
    }

    if (opts.del) {
      if (!existsSync(envPath)) { console.error(c.r(".env nahi mila")); return; }
      let content = readFileSync(envPath, "utf-8");
      content = content.split("\n").filter(l => !l.startsWith(opts.del + "=")).join("\n");
      writeFileSync(envPath, content.trim() + "\n");
      console.log(c.g(`✓ ${opts.del} removed`));
      return;
    }

    if (!existsSync(envPath)) { console.error(c.r(".env nahi mila")); return; }
    const lines = readFileSync(envPath, "utf-8").split("\n").filter(l => l.trim() && !l.startsWith("#"));

    if (opts.get) {
      const line = lines.find(l => l.startsWith(opts.get + "="));
      console.log(line ? line.split("=").slice(1).join("=") : c.r("Key nahi mili"));
      return;
    }

    for (const line of lines) {
      const [k, ...v] = line.split("=");
      // partial mask for security
      const val = v.join("=");
      const masked = val.length > 6 ? val.slice(0, 3) + "•".repeat(val.length - 3) : val;
      console.log(`  ${c.cy(k)} = ${c.d(masked)}`);
    }
  });

// ─── GEN: password generator ───
program
  .command("gen [length]")
  .description("Secure password / PIN generate karo")
  .option("-n, --count <n>", "Kitne generate kare", "1")
  .option("-s, --simple", "No special chars")
  .option("--pin <digits>", "Numeric PIN")
  .action((length: string = "16", opts: { count: string; simple?: boolean; pin?: string }) => {
    if (opts.pin) {
      const d = parseInt(opts.pin);
      for (let i = 0; i < parseInt(opts.count); i++)
        console.log(Array.from({ length: d }, () => Math.floor(Math.random() * 10)).join(""));
      return;
    }
    const len = parseInt(length);
    const chars = opts.simple
      ? "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
      : "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*_+-=~";
    for (let i = 0; i < parseInt(opts.count); i++)
      console.log(Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join(""));
  });

// ─── WATCH: file watcher + auto-run ───
program
  .command("watch <path> <cmd>")
  .description("File change pe command auto-run")
  .action((watchPath: string, cmd: string) => {
    console.log(c.d(`👀 Watching: ${watchPath} → "${cmd}"`));
    let timeout: NodeJS.Timeout;
    // debounce se rapid fire nahi hoga
    fsWatch(resolve(watchPath), { recursive: true }, (_event, filename) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        console.log(c.y(`\n⟳ ${filename}`));
        try {
          console.log(execSync(cmd, { encoding: "utf-8", stdio: "pipe" }));
        } catch (e: any) { console.error(c.r(e.stdout || e.message)); }
      }, 300);
    });
  });

// ─── DIFF: compare two files ───
program
  .command("diff <file1> <file2>")
  .description("Do files ka diff dikhao")
  .action((f1: string, f2: string) => {
    try {
      const out = execSync(`diff --color=always "${f1}" "${f2}"`, { encoding: "utf-8" });
      console.log(out || c.g("Files identical hai"));
    } catch (e: any) {
      if (e.stdout) console.log(e.stdout);
      else console.error(c.r(e.message));
    }
  });

// ─── GITINFO: quick git summary ───
program
  .command("gitinfo")
  .description("Git repo ka quick status")
  .action(() => {
    const run = (cmd: string) => { try { return execSync(cmd, { encoding: "utf-8", stdio: "pipe" }).trim(); } catch { return ""; } };
    const branch = run("git branch --show-current");
    if (!branch) { console.error(c.r("Git repo nahi hai yahan")); return; }
    console.log(`${c.bold("Branch:")}  ${c.g(branch)}`);
    console.log(`${c.bold("Commit:")}  ${c.cy(run("git log -1 --oneline"))}`);
    console.log(`${c.bold("Remote:")}  ${run("git remote get-url origin")}`);
    const ahead = run("git rev-list --count @{u}..HEAD 2>/dev/null");
    const behind = run("git rev-list --count HEAD..@{u} 2>/dev/null");
    if (ahead || behind) console.log(`${c.bold("Sync:")}    ${c.g(`↑${ahead || 0}`)} ${c.r(`↓${behind || 0}`)}`);
    const status = run("git status --short");
    if (status) {
      console.log(c.bold("Changes:"));
      status.split("\n").forEach(l => {
        const col = l.startsWith(" M") || l.startsWith("M") ? c.y : l.startsWith("?") ? c.r : c.g;
        console.log(`  ${col(l)}`);
      });
    } else console.log(c.g("Clean working tree ✓"));
    const stashes = run("git stash list | wc -l").trim();
    if (stashes && stashes !== "0") console.log(`${c.bold("Stashes:")} ${c.y(stashes)}`);
  });

// ─── DEPS: package.json analyzer ───
program
  .command("deps")
  .description("Dependencies overview + outdated check")
  .option("-o, --outdated", "Outdated packages dikhao")
  .action((opts: { outdated?: boolean }) => {
    try {
      const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
      if (!opts.outdated) {
        const deps = pkg.dependencies || {};
        const dev = pkg.devDependencies || {};
        const total = Object.keys(deps).length + Object.keys(dev).length;
        console.log(c.bold(`${pkg.name || "unknown"} — ${total} packages\n`));
        if (Object.keys(deps).length) {
          console.log(c.bold("prod:"));
          Object.entries(deps).forEach(([k, v]) => console.log(`  ${c.cy(k)} ${c.d(v as string)}`));
        }
        if (Object.keys(dev).length) {
          console.log(c.bold("dev:"));
          Object.entries(dev).forEach(([k, v]) => console.log(`  ${c.d(k)} ${c.d(v as string)}`));
        }
      } else {
        console.log(c.d("Checking..."));
        try {
          execSync("npm outdated --json 2>/dev/null", { encoding: "utf-8" });
          console.log(c.g("Sab up to date hai ✓"));
        } catch (e: any) {
          if (e.stdout) {
            const o = JSON.parse(e.stdout || "{}");
            if (!Object.keys(o).length) { console.log(c.g("Sab up to date ✓")); return; }
            Object.entries(o).forEach(([p, i]: [string, any]) =>
              console.log(`  ${c.cy(p)}: ${c.r(i.current)} → ${c.g(i.latest)}`)
            );
          }
        }
      }
    } catch { console.error(c.r("package.json nahi mila")); }
  });

// ─── REPLACE: find & replace in files ───
program
  .command("replace <search> <replacement> <glob>")
  .description("Files mein find & replace karo")
  .option("-d, --dry-run", "Sirf matches dikhao")
  .action((search: string, replacement: string, glob: string, opts: { dryRun?: boolean }) => {
    const rx = new RegExp(search, "g");
    let totalMatches = 0;
    const walk = (d: string) => {
      try {
        for (const f of readdirSync(d)) {
          if (["node_modules", ".git", "dist"].includes(f)) continue;
          const full = join(d, f);
          const s = statSync(full);
          if (s.isDirectory()) { walk(full); continue; }
          if (!new RegExp(glob.replace(/\*/g, ".*")).test(f)) continue;
          const content = readFileSync(full, "utf-8");
          const matches = content.match(rx);
          if (matches) {
            totalMatches += matches.length;
            const rel = relative(process.cwd(), full);
            console.log(`  ${c.cy(rel)}: ${c.y(matches.length + " matches")}`);
            if (!opts.dryRun) writeFileSync(full, content.replace(rx, replacement));
          }
        }
      } catch {}
    };
    walk(process.cwd());
    if (totalMatches === 0) console.log(c.y("No matches"));
    else if (opts.dryRun) console.log(c.d(`\n${totalMatches} matches found (dry run)`));
    else console.log(c.g(`\n✓ ${totalMatches} replacements done`));
  });

// ─── LOREM: placeholder text ───
program
  .command("lorem [count]")
  .description("Lorem ipsum generate karo")
  .option("-w, --words", "Words count (default: paragraphs)")
  .action((count: string = "1", opts: { words?: boolean }) => {
    const words = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum".split(" ");
    const n = parseInt(count);
    if (opts.words) {
      const result: string[] = [];
      for (let i = 0; i < n; i++) result.push(words[i % words.length]);
      console.log(result.join(" "));
    } else {
      for (let p = 0; p < n; p++) {
        const len = 30 + Math.floor(Math.random() * 30);
        const para: string[] = [];
        for (let i = 0; i < len; i++) para.push(words[Math.floor(Math.random() * words.length)]);
        para[0] = para[0][0].toUpperCase() + para[0].slice(1);
        console.log(para.join(" ") + ".\n");
      }
    }
  });

// ─── TS: timestamp ↔ date ───
program
  .command("ts [value]")
  .description("Timestamp ↔ date convert karo")
  .action((value?: string) => {
    if (!value) {
      const now = new Date();
      console.log(`${c.bold("Unix:")}  ${c.g(Math.floor(now.getTime() / 1000).toString())}`);
      console.log(`${c.bold("MS:")}    ${c.g(now.getTime().toString())}`);
      console.log(`${c.bold("ISO:")}   ${c.cy(now.toISOString())}`);
      console.log(`${c.bold("Local:")} ${now.toLocaleString("en-IN")}`);
      return;
    }
    const num = parseInt(value);
    if (!isNaN(num)) {
      const ms = value.length > 12 ? num : num * 1000;
      const d = new Date(ms);
      console.log(`${c.bold("ISO:")}   ${c.cy(d.toISOString())}`);
      console.log(`${c.bold("Local:")} ${d.toLocaleString("en-IN")}`);
      console.log(`${c.bold("Ago:")}   ${c.d(timeAgo(d))}`);
    } else {
      const d = new Date(value);
      if (isNaN(d.getTime())) { console.error(c.r("Invalid date")); return; }
      console.log(`${c.bold("Unix:")} ${c.g(Math.floor(d.getTime() / 1000).toString())}`);
      console.log(`${c.bold("MS:")}   ${c.g(d.getTime().toString())}`);
    }
  });

// ─── COUNT: lines/words/chars ───
program
  .command("count <path>")
  .description("Lines / words / chars count karo")
  .action((p: string) => {
    const target = resolve(p);
    const countFile = (fp: string) => {
      const content = readFileSync(fp, "utf-8");
      return { lines: content.split("\n").length, words: content.split(/\s+/).filter(Boolean).length, chars: content.length };
    };
    try {
      const s = statSync(target);
      if (s.isFile()) {
        const r = countFile(target);
        console.log(`${c.cy(p)}: ${c.g(r.lines + " lines")} | ${c.y(r.words + " words")} | ${c.d(r.chars + " chars")}`);
      } else {
        const total = { lines: 0, words: 0, chars: 0, files: 0 };
        const skip = new Set(["node_modules", ".git", "dist", ".next"]);
        const walk = (d: string) => {
          for (const f of readdirSync(d)) {
            if (skip.has(f)) continue;
            const full = join(d, f);
            try {
              const st = statSync(full);
              if (st.isDirectory()) walk(full);
              else if (st.isFile()) {
                const r = countFile(full);
                total.lines += r.lines; total.words += r.words; total.chars += r.chars; total.files++;
              }
            } catch {}
          }
        };
        walk(target);
        console.log(`${c.bold(p)}:`);
        console.log(`  ${c.g(total.files + " files")} | ${c.g(total.lines + " lines")} | ${c.y(total.words + " words")} | ${c.d(total.chars + " chars")}`);
      }
    } catch { console.error(c.r("Path nahi mila")); }
  });

function timeAgo(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

program.parse(process.argv);
