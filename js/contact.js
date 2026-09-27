/* =========================================================
   Quote form — photo attachments with previews + compression
   ========================================================= */
(function () {
  const form = document.getElementById("quote-form");
  if (!form) return;
  const S = window.SITE || {};
  const MAX_FILES = 6;
  const MAX_EDGE = 1800;      // px — plenty of detail for quoting
  const QUALITY = 0.82;

  const input = document.getElementById("f-photos");
  const drop = document.getElementById("drop");
  const thumbs = document.getElementById("thumbs");
  const note = document.getElementById("file-note");
  const status = document.getElementById("status");
  const submit = document.getElementById("submit");
  const success = document.getElementById("success");
  let photos = []; // { id, blob, name, url }

  const fmt = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.round(b / 1024) + " KB");
  const setNote = (msg, err) => { note.textContent = msg || ""; note.classList.toggle("err", !!err); };

  async function compress(file) {
    // Small or non-standard files (e.g. HEIC the browser can't decode) are sent as-is
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 400 * 1024) return file;
    try {
      const bmp = await createImageBitmap(file);
      const k = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas");
      c.width = Math.round(bmp.width * k);
      c.height = Math.round(bmp.height * k);
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", QUALITY));
      return blob && blob.size < file.size ? blob : file;
    } catch { return file; }
  }

  async function addFiles(list) {
    const files = [...list].filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (!files.length) return setNote("Only image files can be attached.", true);
    const room = MAX_FILES - photos.length;
    if (room <= 0) return setNote(`You can attach up to ${MAX_FILES} photos.`, true);
    if (files.length > room) setNote(`Only the first ${room} photo(s) were added (max ${MAX_FILES}).`, true);
    else setNote("");
    for (const f of files.slice(0, room)) {
      const blob = await compress(f);
      const name = f.name.replace(/\.(png|webp)$/i, blob !== f ? ".jpg" : "$&");
      const p = { id: Math.random().toString(36).slice(2), blob, name, url: URL.createObjectURL(blob) };
      photos.push(p);
      renderThumb(p);
    }
    input.value = "";
  }

  function renderThumb(p) {
    const el = document.createElement("div");
    el.className = "thumb";
    el.innerHTML = `<img alt="" /><span class="size">${fmt(p.blob.size)}</span><button type="button" aria-label="Remove photo">×</button>`;
    const img = el.querySelector("img");
    img.src = p.url;
    img.alt = p.name;
    img.onerror = () => { img.replaceWith(Object.assign(document.createElement("div"), { textContent: p.name, style: "padding:8px;font-size:.7rem;word-break:break-all" })); };
    el.querySelector("button").onclick = () => {
      URL.revokeObjectURL(p.url);
      photos = photos.filter((x) => x !== p);
      el.remove();
      setNote("");
    };
    thumbs.appendChild(el);
  }

  input.addEventListener("change", () => addFiles(input.files));
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", (e) => addFiles(e.dataTransfer.files));

  function showStatus(kind, html) { status.className = "form-status " + kind; status.innerHTML = html; }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.className = "form-status";
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const data = new FormData(form);
    data.delete("photo1");
    for (let i = 0; i < MAX_FILES; i++) data.delete("photo" + (i + 1));
    photos.forEach((p, i) => data.append("photo" + (i + 1), p.blob, p.name));
    // Collapse multi-select job types into one readable line
    const jobs = data.getAll("job");
    data.delete("job");
    data.append("job", jobs.join(", ") || "Not specified");

    submit.disabled = true;
    submit.classList.add("busy");
    submit.querySelector(".label-text").textContent = "Sending…";
    try {
      const res = await fetch(S.formEndpoint || "/", { method: "POST", body: data, headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("HTTP " + res.status);
      form.style.display = "none";
      success.classList.add("show");
      success.focus();
      photos.forEach((p) => URL.revokeObjectURL(p.url));
    } catch (err) {
      const subject = encodeURIComponent("Quote request from " + (data.get("name") || "website"));
      const body = encodeURIComponent(
        `Name: ${data.get("name")}\nPhone: ${data.get("phone")}\nSuburb: ${data.get("suburb")}\nJob: ${data.get("job")}\n\n${data.get("message")}\n\n(I'll attach photos to this email.)`
      );
      showStatus("bad",
        `Sorry, that didn't send. Please <a href="mailto:${S.email}?subject=${subject}&body=${body}">email us your request</a> ` +
        `(we've pre-filled it, just attach your photos) or call <a href="tel:${(S.phone || "").replace(/[^\d+]/g, "")}">${S.phone}</a>.`);
    } finally {
      submit.disabled = false;
      submit.classList.remove("busy");
      submit.querySelector(".label-text").textContent = "Send my quote request";
    }
  });
})();
