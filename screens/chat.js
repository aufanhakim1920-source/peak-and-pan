/* ============================================================
   Peak & Pan — the assistant
   Ask the kitchen.
   Loaded as a classic script after ui.js. Edit this file on its
   own; nothing else needs to change.
   ============================================================ */

/* ---------------- assistant ---------------- */
let CHAT = [];
screens.chat = function chat() {
  if (!CHAT.length) CHAT = [{ who: "ai", text: "Ask me what you can cook, what you're short of, or where an ingredient comes from." }];
  return { nav: false, noAsk: true, html:
    `<div class="stripes"></div>
     ${backbar("Ask the kitchen")}
     <div class="sheet-cream" style="margin-top:22px;display:flex;flex-direction:column;min-height:calc(100% - 120px)">
       <div class="chatlog" id="chatlog">
         ${CHAT.map((m) => `<div class="msg msg--${m.who === "me" ? "me" : "ai"}">${fmt(m.text)}</div>`).join("")}
       </div>
       <div style="margin-top:auto">
         <div class="asksuggest">${AI.suggestions().map((s) => `<button data-suggest="${esc(s)}">${esc(s)}</button>`).join("")}</div>
         <form class="askbar" id="askform">
           <input id="askinput" type="text" placeholder="${AI.live ? "Ask anything" : "Ask about your pantry or a dish"}" autocomplete="off" aria-label="Ask the kitchen">
           <button type="submit" aria-label="Send"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
         </form>
         <p style="font-size:11px;color:var(--primary);margin-top:8px">${AI.live ? "Gemini connected · pantry answers computed locally" : "Answering from your own data. Add a key in Profile → Assistant."}</p>
       </div>
     </div>` };
};
const fmt = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");

async function sendChat(text) {
  const q = String(text || "").trim();
  if (!q) return;
  CHAT.push({ who: "me", text: q });
  route();
  const log = $("#chatlog");
  log.insertAdjacentHTML("beforeend", `<div class="msg msg--ai msg--typing"><span></span><span></span><span></span></div>`);
  log.lastElementChild.scrollIntoView({ block: "end" });
  const res = await AI.ask(q);
  CHAT.push({ who: "ai", text: res.text });
  route();
  Narrator.say(res.text.replace(/\*\*/g, ""));
  $("#chatlog")?.lastElementChild?.scrollIntoView({ block: "end", behavior: "smooth" });
}
