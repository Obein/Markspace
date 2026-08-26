import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

// Auto-detect standard ~/.cargo/bin if not already in PATH
const cargoHomeBin = path.join(os.homedir(), '.cargo', 'bin');
if (fs.existsSync(cargoHomeBin) && !process.env.PATH?.includes(cargoHomeBin)) {
  process.env.PATH = `${cargoHomeBin}${path.delimiter}${process.env.PATH || ''}`;
}

export interface WasmBuildOptions {
  /** Relative or absolute path to the Rust crate directory */
  crateDir: string;
  /** Relative or absolute path to the output directory where .wasm should be copied */
  outDir: string;
  /** Custom output WASM filename (defaults to <crate_name>.wasm) */
  wasmName?: string;
  /** Rust compilation target (defaults to wasm32-unknown-unknown) */
  target?: string;
  /** Whether to build with --release flag (default: true) */
  release?: boolean;
}

/**
 * Extracts crate package name from Cargo.toml if available.
 */
function getCrateNameFromCargo(cratePath: string): string | null {
  const cargoPath = path.resolve(cratePath, 'Cargo.toml');
  if (!fs.existsSync(cargoPath)) return null;
  const content = fs.readFileSync(cargoPath, 'utf-8');
  const match = content.match(/name\s*=\s*["']([^"']+)["']/);
  return match ? match[1] : null;
}

/**
 * Compiles a Rust crate to WebAssembly and copies the resulting .wasm binary to the target directory.
 * Fails fast with a non-zero exit code if cargo or compilation fails.
 */
export function buildWasm(options: WasmBuildOptions): void {
  const resolvedCrateDir = path.resolve(process.cwd(), options.crateDir);
  const resolvedOutDir = path.resolve(process.cwd(), options.outDir);
  const target = options.target || 'wasm32-unknown-unknown';
  const isRelease = options.release !== false;

  const crateName = getCrateNameFromCargo(resolvedCrateDir) || path.basename(resolvedCrateDir);
  const normalizedCrateName = crateName.replace(/-/g, '_');
  const outputWasmName = options.wasmName || `${normalizedCrateName}.wasm`;

  const profileDir = isRelease ? 'release' : 'debug';
  const targetWasm = path.resolve(
    resolvedCrateDir,
    'target',
    target,
    profileDir,
    `${normalizedCrateName}.wasm`
  );
  const destWasm = path.resolve(resolvedOutDir, outputWasmName);

  console.log(`\n==> [build:wasm] Building Rust Crate: "${crateName}"`);
  console.log(`    Crate Dir : ${resolvedCrateDir}`);
  console.log(`    Target    : ${target}`);
  console.log(`    Output    : ${destWasm}`);

  // 1. Verify cargo availability
  try {
    execSync('cargo --version', { stdio: 'pipe' });
  } catch {
    throw new Error(
      `[build:wasm] Cargo not found in PATH. A working Rust toolchain is required to build "${crateName}".\nPlease install Rust from https://rustup.rs and ensure 'cargo' is in your PATH.`
    );
  }

  // 2. Ensure wasm32 target is available
  try {
    execSync(`rustup target add ${target}`, { stdio: 'ignore' });
  } catch {
    // Ignore if rustup is not in PATH or target is already present
  }

  // 3. Compile crate with cargo
  const releaseFlag = isRelease ? '--release' : '';
  const buildCmd = `cargo build --target ${target} ${releaseFlag}`.trim();
  console.log(`    Running   : ${buildCmd}`);
  
  try {
    execSync(buildCmd, {
      cwd: resolvedCrateDir,
      stdio: 'inherit',
    });
  } catch (err: any) {
    throw new Error(`[build:wasm] Compilation failed for crate "${crateName}": ${err?.message}`);
  }

  // 4. Verify and copy artifact
  if (!fs.existsSync(targetWasm)) {
    throw new Error(`[build:wasm] Expected WASM output not found at: ${targetWasm}`);
  }

  fs.mkdirSync(resolvedOutDir, { recursive: true });
  fs.copyFileSync(targetWasm, destWasm);
  console.log(`    ✔ Successfully generated: ${destWasm}\n`);
}

/**
 * CLI Argument Parser
 * Supports:
 *   --crateDir=<path> | -c <path>
 *   --outDir=<path>   | -o <path>
 *   --wasmName=<name> | -n <name>
 *   --target=<target> | -t <target>
 *   --debug
 *   --help            | -h
 */
function parseCliArgs(): WasmBuildOptions | 'HELP' {
  const args = process.argv.slice(2);
  if (args.includes('-h') || args.includes('--help')) {
    return 'HELP';
  }

  const options: WasmBuildOptions = {
    crateDir: 'crates/markspace-wasm-memory',
    outDir: 'apps/ui/src/crypto/memoryScrubber',
    release: true,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--crateDir=')) {
      options.crateDir = arg.split('=')[1];
    } else if (arg === '-c' || arg === '--crateDir' || arg === '--crate') {
      options.crateDir = args[++i];
    } else if (arg.startsWith('--outDir=')) {
      options.outDir = arg.split('=')[1];
    } else if (arg === '-o' || arg === '--outDir' || arg === '--out') {
      options.outDir = args[++i];
    } else if (arg.startsWith('--wasmName=')) {
      options.wasmName = arg.split('=')[1];
    } else if (arg === '-n' || arg === '--wasmName' || arg === '--name') {
      options.wasmName = args[++i];
    } else if (arg.startsWith('--target=')) {
      options.target = arg.split('=')[1];
    } else if (arg === '-t' || arg === '--target') {
      options.target = args[++i];
    } else if (arg === '--debug') {
      options.release = false;
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
Markspace WASM Builder CLI
==========================
Compiles Rust crates into WebAssembly and synchronizes .wasm binaries to the frontend.

Usage:
  npx tsx scripts/build-wasm.ts [options]

Options:
  -c, --crateDir <path>   Path to the Rust crate (default: "crates/markspace-wasm-memory")
  -o, --outDir <path>     Output directory for the .wasm file (default: "apps/ui/src/crypto/memoryScrubber")
  -n, --wasmName <name>   Output filename (default: <crate_name>.wasm)
  -t, --target <target>   Compilation target (default: "wasm32-unknown-unknown")
      --debug             Build in debug mode instead of release
  -h, --help              Show this help message

Examples:
  npm run build:wasm
  npx tsx scripts/build-wasm.ts --crateDir=crates/my-new-crate --outDir=apps/ui/src/crypto/myModule
`);
}

// Direct CLI invocation
const parsed = parseCliArgs();
if (parsed === 'HELP') {
  printHelp();
  process.exit(0);
} else {
  try {
    buildWasm(parsed);
  } catch (err: any) {
    console.error(`\n❌ ${err.message}`);
    process.exit(1);
  }
}
