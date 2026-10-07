// ===== Customer page logic: products, options, cart, checkout =====
const $ = id => document.getElementById(id);
let products = [];                                              // products from the server
// Cart keys look like "productId:optionId" (optionId is 0 when the product has no options)
let cart = JSON.parse(localStorage.getItem("cart") || "{}");
let fees = { amman: 0, outside: 0 };                            // delivery prices from the server
let coords = null;                                              // { lat, lng } of the customer

const saveCart = () => localStorage.setItem("cart", JSON.stringify(cart));
const byId = id => products.find(p => p.id == id);

// Price text: old price crossed out + new price when there is a discount
const priceHtml = x => x.salePrice < x.price ? `<s class="old">${money(x.price)}</s>${money(x.salePrice)}` : money(x.salePrice);

// Split a cart key into product + chosen option, and compute that line's unit price
function parse(key) {
  const [pid, oid = "0"] = key.split(":");
  const p = byId(pid);
  const opt = p?.options?.find(o => o.id == oid);
  const orig = p ? (opt ? opt.price : p.price) : 0;                 // price before discount
  const unit = p ? (opt ? opt.salePrice : p.salePrice) : 0;         // price after discount (what the customer pays)
  return { pid: +pid, oid: +oid, p, opt, orig, unit };
}
// How many units of one product are in the cart (all options together share the stock)
const qtyOf = pid => Object.entries(cart).reduce((s, [k, q]) => s + (parse(k).pid == pid ? q : 0), 0);

// Small image box: real image, or the first letter when there is no image
const thumb = p => p.imageUrl ? `<img class="thumb" src="${esc(p.imageUrl)}" alt="${esc(p.name)}" loading="lazy">`
                              : `<div class="thumb">${esc(p.name.charAt(0))}</div>`;

async function loadProducts() {
  const r = await api("/api/products");
  products = r.ok ? r.data : [];
  syncCart(); renderProducts(); renderCart();
}

// Drop lines whose product/option no longer exists, and cap quantities at the current stock
function syncCart() {
  const left = {};                                              // remaining stock per product while we walk the cart
  for (const key of Object.keys(cart)) {
    const { pid, oid, p } = parse(key);
    const optionOk = p && (p.options.length ? p.options.some(o => o.id == oid) : oid === 0);
    if (!optionOk || p.stock < 1) { delete cart[key]; continue; }
    left[pid] ??= p.stock;
    cart[key] = Math.min(cart[key], left[pid]); left[pid] -= cart[key];
    if (cart[key] < 1) delete cart[key];
  }
  saveCart();
}

const optText = (o) => esc(o.label) + " — " + money(o.salePrice);

function renderProducts() {
  $("grid").innerHTML = products.length ? products.map(p => `
    <article class="card">${p.discountPercent > 0 ? `<span class="sale-badge">-${p.discountPercent}%</span>` : ""}${thumb(p)}
      <div class="card-body">
        <div class="card-name">${esc(p.name)}</div>
        ${p.description ? `<div class="desc">${esc(p.description)}</div>` : ""}
        <div class="price" id="price-${p.id}">${priceHtml(p.options.length ? p.options[0] : p)}</div>
        ${p.options.length ? `<div class="muted">${esc(p.optionsName)}</div>
          <select data-opt="${p.id}" aria-label="${esc(p.optionsName)}">${p.options.map(o => `<option value="${o.id}">${optText(o)}</option>`).join("")}</select>` : ""}
        ${p.stock > 0 && p.stock <= 5 ? `<div class="low">${t("left", { n: p.stock })}</div>` : ""}
        <button class="btn primary" data-add="${p.id}" ${p.stock < 1 ? "disabled" : ""}>${p.stock < 1 ? t("out") : t("add")}</button>
      </div>
    </article>`).join("") : `<div class="empty">${t("no_products")}</div>`;
}

function cartTotal() { return Object.entries(cart).reduce((s, [k, q]) => s + parse(k).unit * q, 0); }

function renderCart() {
  const entries = Object.entries(cart);
  const count = entries.reduce((s, [, q]) => s + q, 0);
  $("cartCount").textContent = count; $("cartCount").hidden = count === 0;   // badge on the cart button
  $("cartList").innerHTML = entries.length ? entries.map(([key, q]) => { const { p, opt, orig, unit } = parse(key); return `
    <div class="line">${thumb(p)}
      <div><div class="card-name">${esc(p.name)}</div>
        ${opt ? `<div class="muted">${esc(p.optionsName)}: ${esc(opt.label)}</div>` : ""}
        <div class="price">${priceHtml({ price: orig, salePrice: unit })}</div>
        <div class="qty"><button data-dec="${key}" aria-label="-">−</button><span>${q}</span><button data-inc="${key}" aria-label="+" ${qtyOf(p.id) >= p.stock ? "disabled" : ""}>+</button></div></div>
      <div style="text-align:end"><div><strong>${money(unit * q)}</strong></div><button class="link" data-del="${key}">${t("remove")}</button></div>
    </div>`; }).join("") : `<div class="empty">${t("empty")}</div>`;
  $("cartTotal").textContent = money(cartTotal());
  updateCheckoutTotals();
  $("confirmBtn").disabled = entries.length === 0;
}

// Subtotal + delivery fee (by selected area) + total shown on the checkout view
function updateCheckoutTotals() {
  const fee = $("zone").value === "Amman" ? fees.amman : fees.outside;
  $("subTotal").textContent = money(cartTotal());
  $("feeText").textContent = money(fee);
  $("checkoutTotal").textContent = money(cartTotal() + fee);
}

// --- Cart actions ---
function add(pid, oid = 0) {
  const p = byId(pid); if (!p || qtyOf(pid) >= p.stock) return;
  const key = `${pid}:${oid}`; cart[key] = (cart[key] || 0) + 1; update();
}
function inc(key) { const { pid, oid } = parse(key); add(pid, oid); }
function dec(key) { cart[key] = (cart[key] || 1) - 1; if (cart[key] < 1) delete cart[key]; update(); }
function del(key) { delete cart[key]; update(); }
function update() { saveCart(); renderCart(); }

// --- Drawer ---
function view(name) {   // show only one of: Cart, Checkout, Done
  $("viewCart").style.display = name === "Cart" ? "contents" : "none";
  $("viewCheckout").style.display = name === "Checkout" ? "flex" : "none";
  $("viewDone").style.display = name === "Done" ? "flex" : "none";
}
function openDrawer(v = "Cart") { view(v); $("drawer").classList.add("open"); $("overlay").classList.add("open"); }
function closeDrawer() { $("drawer").classList.remove("open"); $("overlay").classList.remove("open"); }

// --- Location (browser geolocation gives latitude/longitude) ---
function getLocation() {
  if (!navigator.geolocation) { $("orderMsg").textContent = t("loc_unsupported"); return; }
  navigator.geolocation.getCurrentPosition(pos => {
    coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    $("locInfo").className = "msg ok";
    $("locInfo").textContent = `✓ ${t("loc_set")}: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
    const d = 0.004;   // small box around the point for the preview map (OpenStreetMap embed)
    $("mapPreview").src = `https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - d},${coords.lat - d},${coords.lng + d},${coords.lat + d}&marker=${coords.lat},${coords.lng}`;
    $("mapPreview").hidden = false; $("orderMsg").textContent = "";
  }, () => { $("orderMsg").textContent = t("loc_denied"); }, { enableHighAccuracy: true, timeout: 15000 });
}

// --- Send the order. Only ids + quantities are sent; the server uses its own prices. ---
async function placeOrder() {
  const name = $("custName").value.trim();
  if (name.length < 2) { $("orderMsg").textContent = t("err_name"); return; }
  const phone = $("phone").value.trim();
  if (!/^\+?[0-9]{7,15}$/.test(phone.replace(/[\s\-()]/g, ""))) { $("orderMsg").textContent = t("err_phone"); return; }
  if (!coords) { $("orderMsg").textContent = t("err_loc"); return; }
  $("placeBtn").disabled = true; $("orderMsg").textContent = t("sending");
  const r = await api("/api/orders", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, phone, latitude: coords.lat, longitude: coords.lng, zone: $("zone").value,
      items: Object.entries(cart).map(([key, q]) => { const { pid, oid } = parse(key); return { productId: pid, quantity: q, optionId: oid || null }; }) })
  });
  $("placeBtn").disabled = false;
  if (r.ok) {
    cart = {}; saveCart(); $("orderId").textContent = r.data.id; $("orderMsg").textContent = "";
    view("Done"); loadProducts();                               // refresh stock after the purchase
  } else if (r.status === 409 && r.data?.error === "out_of_stock") {
    $("orderMsg").textContent = t("err_stock", { n: r.data.available, name: r.data.productName });
    await loadProducts(); view("Cart");                         // cart is clamped to the real stock
  } else {
    $("orderMsg").textContent = r.data?.error === "invalid_name" ? t("err_name") : r.data?.error === "invalid_phone" ? t("err_phone") : t("err_generic");
  }
}

// --- Events (one listener per area, using data-* attributes) ---
$("grid").addEventListener("click", e => {
  const d = e.target.closest(".desc"); if (d) { d.classList.toggle("open"); return; }   // tap description to expand
  const b = e.target.closest("[data-add]"); if (!b) return;
  const sel = $("grid").querySelector(`[data-opt="${b.dataset.add}"]`);   // chosen option (if the product has any)
  add(+b.dataset.add, sel ? +sel.value : 0);
});
// When the customer picks another option, show that option's price on the card
$("grid").addEventListener("change", e => {
  const s = e.target.closest("[data-opt]"); if (!s) return;
  const p = byId(s.dataset.opt), o = p.options.find(x => x.id == s.value);
  $("price-" + p.id).innerHTML = priceHtml(o);
});
$("cartList").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.inc) inc(b.dataset.inc); else if (b.dataset.dec) dec(b.dataset.dec); else if (b.dataset.del) del(b.dataset.del);
});
$("cartBtn").onclick = () => openDrawer("Cart");
$("closeBtn").onclick = $("overlay").onclick = closeDrawer;
$("confirmBtn").onclick = () => { $("orderMsg").textContent = ""; view("Checkout"); };
$("backBtn").onclick = () => view("Cart");
$("locBtn").onclick = getLocation;
$("zone").onchange = updateCheckoutTotals;
$("placeBtn").onclick = placeOrder;
$("doneBtn").onclick = closeDrawer;
window.onLangChange = () => { renderProducts(); renderCart(); };  // redraw texts when language changes

api("/api/settings").then(r => { if (r.ok) { fees = r.data; updateCheckoutTotals(); } });
loadProducts();
