import type { Express, Request, Response } from "express";
import { type Server } from "http";
import { spawn, type ChildProcess } from "child_process";
import { log } from "./index";
import http from "http";

let pythonProcess: ChildProcess | null = null;

function startPythonBackend(): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("python", ["-m", "uvicorn", "server_py.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    });

    pythonProcess = proc;

    let resolved = false;

    proc.stdout?.on("data", (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) log(msg, "uvicorn");
      if (!resolved && msg.includes("Application startup complete")) {
        resolved = true;
        resolve();
      }
    });

    proc.stderr?.on("data", (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) log(msg, "uvicorn");
      if (!resolved && msg.includes("Application startup complete")) {
        resolved = true;
        resolve();
      }
    });

    proc.on("error", (err) => {
      log(`Failed to start Python backend: ${err.message}`, "uvicorn");
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });

    proc.on("exit", (code) => {
      log(`Python backend exited with code ${code}`, "uvicorn");
      pythonProcess = null;
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    }, 5000);
  });
}

function proxyToFastAPI(req: Request, res: Response) {
  const contentType = (req.headers["content-type"] || "").toLowerCase();
  const isJson = contentType.includes("application/json");

  let body: string | undefined;
  const headers: Record<string, string | string[] | undefined> = {
    ...req.headers,
    host: "127.0.0.1:8000",
  };

  // For JSON requests, express.json() has already consumed the raw stream and
  // populated req.body — re-serialise it so FastAPI gets a valid payload.
  // For multipart/form-data and other binary types, the raw stream is still
  // intact (express.json/urlencoded don't touch them), so we pipe it directly.
  if (isJson && req.body && Object.keys(req.body).length > 0) {
    body = JSON.stringify(req.body);
    headers["content-type"] = "application/json";
    headers["content-length"] = Buffer.byteLength(body).toString();
  }

  const options: http.RequestOptions = {
    hostname: "127.0.0.1",
    port: 8000,
    path: req.originalUrl,
    method: req.method,
    headers,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on("error", (err) => {
    log(`Proxy error: ${err.message}`, "proxy");
    if (!res.headersSent) {
      res.status(502).json({ message: "Backend unavailable" });
    }
  });

  if (body) {
    // JSON body: write the re-serialised string and close
    proxyReq.write(body);
    proxyReq.end();
  } else {
    // Multipart / binary / no-body: pipe the raw request stream through
    req.pipe(proxyReq, { end: true });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await startPythonBackend();

  app.all("/api/{*path}", proxyToFastAPI);

  return httpServer;
}

process.on("exit", () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
});

process.on("SIGTERM", () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
  process.exit(0);
});
