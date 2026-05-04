const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const root = __dirname;
const dataFile = path.join(root, "messages.json");
const port = Number(process.env.PORT || 3000);
const receiverPassword = process.env.RECEIVER_PASSWORD || "change-this-password";
const sessionCookie = "receiver_access=ok";

async function readMessages() {
  try {
    const text = await fs.readFile(dataFile, "utf8");
    return JSON.parse(text);
  } catch {
    return [];
  }
}

async function writeMessages(messages) {
  await fs.writeFile(dataFile, JSON.stringify(messages, null, 2), "utf8");
}

function sendJson(response, status, data) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(data));
}

function parseCookies(request) {
  return Object.fromEntries(
    String(request.headers.cookie || "")
      .split(";")
      .map((item) => item.trim().split("="))
      .filter(([name, value]) => name && value)
  );
}

function hasReceiverAccess(request) {
  return parseCookies(request).receiver_access === "ok";
}

function redirect(response, location) {
  response.writeHead(302, {
    Location: location
  });
  response.end();
}

async function readJson(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function sendFile(response, fileName) {
  const filePath = path.join(root, fileName);
  const content = await fs.readFile(filePath);
  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8"
  });
  response.end(content);
}

function sendLogin(response, failed = false) {
  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(`<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>받는 사이트 로그인</title>
  <style>
    :root {
      --bg: #eef3f1;
      --surface: #ffffff;
      --text: #17201c;
      --muted: #62706a;
      --line: #d7dfdb;
      --primary: #11644f;
      --danger: #b33a3a;
      font-family: "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: var(--bg);
      color: var(--text);
      padding: 24px;
    }

    main {
      width: min(420px, 100%);
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface);
      padding: 24px;
      box-shadow: 0 18px 45px rgba(22, 32, 28, 0.1);
    }

    h1 {
      margin: 0 0 8px;
      font-size: 24px;
      letter-spacing: 0;
    }

    p {
      margin: 0 0 18px;
      color: var(--muted);
      line-height: 1.6;
    }

    label {
      display: block;
      margin-bottom: 8px;
      color: var(--muted);
      font-size: 14px;
      font-weight: 700;
    }

    input {
      width: 100%;
      height: 44px;
      border: 1px solid var(--line);
      border-radius: 6px;
      font: inherit;
      padding: 0 12px;
    }

    button {
      width: 100%;
      min-height: 44px;
      border: 0;
      border-radius: 6px;
      background: var(--primary);
      color: #fff;
      cursor: pointer;
      font: inherit;
      font-weight: 800;
      margin-top: 14px;
    }

    .error {
      color: var(--danger);
      font-size: 14px;
      margin-top: 12px;
    }
  </style>
</head>
<body>
  <main>
    <h1>받는 사이트 잠금</h1>
    <p>도착한 글자는 비밀번호를 아는 사람만 볼 수 있습니다.</p>
    <form method="post" action="/login">
      <label for="password">비밀번호</label>
      <input id="password" name="password" type="password" autocomplete="current-password" autofocus>
      <button type="submit">들어가기</button>
      ${failed ? '<div class="error">비밀번호가 틀렸습니다.</div>' : ""}
    </form>
  </main>
</body>
</html>`);
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "GET" && url.pathname === "/api/messages") {
      if (!hasReceiverAccess(request)) {
        sendJson(response, 401, { error: "login required" });
        return;
      }
      sendJson(response, 200, await readMessages());
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/messages") {
      const body = await readJson(request);
      const first = String(body.first || "").trim();
      const second = String(body.second || "").trim();

      if (!first && !second) {
        sendJson(response, 400, { error: "message required" });
        return;
      }

      const messages = await readMessages();
      messages.unshift({
        id: String(body.id || Date.now()),
        first,
        second,
        createdAt: body.createdAt || new Date().toISOString()
      });
      await writeMessages(messages);
      sendJson(response, 201, { ok: true });
      return;
    }

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      await sendFile(response, "index.html");
      return;
    }

    if (request.method === "GET" && url.pathname === "/login") {
      sendLogin(response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/login") {
      const chunks = [];

      for await (const chunk of request) {
        chunks.push(chunk);
      }

      const form = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));

      if (form.get("password") === receiverPassword) {
        response.writeHead(302, {
          Location: "/receiver.html",
          "Set-Cookie": `${sessionCookie}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`
        });
        response.end();
        return;
      }

      sendLogin(response, true);
      return;
    }

    if (request.method === "POST" && url.pathname === "/logout") {
      response.writeHead(302, {
        Location: "/",
        "Set-Cookie": "receiver_access=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"
      });
      response.end();
      return;
    }

    if (request.method === "GET" && url.pathname === "/receiver.html") {
      if (!hasReceiverAccess(request)) {
        redirect(response, "/login");
        return;
      }
      await sendFile(response, "receiver.html");
      return;
    }

    response.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8"
    });
    response.end("Not found");
  } catch {
    sendJson(response, 500, { error: "server error" });
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Input site: http://localhost:${port}/`);
  console.log(`Receiver site: http://localhost:${port}/receiver.html`);
  console.log("Set RECEIVER_PASSWORD before deploying.");
});
