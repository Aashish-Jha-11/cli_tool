# aj

A no-nonsense developer utility CLI. One command, tons of everyday tasks — no need to Google "how to kill a port" ever again.

## Install

```bash
npm install -g .
```

Or run directly during development:

```bash
npm run dev -- <command>
```

## What's in the box

| Command | What it does |
|---------|-------------|
| `aj ip` | Shows your local + public IP addresses |
| `aj port <n>` | Check what's running on a port (and kill it) |
| `aj serve` | Spin up a quick static file server |
| `aj json <file>` | Pretty-print, validate, minify, or query JSON |
| `aj encode` / `decode` | Base64 and URL encoding/decoding |
| `aj hash <input>` | Hash strings or files (md5, sha256, sha512) |
| `aj uuid` | Generate UUID v4s |
| `aj http <url>` | Quick HTTP requests with pretty output |
| `aj size <path>` | Check file or folder size |
| `aj find <pattern>` | Recursively search for files by regex |
| `aj clean` | Wipe out build artifacts (node_modules, dist, .next, etc.) |
| `aj env` | Read, write, and manage .env files |
| `aj gen` | Generate secure passwords or PINs |
| `aj watch <path> <cmd>` | Re-run a command whenever files change |
| `aj diff <a> <b>` | Diff two files |
| `aj gitinfo` | Quick git status summary |
| `aj deps` | Overview of your package.json dependencies |
| `aj replace <search> <replace> <glob>` | Find & replace across files |
| `aj lorem` | Generate placeholder text |
| `aj ts` | Convert between timestamps and dates |
| `aj count <path>` | Count lines, words, and chars in files |

## Usage examples

### Networking

```bash
# show all IPs
aj ip

# just the public one
aj ip -p

# what's on port 3000?
aj port 3000

# kill whatever's on port 3000
aj port 3000 -k
```

### Quick file server

```bash
# serve current directory on port 3000
aj serve

# serve ./public on port 8080
aj serve ./public -p 8080
```

### JSON swiss knife

```bash
# pretty-print
aj json data.json

# minify
aj json data.json -m

# just validate
aj json data.json -v

# grab a nested value
aj json package.json -q scripts.build
```

### Encoding & hashing

```bash
aj encode "hello world"           # base64
aj encode "hello world" -u        # URL encode
aj decode "aGVsbG8gd29ybGQ="      # base64 decode

aj hash "my secret string"        # sha256 by default
aj hash -a md5 "something"
aj hash -f ./big-file.zip         # hash a file
```

### Passwords & UUIDs

```bash
aj uuid                # one UUID
aj uuid -n 5           # five UUIDs

aj gen                 # 16-char password
aj gen 32              # 32-char password
aj gen -s              # no special characters
aj gen --pin 6         # 6-digit PIN
aj gen 20 -n 5         # five 20-char passwords
```

### HTTP requests

```bash
aj http httpbin.org/get
aj http httpbin.org/post -m POST -d '{"key":"value"}'
aj http example.com --head
```

### File operations

```bash
aj size .                          # folder size
aj size package.json               # file size

aj find "\.tsx?" ./src              # find .ts/.tsx files in src
aj find "README" -t f              # files only

aj count ./src                     # lines/words/chars for a whole directory
aj count app.ts                    # single file

aj diff old.json new.json
```

### Project utilities

```bash
# see all dependencies
aj deps

# check for outdated packages
aj deps -o

# nuke build artifacts (shows what it'll delete first)
aj clean -d

# actually delete them
aj clean

# find & replace (dry run first)
aj replace "oldFunc" "newFunc" "*.ts" -d

# then do it for real
aj replace "oldFunc" "newFunc" "*.ts"
```

### .env management

```bash
aj env                         # list all keys (values are masked)
aj env -g DATABASE_URL         # get a specific key
aj env -s "API_KEY=abc123"     # set a key
aj env -d API_KEY              # delete a key
aj env .env.local              # work with a different env file
```

### Watch & auto-run

```bash
# re-run tests whenever src/ changes
aj watch ./src "npm test"

# rebuild on change
aj watch ./src "npm run build"
```

### Timestamps

```bash
aj ts                          # current time in all formats
aj ts 1700000000               # unix timestamp → date
aj ts "2025-01-15T10:30:00Z"   # date string → unix timestamp
```

### Lorem ipsum

```bash
aj lorem                # one paragraph
aj lorem 3              # three paragraphs
aj lorem 10 -w          # ten words
```

## Build

```bash
npm run build
```

This compiles `aj.ts` → `dist/aj.js` and makes it executable. After that, `aj` is available globally (if linked/installed).

## Dependencies

Just one runtime dependency: [commander](https://github.com/tj/commander.js) for argument parsing. Everything else is Node.js built-ins.

## License

ISC
