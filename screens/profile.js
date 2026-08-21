/* ============================================================
   Peak & Pan — profile
   The bookshelf — every book is a settings section.
   Loaded as a classic script after ui.js. Edit this file on its
   own; nothing else needs to change.
   ============================================================ */

const BOOKS = [
  { id: "story",   title: "THE STORY",   spine: "#8C1C28", edge: "#591018", ink: "#F5DFE2", w: 54, h: 214 },
  { id: "access",  title: "ACCESS",      spine: "#1E5C63", edge: "#113538", ink: "#D7F0F2", w: 46, h: 228 },
  { id: "kitchen", title: "ASSISTANT",   spine: "#333333", edge: "#151515", ink: "#F9E95A", w: 62, h: 200 },
  { id: "data",    title: "DATA",        spine: "#1E3A5F", edge: "#13253D", ink: "#CFE0F5", w: 44, h: 236 },
  { id: "about",   title: "ABOUT",       spine: "#D99A2B", edge: "#A8751E", ink: "#2B1D05", w: 52, h: 208 },
];

screens.profile = function profile() {
  const mood = Game.mood();
  const chs = Game.chapters();
  const owned = Game.achievements().filter((a) => a.owned);
  return { nav: "#/profile", html:
    `<div class="stripes"></div>
     ${hud()}
     <div class="sect" style="margin-top:16px">
       <div class="glorbcard" style="--gc:${mood.color}">
         ${glorbArt(mood, 92, (Game.current() || {}).id)}
         <div class="glorbcard__b">
           <span class="glorbcard__mood">Glorb is ${esc(mood.name.toLowerCase())}</span>
           <span class="glorbcard__fed">${Game.state.cooked.length} dishes eaten · ${chs.filter((c) => c.cleared).length} countries cleared</span>
         </div>
       </div>
     </div>

     <div class="sheet-cream" style="margin-top:20px">
       <div class="statgrid">
         <div class="statbox"><b>${Game.state.cooked.length}</b><span>Cooked</span></div>
         <div class="statbox"><b>${chs.filter((c) => c.cleared).length}/${chs.length}</b><span>Countries</span></div>
         <div class="statbox"><b>${owned.length}</b><span>Medals</span></div>
       </div>

       <div class="subhead subhead--ink"><h2>The shelf</h2></div>
       <p style="font-size:12px;color:var(--primary);margin-bottom:14px">Pull a book off the shelf. Each one is a section.</p>
       <div class="shelf3d">
         <div class="books">
           ${BOOKS.map((b, i) => `
             <button class="book" data-book="${b.id}" style="width:${b.w}px;height:${b.h}px;${i === 2 ? "transform-origin:bottom left;transform:rotateZ(-2.5deg);" : ""}" aria-label="${esc(b.title)} settings">
               <span class="book__spine" style="background:${b.spine};color:${b.ink}">
                 <span class="book__rule"></span>
                 <span class="book__title">${esc(b.title)}</span>
                 <span class="book__rule"></span>
               </span>
               <span class="book__pages"></span>
               <span class="book__edge" style="background:${b.edge}"></span>
             </button>`).join("")}
         </div>
         <div class="plank"></div>
       </div>
       <div id="bookpanel"></div>
     </div>` };
};

function bookPanel(id) {
  const b = BOOKS.find((x) => x.id === id);
  if (!b) return;
  const body = {
    story: `
      <p style="font-size:13.5px;line-height:1.6;color:var(--secondary)">An alien octopus landed while you were cooking, threatened to eat you, tasted the food, and changed his mind. Now he will not leave until he has eaten the whole planet — one country at a time.</p>
      <div style="height:14px"></div>
      <button class="btn btn--ink btn--sm" data-replay>Replay the arrival</button>`,
    access: `
      <div class="setrow">
        <span><span class="setrow__t">Audio description</span><span class="setrow__s">Reads each screen aloud${Narrator.supported ? "" : " — not supported in this browser"}.</span></span>
        <button class="switch ${Narrator.enabled ? "is-on" : ""}" data-toggle="audio" role="switch" aria-checked="${Narrator.enabled}" aria-label="Audio description"><i></i></button>
      </div>
      <div class="setrow">
        <span><span class="setrow__t">Dark mode</span><span class="setrow__s">Follows your system on first open. This overrides it.</span></span>
        <button class="switch ${theme() === "dark" ? "is-on" : ""}" data-toggle="dark" role="switch" aria-checked="${theme() === "dark"}" aria-label="Dark mode"><i></i></button>
      </div>`,
    kitchen: `
      <p style="font-size:12.5px;color:var(--primary);line-height:1.55">Optional. Paste a Google AI Studio key and open questions go to Gemini Flash. Stored in this browser only — never in a file.</p>
      <input class="keyfield" id="aikey" type="password" placeholder="${AI.live ? "Key saved — paste a new one to replace" : "AIza…"}" autocomplete="off" aria-label="Gemini API key">
      <div style="display:flex;gap:10px;margin-top:12px">
        <button class="btn btn--sm" data-savekey>Save key</button>
        ${AI.live ? `<button class="btn btn--ghost btn--sm" style="color:var(--secondary);border-color:var(--line)" data-clearkey>Remove</button>` : ""}
      </div>`,
    data: `
      <div class="setrow">
        <span><span class="setrow__t">Ratings &amp; photos</span><span class="setrow__s">${DB.isLive ? "Live on Supabase." : "On this device. Fill in config.js and run supabase/schema.sql to go live."}</span></span>
        <span style="font-size:12px;color:${DB.isLive ? "var(--deep)" : "var(--primary)"}">${DB.isLive ? "Live" : "Local"}</span>
      </div>
      <div style="height:14px"></div>
      <button class="btn btn--ink btn--sm" data-wipe>Reset all progress</button>`,
    about: `
      <p style="font-size:13.5px;line-height:1.6;color:var(--secondary)">Peak &amp; Pan — built from the team rocket Figma, then reworked around the octopus. Vanilla HTML, CSS and JavaScript; no framework, no build step.</p>
      <p style="font-size:12px;color:var(--primary);margin-top:10px">Globe textures NASA blue marble via three-globe. Everything else drawn here.</p>`,
  }[id];

  $("#bookpanel").innerHTML = `
    <div class="bookopen" style="--bc:${b.spine}">
      <span class="bookopen__k">${esc(b.title)}</span>
      ${body}
    </div>`;
  $$(".book").forEach((el) => el.classList.toggle("is-active", el.dataset.book === id));
  $("#bookpanel").scrollIntoView({ behavior: "smooth", block: "nearest" });
}
