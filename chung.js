/* ============================================================
   VSTEP – phần dùng chung (cấu hình, bộ đếm, danh sách bài)
   Thường KHÔNG cần sửa gì trong file này.
   ============================================================ */

var CAU_HINH = {
  TEN_WEB: "Vstep",
  THU_MUC_BAI: "baitap",      // thư mục chứa các file bài tập .html

  // Để trống: web tự nhận ra tài khoản và kho GitHub từ địa chỉ trang.
  // Chỉ điền khi dùng tên miền riêng, ví dụ: "ten-tai-khoan" và "vstep".
  GITHUB_USER: "VSTEP-HUB",
  GITHUB_REPO: "vstep-hub.github.io",

  // Danh sách dự phòng nếu không lấy được danh sách tự động
  // (ví dụ khi mở thử trên máy). Ghi tên file, ví dụ: ["bai-1.html"]
  DANH_SACH_DU_PHONG: ["bai-mau-reading.html"]
};

/* ---------- Nhận ra kho GitHub từ địa chỉ trang ---------- */
function layKhoGitHub() {
  if (CAU_HINH.GITHUB_USER && CAU_HINH.GITHUB_REPO) {
    return { user: CAU_HINH.GITHUB_USER, repo: CAU_HINH.GITHUB_REPO };
  }
  var host = location.hostname.toLowerCase();
  if (!/\.github\.io$/.test(host)) return null;
  var user = host.split(".")[0];
  var doanDau = location.pathname.split("/")[1] || "";
  var repo = (doanDau && doanDau.indexOf(".") === -1) ? doanDau : user + ".github.io";
  return { user: user, repo: repo };
}

/* ---------- Bộ đếm (dịch vụ miễn phí Abacus) ---------- */
var MAY_DEM = "https://abacus.jasoncameron.dev";

function vietTat(s) {
  return String(s).toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function bam(s) { // mã ngắn để tên khoá không bị trùng
  var h = 0;
  for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
  return (h >>> 0).toString(36);
}

function khongGianDem() {
  var kho = layKhoGitHub();
  var goc = kho ? ("vstep-" + kho.user + "-" + kho.repo) : "vstep-thu-nghiem-may-ca-nhan";
  return vietTat(goc).slice(0, 60);
}

function khoaBai(tenFile) {
  return ("bai-" + vietTat(tenFile).slice(0, 40) + "-" + bam(tenFile)).slice(0, 60);
}

function demTang(khoa) { // +1 và trả về số mới
  return fetch(MAY_DEM + "/hit/" + khongGianDem() + "/" + khoa)
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { return d && typeof d.value === "number" ? d.value : null; })
    .catch(function () { return null; });
}

function docSoDem(khoa) { // chỉ đọc, không tăng
  return fetch(MAY_DEM + "/get/" + khongGianDem() + "/" + khoa)
    .then(function (r) { return r.status === 404 ? { value: 0 } : (r.ok ? r.json() : null); })
    .then(function (d) { return d && typeof d.value === "number" ? d.value : null; })
    .catch(function () { return null; });
}

function dinhDangSo(n) {
  return (n === null || n === undefined) ? "—" : Number(n).toLocaleString("vi-VN");
}

/* ---------- Bộ nhớ tạm an toàn ---------- */
function luuTam(kieu, khoa, giaTri) {
  try { window[kieu].setItem(khoa, giaTri); } catch (e) {}
}
function docTam(kieu, khoa) {
  try { return window[kieu].getItem(khoa); } catch (e) { return null; }
}

/* ---------- Danh sách bài tập ----------
   Trả về mảng { file: "ten.html", title: "..." }.
   Ưu tiên danh-sach.json (Cloudflare tự tạo), sau đó hỏi GitHub. */
function layDanhSachBai() {
  return fetch("danh-sach.json?t=" + Date.now())
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (ds) {
      if (!Array.isArray(ds)) throw new Error("sai dinh dang");
      return ds.map(function (x) {
        return typeof x === "string" ? { file: x, title: "" } : { file: x.file, title: x.title || "" };
      });
    })
    .catch(function () {
      return layDanhSachTuGitHub().then(function (ds) {
        return ds.map(function (f) { return { file: f, title: "" }; });
      });
    });
}

function layDanhSachTuGitHub() {
  var kho = layKhoGitHub();
  if (!kho) return Promise.resolve(CAU_HINH.DANH_SACH_DU_PHONG.slice());

  var khoaCache = "vstep-ds-" + kho.user + "-" + kho.repo;
  var cache = null;
  try { cache = JSON.parse(docTam("localStorage", khoaCache) || "null"); } catch (e) {}
  if (cache && Date.now() - cache.luc < 5 * 60 * 1000) return Promise.resolve(cache.ds);

  var url = "https://api.github.com/repos/" + kho.user + "/" + kho.repo +
            "/contents/" + CAU_HINH.THU_MUC_BAI + "?t=" + Date.now();
  return fetch(url, { headers: { "Accept": "application/vnd.github+json" } })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (ds) {
      var tenFile = ds.filter(function (f) {
        return f.type === "file" && /\.html?$/i.test(f.name);
      }).map(function (f) { return f.name; });
      luuTam("localStorage", khoaCache, JSON.stringify({ luc: Date.now(), ds: tenFile }));
      return tenFile;
    })
    .catch(function () {
      if (cache) return cache.ds;                 // dùng danh sách cũ nếu tạm thời lỗi
      return CAU_HINH.DANH_SACH_DU_PHONG.slice();
    });
}

function tenTuFile(tenFile) {
  var t = tenFile.replace(/\.html?$/i, "").replace(/[-_]+/g, " ").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function duongDanBai(tenFile) {
  return CAU_HINH.THU_MUC_BAI + "/" + encodeURIComponent(tenFile);
}

/* Lấy <title> trong file bài (nếu có) để hiện tên đẹp hơn */
function layTieuDe(tenFile) {
  return fetch(duongDanBai(tenFile))
    .then(function (r) { return r.ok ? r.text() : ""; })
    .then(function (html) {
      var m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      var t = m ? m[1].replace(/\s+/g, " ").trim() : "";
      if (!t) return tenTuFile(tenFile);
      var tam = document.createElement("textarea");
      tam.innerHTML = t;
      return tam.value;
    })
    .catch(function () { return tenTuFile(tenFile); });
}
