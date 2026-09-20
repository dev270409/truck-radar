import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");

export interface ApiClient {
  req: (pathname: string, init?: RequestInit) => Promise<{ status: number; body: any }>;
}

export async function startDev(port = 3000): Promise<ChildProcess> {
  const bin = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
  const child = spawn(process.execPath, [bin, "dev", "-p", String(port)], {
    cwd: ROOT,
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderr = "";
  child.stderr?.on("data", (d) => (stderr += String(d)));

  const base = `http://localhost:${port}`;
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${base}/login`, { signal: AbortSignal.timeout(4000) });
      if (res.status === 200) return child;
    } catch {
      /* ancora avvio */
    }
    if (child.exitCode !== null) {
      throw new Error(`dev server terminato con exit ${child.exitCode}: ${stderr.slice(-2000)}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`dev server non avviato in tempo: ${stderr.slice(-2000)}`);
}

export async function stopDev(child: ChildProcess | null) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === "win32") {
    const pid = child.pid;
    try {
      if (pid) spawn("taskkill", ["/F", "/T", "/PID", String(pid)], { stdio: "ignore" });
    } catch {
      /* ignore */
    }
  } else {
    child.kill("SIGTERM");
  }
}

export async function login(port: number, email: string, password: string): Promise<string> {
  const base = `http://localhost:${port}`;
  const csrfRes = await fetch(`${base}/api/auth/csrf`, { credentials: "include" });
  const csrf = ((await csrfRes.json()) as { csrfToken?: string }).csrfToken;
  if (!csrf) throw new Error("csrf token non ottenuto");
  const csrfCookies = csrfRes.headers.getSetCookie?.() ?? [];
  const csrfCookie = csrfCookies.map((c) => c.split(";")[0]).join("; ");

  const body = new URLSearchParams({
    csrfToken: csrf,
    email,
    password,
  });

  const resp = await fetch(`${base}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: csrfCookie,
    },
    body: body.toString(),
    redirect: "manual",
  });

  const setCookies = resp.headers.getSetCookie?.() ?? [];
  const cookie = setCookies
    .map((c) => c.split(";")[0])
    .filter((c) => /authjs\./.test(c))
    .join("; ");

  if (!cookie) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`login fallito per ${email}: ${resp.status} ${txt.slice(0, 300)}`);
  }
  return cookie;
}

export function makeClient(port: number, cookie: string): ApiClient {
  const req = async (pathname: string, init: RequestInit = {}) => {
    const res = await fetch(`http://localhost:${port}${pathname}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        ...(init.headers ?? {}),
      },
    });
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      body = await res.text().catch(() => null);
    }
    return { status: res.status, body };
  };
  return { req };
}