import crypto from "crypto";
import fs from "fs";
import http from "http";
import path from "path";
import { spawn } from "child_process";

const CLIENT_ID = "764086051850-6qr4p6gpi6hn506pt8ejuq83di341hur.apps.googleusercontent.com";
const CLIENT_SECRET = "d-FL95Q19q7Mqm_F9MeTfpQQ";
const PORT = 8765;
const REDIRECT = `http://localhost:${PORT}/`;
const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
].join(" ");

const BRAVE =
  process.env.BRAVE_PATH ||
  path.join(process.env.LOCALAPPDATA || "", "BraveSoftware/Brave-Browser/Application/brave.exe");

function b64url(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

const verifier = b64url(crypto.randomBytes(32));
const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());

const authUrl =
  "https://accounts.google.com/o/oauth2/auth?" +
  new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT,
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();

function appendEnv(envPath, values) {
  let text = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}="${value}"`;
    const re = new RegExp(`^${key}=.*$`, "m");
    text = re.test(text) ? text.replace(re, line) : `${text.trimEnd()}\n${line}\n`;
  }
  fs.writeFileSync(envPath, text.endsWith("\n") ? text : `${text}\n`);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", REDIRECT);
    const err = url.searchParams.get("error");
    const code = url.searchParams.get("code");
    if (err) throw new Error(err);
    if (!code) {
      res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<p>Missing authorization code.</p>");
      return;
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT,
        grant_type: "authorization_code",
        code_verifier: verifier,
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens.refresh_token) {
      throw new Error(tokens.error_description || tokens.error || "No refresh token returned");
    }

    const adcDir = path.join(process.env.APPDATA || "", "gcloud");
    fs.mkdirSync(adcDir, { recursive: true });
    fs.writeFileSync(
      path.join(adcDir, "application_default_credentials.json"),
      JSON.stringify(
        {
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          refresh_token: tokens.refresh_token,
          type: "authorized_user",
        },
        null,
        2,
      ),
    );

    const envPath = path.resolve("C:/Users/Mark Vincent Perez/OneDrive/Desktop/IEMELIFFUNRUN/.env.local");
    appendEnv(envPath, {
      GOOGLE_SHEETS_SPREADSHEET_ID: "1Foxg9lsMaMNVQ2HK-TWWu_QUCp_guLXSDfTZHUmzzIA",
      GOOGLE_SHEETS_TAB: "Registrations",
      GOOGLE_OAUTH_CLIENT_ID: CLIENT_ID,
      GOOGLE_OAUTH_CLIENT_SECRET: CLIENT_SECRET,
      GOOGLE_OAUTH_REFRESH_TOKEN: tokens.refresh_token,
    });

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      "<html><body style='font-family:sans-serif;padding:40px'><h1>Google Sheets connected</h1><p>You can close this Brave tab and return to Cursor.</p></body></html>",
    );
    console.log("OAUTH_OK");
    setTimeout(() => process.exit(0), 300);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(String(error));
    console.error(error);
    process.exit(1);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  if (!fs.existsSync(BRAVE)) {
    console.error("Brave not found at", BRAVE);
    process.exit(1);
  }
  console.log("Opening Brave for Google sign-in...");
  spawn(BRAVE, ["--new-window", authUrl], { detached: true, stdio: "ignore" }).unref();
});

setTimeout(() => {
  console.error("Timed out waiting for Google sign-in in Brave.");
  process.exit(1);
}, 180000);
