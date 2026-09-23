import { aiProviderConfigured } from "../lib/kyb/ai";

function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"} - ${name}${detail ? ` (${detail})` : ""}`);
  if (!cond) process.exitCode = 1;
}

delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
delete process.env.OPENAI_API_KEY;
check("nessuna chiave → null (fallback manuale)", aiProviderConfigured() === null);

process.env.GOOGLE_GENERATIVE_AI_API_KEY = "AIza-test";
process.env.OPENAI_API_KEY = "sk-test";
check("Google presente + OpenAI presente → google (free preferito)", aiProviderConfigured() === "google");

delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
check("solo OpenAI → openai (fallback)", aiProviderConfigured() === "openai");

delete process.env.OPENAI_API_KEY;
process.env.GOOGLE_GENERATIVE_AI_API_KEY = "AIza-test";
check("solo Google → google", aiProviderConfigured() === "google");

check("KYB_AI_MODEL default = gemini-flash-latest", (process.env.KYB_AI_MODEL || "gemini-flash-latest") === "gemini-flash-latest");

console.log("\ndone");