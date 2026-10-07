// ===== Admin page logic (served only to a logged-in admin) =====
const $ = id => document.getElementById(id);
let products = [], orders = [];

// If the session expired, any API call answers 401 -> go back to the login page
const guard = r => { if (r.status === 401) location.href = "/admin-login.html"; return r; };

const thumb = p => p.imageUrl ? `<img class="thumb" src="${esc(p.imageUrl)}" alt="">` : `<div class="thumb">${esc(p.name.charAt(0))}</div>`;

// ---------- Products ----------
async function loadProducts() { const r = guard(await api("/api/admin/products")); products = r.ok ? r.data : []; renderProducts(); }

function renderProducts() {
  $("productRows").innerHTML = products.map(p => `
    <tr><td>${thumb(p)}</td><td>${esc(p.name)}${p.options?.length ? `<div class="muted">${esc(p.optionsName)}: ${p.options.map(o => esc(o.label) + " " + money(o.price)).join(" · ")}</div>` : ""}</td><td>${p.discountPercent > 0 ? `<s class="old">${money(p.price)}</s><br>${money(p.salePrice)} <span class="muted">(-${p.discountPercent}%)</span>` : money(p.price)}</td><td>${p.stock}</td>
      <td><div class="actions"><button class="btn" data-edit="${p.id}">${t("edit")}</button>
      <button class="btn danger" data-del="${p.id}">${t("delete")}</button></div></td></tr>`).join("")
    || `<tr><td colspan="5" class="empty">${t("no_products")}</td></tr>`;
}

function openForm(p) {   // p = product to edit, or undefined to add a new one
  $("pid").value = p?.id || ""; $("pname").value = p?.name || ""; $("pprice").value = p?.price ?? "";
  $("pstock").value = p?.stock ?? 0; $("pimage").value = ""; showPreview(p?.imageUrl || ""); $("formMsg").textContent = "";
  opts = (p?.options || []).map(o => ({ id: o.id, label: o.label, price: o.price }));
  $("optName").value = p?.optionsName || ""; renderOpts();
  $("pdesc").value = p?.description || ""; $("pdisc").value = p?.discountPercent || 0; updateSaleHint();
  $("imgHint").hidden = !p;                                    // hint only when editing
  $("dlg").showModal();
}

async function saveProduct() {
  const name = $("pname").value.trim(), price = parseFloat($("pprice").value), stock = parseInt($("pstock").value, 10);
  if (!name || !(price > 0) || !(stock >= 0)) { $("formMsg").textContent = t("err_save"); return; }
  const fd = new FormData();                                   // multipart so the image file can be sent
  const disc = parseInt($("pdisc").value, 10) || 0;
  if (disc < 0 || disc > 99) { $("formMsg").textContent = t("err_save"); return; }
  fd.append("Name", name); fd.append("Price", price); fd.append("Stock", stock);
  fd.append("Description", $("pdesc").value.trim()); fd.append("DiscountPercent", disc);
  const img = $("pimage").files[0];
  if (img && img.size > 20 * 1024 * 1024) { $("formMsg").textContent = t("err_image"); return; } // check size before uploading
  if (img) fd.append("Image", img);
  // Options: send only filled rows; the group name is required when there is at least one option
  const list = opts.filter(o => o.label.trim()).map(o => ({ id: o.id, label: o.label.trim(), price: parseFloat(o.price) || 0 }));
  if (list.length && (!$("optName").value.trim() || list.some(o => !(o.price > 0)))) { $("formMsg").textContent = t("err_save"); return; }
  fd.append("OptionsName", $("optName").value.trim()); fd.append("OptionsJson", JSON.stringify(list));
  const id = $("pid").value;
  const r = guard(await api(id ? `/api/admin/products/${id}` : "/api/admin/products", { method: id ? "PUT" : "POST", body: fd }));
  if (r.ok) { $("dlg").close(); loadProducts(); }
  else $("formMsg").textContent = r.data?.error === "invalid_image" ? t("err_image")
    : `${t("err_save")} (${r.status}${r.data?.error ? ": " + r.data.error : ""})`;   // status code helps to find the cause
}

// ---------- Product options (size, kilos, ...) ----------
let opts = [];   // [{ id, label, price }] being edited in the form (id 0 = new)
// With options, the product's own price field is not used: it shows the lowest option price
function syncPrice() {
  const prices = opts.map(o => parseFloat(o.price)).filter(x => x > 0);
  $("pprice").disabled = opts.length > 0;
  if (opts.length && prices.length) $("pprice").value = Math.min(...prices);
  updateSaleHint();
}
function renderOpts() {
  syncPrice();
  $("optList").innerHTML = opts.map((o, i) => `
    <div class="optrow"><input type="text" maxlength="60" data-ol="${i}" value="${esc(o.label)}" placeholder="${t("option_label")}">
      <input type="number" min="0.01" step="0.01" data-op="${i}" value="${o.price}" placeholder="${t("extra_price")}" title="${t("extra_price")}">
      <button type="button" class="btn danger" data-orm="${i}">✕</button></div>`).join("");
}
$("optList").addEventListener("input", e => {   // keep the array in sync while typing (no re-render, so focus stays)
  if (e.target.dataset.ol !== undefined) opts[e.target.dataset.ol].label = e.target.value;
  if (e.target.dataset.op !== undefined) { opts[e.target.dataset.op].price = e.target.value; syncPrice(); }
});
$("optList").addEventListener("click", e => { const b = e.target.closest("[data-orm]"); if (b) { opts.splice(+b.dataset.orm, 1); renderOpts(); } });
$("addOptBtn").onclick = () => { opts.push({ id: 0, label: "", price: "" }); renderOpts(); };

// Shows "before -> after" price while the admin types the discount
function updateSaleHint() {
  const price = parseFloat($("pprice").value), d = parseInt($("pdisc").value, 10) || 0;
  $("saleHint").textContent = price > 0 && d > 0 ? `${money(price)} → ${money(Math.round(price * (100 - d)) / 100)}  (-${d}%)` : "";
}
$("pprice").addEventListener("input", updateSaleHint);
$("pdisc").addEventListener("input", updateSaleHint);

// ---------- Image drag & drop ----------
const drop = $("drop"), fileInput = $("pimage");
function showPreview(src) { $("prev").hidden = !src; if (src) $("prev").src = src; }

// Check the chosen file, put it in the form's file input and show a preview
function setFile(file) {
  if (!file) return;
  if (!file.type.startsWith("image/") || file.size > 20 * 1024 * 1024) { $("formMsg").textContent = t("err_image"); return; }
  const dt = new DataTransfer(); dt.items.add(file); fileInput.files = dt.files;
  $("formMsg").textContent = ""; showPreview(URL.createObjectURL(file));
}
drop.onclick = () => fileInput.click();
drop.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); } };
fileInput.onchange = () => setFile(fileInput.files[0]);
["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", e => setFile(e.dataTransfer.files[0]));

// ---------- Orders ----------
async function loadOrders() { const r = guard(await api("/api/admin/orders")); orders = r.ok ? r.data : []; renderOrders(); }

function renderOrders() {
  const fmt = d => new Date(d).toLocaleString(lang === "ar" ? "ar-JO-u-nu-latn" : "en-GB");
  const statuses = ["Received", "InDelivery", "Delivered"];
  $("orderList").innerHTML = orders.map(o => `
    <article class="order st-${esc(o.status)}">
      <div class="order-head"><strong>${t("order_n", { n: o.id })}</strong><span>${fmt(o.createdAt)}</span></div>
      <div>${t("customer")}: ${o.customerName ? `<strong>${esc(o.customerName)}</strong> — ` : ""}<a href="tel:${esc(o.phone)}" dir="ltr">${esc(o.phone)}</a></div>
      <div><a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${o.latitude},${o.longitude}">📍 ${t("view_map")}</a>
        <span dir="ltr" style="color:var(--muted)"> (${o.latitude.toFixed(5)}, ${o.longitude.toFixed(5)})</span></div>
      <div>${t("zone")}: ${t(o.deliveryZone === "Amman" ? "zone_amman" : "zone_outside")}</div>
      <ul>${o.items.map(i => `<li>${esc(i.productName)}${i.optionText ? ` (${esc(i.optionText)})` : ""} × ${i.quantity} — ${money(i.unitPrice * i.quantity)}</li>`).join("")}</ul>
      <div class="sumrow"><span>${t("delivery")}</span><span>${money(o.deliveryFee)}</span></div>
      <div class="total"><span>${t("total")}</span><span>${money(o.total)}</span></div>
      <div class="status-row">
        <label style="margin:0;display:flex;align-items:center;gap:.4rem">${t("status")}
          <select data-status="${o.id}">${statuses.map(s => `<option value="${s}" ${s === o.status ? "selected" : ""}>${t("st_" + s)}</option>`).join("")}</select></label>
        <span class="spacer" style="margin-inline-end:auto"></span>
        <button class="btn" data-invoice="${o.id}">🧾 ${t("invoice")} PDF</button>
        <button class="btn danger" data-delorder="${o.id}">${t("delete")}</button>
      </div>
    </article>`).join("") || `<div class="empty">${t("no_orders")}</div>`;
}

// Change status (dropdown) / open invoice / delete order
$("orderList").addEventListener("change", async e => {
  const sel = e.target.closest("[data-status]"); if (!sel) return;
  guard(await api(`/api/admin/orders/${sel.dataset.status}/status`, { method: "PUT",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: sel.value }) }));
  loadOrders();
});
$("orderList").addEventListener("click", async e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.invoice) window.open(`/admin/invoice?id=${b.dataset.invoice}`, "_blank");
  if (b.dataset.delorder && confirm(t("confirm_delete_order"))) {
    guard(await api(`/api/admin/orders/${b.dataset.delorder}`, { method: "DELETE" })); loadOrders();
  }
});

// ---------- Tabs ----------
let tab = "products";
function showTab(name) {
  tab = name;
  $("productsView").hidden = name !== "products"; $("ordersView").hidden = name !== "orders";
  $("addBtn").hidden = name !== "products";
  $("tabProducts").classList.toggle("active", name === "products"); $("tabOrders").classList.toggle("active", name === "orders");
  if (name === "orders") loadOrders();
}

// ---------- Events ----------
$("tabProducts").onclick = () => showTab("products");
$("tabOrders").onclick = () => showTab("orders");
$("addBtn").onclick = () => openForm();
$("cancelBtn").onclick = () => $("dlg").close();
$("saveBtn").onclick = saveProduct;
$("productRows").addEventListener("click", async e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.edit) openForm(products.find(p => p.id == b.dataset.edit));
  if (b.dataset.del && confirm(t("confirm_delete"))) { guard(await api(`/api/admin/products/${b.dataset.del}`, { method: "DELETE" })); loadProducts(); }
});
$("logoutBtn").onclick = async () => { await api("/api/auth/logout", { method: "POST" }); location.href = "/admin-login.html"; };
window.onLangChange = () => { renderProducts(); renderOrders(); renderOpts(); };

// New orders appear on their own: refresh the orders list every 20 seconds while that tab is open
setInterval(() => { if (tab === "orders" && !document.hidden) loadOrders(); }, 20000);

loadProducts();
