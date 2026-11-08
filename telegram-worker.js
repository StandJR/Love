// Cloudflare Worker: принимает ответ со страницы-открытки и шлёт его в Телеграм через бота.
//
// Что настроить в Cloudflare (Workers -> твой воркер -> Settings -> Variables and Secrets):
//   BOT_TOKEN      секрет, токен бота от @BotFather
//   CHAT_ID        секрет, твой chat id (число)
//   ALLOWED_ORIGIN обычная переменная, адрес страницы без слэша в конце,
//                  например https://tvoj-sajt.pages.dev
//
// Адрес этого воркера потом вставляется в страницу, в блок CONFIG, в поле apiUrl.

export default {
  async fetch(req, env) {
    const allowed = env.ALLOWED_ORIGIN || "*";
    const cors = {
      "Access-Control-Allow-Origin": allowed,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });
    if (allowed !== "*" && req.headers.get("Origin") !== allowed) {
      return new Response("Forbidden", { status: 403, headers: cors });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response("Bad JSON", { status: 400, headers: cors });
    }

    const clip = (v, n) => String(v ?? "").slice(0, n);
    let lines;

    if (body.kind === "alone") {
      lines = [
        "Ей сейчас хочется побыть одной",
        "",
        "Она напишет сама, когда будет готова.",
      ];
    } else {
      lines = [
        "Она согласилась на свидание!",
        "",
        "Дата: " + clip(body.date, 60),
        "Время: " + clip(body.time, 60),
        "Занятие: " + clip(body.place, 200),
      ];
    }
    if (body.note) lines.push("", "От неё: " + clip(body.note, 500));

    const tg = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: env.CHAT_ID, text: lines.join("\n") }),
    });

    if (!tg.ok) return new Response("Telegram error", { status: 502, headers: cors });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  },
};
