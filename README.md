# FDBCS

FDBCS is now CLI-first. The default entrypoint for new users is the unified Python CLI.

## Quick Start

1. (Optional) install Node dependencies if you plan to build the web UI:
   ```bash
   npm install
   ```
2. Verify CLI is available:
   ```bash
   python3 fdbcs.py --help
   ```

## CLI helper scripts

`package.json` provides thin wrappers around `fdbcs.py`:

- `npm run cli:help` → `python3 fdbcs.py --help`
- `npm run cli:init` → `python3 fdbcs.py init`
- `npm run cli:extract` → `python3 fdbcs.py extract`
- `npm run check:cli` → `python3 fdbcs.py --help`

For detailed command examples, see:

- [CLI_USAGE.md](./CLI_USAGE.md)
- [CLI_USAGE_CN.md](./CLI_USAGE_CN.md)
