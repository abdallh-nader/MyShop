// ===== Shared helpers: language (EN/AR), theme (light/dark), formatting, API calls =====
const CURRENCY = "JOD"; // change to your currency code (USD, EUR, ...)

// All visible texts. Add a key in both languages to add a new text.
const I18N = {
  en: {
    brand: "DUKKAN", title_shop: "DUKKAN", title_admin: "Admin DUKKAN", title_login: "Admin DUKKAN Login",
    products: "Products", add: "Add to cart", out: "Out of stock", left: "Only {n} left", no_products: "No products yet.",
    cart: "Cart", empty: "Your cart is empty.", total: "Total", confirm: "Confirm order", remove: "Remove",
    checkout: "Delivery details", phone: "Phone number", location: "Delivery location", get_loc: "Use my current location",
    loc_set: "Location saved", place: "Place order", back: "Back",
    done: "Order placed! We will contact you soon.", order_no: "Order number", continue: "Continue shopping",
    err_phone: "Enter a valid phone number.", err_loc: "Please share your delivery location.",
    err_stock: "Only {n} of \"{name}\" available. Your cart was updated.", err_generic: "Something went wrong. Please try again.",
    loc_denied: "Could not get your location. Allow location access and try again.", loc_unsupported: "Your browser does not support location.",
    sending: "Sending...", description: "Description", discount: "Discount %", options: "Options", opt_group_ph: "Option name (e.g. Size, Weight)", option_label: "Choice (e.g. 1 kg, M)",
    extra_price: "Price", add_option: "Add option", opt_hint: "Optional. The customer picks one choice. Set a price for each choice (e.g. 1 kg = 5, 2 kg = 9); the product price field is then not used.", drop_hint: "Drag & drop an image here, or click to choose", full_name: "Full name", err_name: "Enter your name.",
    zone: "Delivery area", zone_amman: "Inside Amman", zone_outside: "Outside Amman", subtotal: "Subtotal", delivery: "Delivery",
    status: "Status", st_Received: "Order received", st_InDelivery: "Out for delivery", st_Delivered: "Delivered",
    invoice: "Invoice", print_pdf: "Print / Save as PDF", confirm_delete_order: "Delete this order permanently?",
    qty: "Qty", unit_price: "Unit price", item: "Item", invoice_no: "Invoice #{n}",
    username: "Username", password: "Password", login: "Log in", login_fail: "Wrong username or password.",
    logout: "Log out", tab_products: "Products", tab_orders: "Orders", add_product: "Add product", edit: "Edit", delete: "Delete",
    confirm_delete: "Delete this product?", name: "Name", price: "Price", stock: "Stock", image: "Image", save: "Save", cancel: "Cancel",
    actions: "Actions", no_orders: "No orders yet.", customer: "Customer", date: "Date", items: "Items", view_map: "View on map",
    order_n: "Order #{n}", err_image: "Image must be JPG, PNG, WEBP or GIF, up to 20 MB.", keep_image: "Leave empty to keep the current image.",
    err_save: "Could not save. Check the values."
  },
  ar: {
    brand: "دُكّان", title_shop: "دُكّان", title_admin: "لوحة الإدارة", title_login: "تسجيل دخول مسؤول دُكّان ",
    products: "المنتجات", add: "أضف إلى السلة", out: "نفدت الكمية", left: "متبقي {n} فقط", no_products: "لا توجد منتجات بعد.",
    cart: "السلة", empty: "سلتك فارغة.", total: "المجموع", confirm: "تأكيد الطلب", remove: "حذف",
    checkout: "بيانات التوصيل", phone: "رقم الهاتف", location: "موقع التوصيل", get_loc: "استخدم موقعي الحالي",
    loc_set: "تم حفظ الموقع", place: "إرسال الطلب", back: "رجوع",
    done: "تم إرسال طلبك! سنتواصل معك قريباً.", order_no: "رقم الطلب", continue: "متابعة التسوق",
    err_phone: "أدخل رقم هاتف صحيحاً.", err_loc: "يرجى مشاركة موقع التوصيل.",
    err_stock: "المتوفر من \"{name}\" هو {n} فقط. تم تحديث السلة.", err_generic: "حدث خطأ ما. حاول مرة أخرى.",
    loc_denied: "تعذّر الحصول على موقعك. اسمح بالوصول إلى الموقع ثم حاول مرة أخرى.", loc_unsupported: "متصفحك لا يدعم تحديد الموقع.",
    sending: "جارٍ الإرسال...", description: "الوصف", discount: "نسبة الخصم %", options: "الخيارات", opt_group_ph: "اسم الخيار (مثلاً المقاس، الوزن)", option_label: "الاختيار (مثلاً 1 كيلو، M)",
    extra_price: "السعر", add_option: "إضافة خيار", opt_hint: "اختياري. الزبون يختار خياراً واحداً. حدّد سعراً لكل خيار (مثلاً 1 كيلو = 5، 2 كيلو = 9)، وعندها لا يُستخدم حقل سعر المنتج.", drop_hint: "اسحب الصورة وأفلتها هنا، أو اضغط للاختيار", full_name: "الاسم الكامل", err_name: "أدخل اسمك.",
    zone: "منطقة التوصيل", zone_amman: "داخل عمّان", zone_outside: "خارج عمّان", subtotal: "مجموع المنتجات", delivery: "التوصيل",
    status: "الحالة", st_Received: "تم استلام الطلب", st_InDelivery: "قيد التوصيل", st_Delivered: "تم التوصيل",
    invoice: "الفاتورة", print_pdf: "طباعة / حفظ PDF", confirm_delete_order: "هل تريد حذف هذا الطلب نهائياً؟",
    qty: "الكمية", unit_price: "سعر الوحدة", item: "المنتج", invoice_no: "فاتورة رقم {n}",
    username: "اسم المستخدم", password: "كلمة المرور", login: "تسجيل الدخول", login_fail: "اسم المستخدم أو كلمة المرور غير صحيحة.",
    logout: "تسجيل الخروج", tab_products: "المنتجات", tab_orders: "الطلبات", add_product: "إضافة منتج", edit: "تعديل", delete: "حذف",
    confirm_delete: "هل تريد حذف هذا المنتج؟", name: "الاسم", price: "السعر", stock: "المخزون", image: "الصورة", save: "حفظ", cancel: "إلغاء",
    actions: "الإجراءات", no_orders: "لا توجد طلبات بعد.", customer: "العميل", date: "التاريخ", items: "المنتجات", view_map: "عرض على الخريطة",
    order_n: "طلب رقم {n}", err_image: "يجب أن تكون الصورة JPG أو PNG أو WEBP أو GIF وبحجم أقصاه 20 ميجابايت.", keep_image: "اتركه فارغاً للإبقاء على الصورة الحالية.",
    err_save: "تعذّر الحفظ. تحقق من القيم."
  }
};

let lang = localStorage.getItem("lang") === "ar" ? "ar" : "en";                       // saved language
let theme = localStorage.getItem("theme") ||
  (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");            // saved theme

// Apply direction + theme immediately (before the page paints) to avoid a flash
document.documentElement.lang = lang;
document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";   // Arabic = RTL, English = LTR
document.documentElement.dataset.theme = theme;

// Translate a key; {name} placeholders are replaced from `vars`
function t(key, vars = {}) {
  let s = (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  for (const k in vars) s = s.replace("{" + k + "}", vars[k]);
  return s;
}

// Fill every element marked with data-i18n / data-i18n-ph
function applyLang() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.querySelectorAll("[data-i18n]").forEach(el => el.textContent = t(el.dataset.i18n));
  document.querySelectorAll("[data-i18n-ph]").forEach(el => el.placeholder = t(el.dataset.i18nPh));
  document.querySelectorAll("[data-lang]").forEach(b => b.classList.toggle("active", b.dataset.lang === lang));
  const tb = document.getElementById("themeBtn");
  if (tb) tb.textContent = theme === "dark" ? "☀" : "☾";
}

function setLang(l) {
  lang = l; localStorage.setItem("lang", l); applyLang();
  if (window.onLangChange) window.onLangChange();                // let the page redraw its dynamic parts
}
function toggleTheme() {
  theme = theme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", theme);                          // theme is remembered
  document.documentElement.dataset.theme = theme; applyLang();
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-lang]").forEach(b => b.addEventListener("click", () => setLang(b.dataset.lang)));
  const tb = document.getElementById("themeBtn");
  if (tb) tb.addEventListener("click", toggleTheme);
  applyLang();
});

// Format money using the current language (Latin digits in both languages)
function money(n) {
  return new Intl.NumberFormat(lang === "ar" ? "ar-JO-u-nu-latn" : "en-US", { style: "currency", currency: CURRENCY }).format(n);
}
// Escape text before putting it in innerHTML (prevents script injection)
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
// fetch wrapper: always returns { ok, status, data }
async function api(url, opts = {}) {
  const r = await fetch(url, { credentials: "same-origin", ...opts });
  let data = null; try { data = await r.json(); } catch { }
  return { ok: r.ok, status: r.status, data };
}
