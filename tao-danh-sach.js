// Cloudflare chạy file này mỗi khi có bài mới được tải lên GitHub.
// Nó tạo file danh-sach.json liệt kê các bài trong thư mục "baitap".
// Không cần sửa gì trong file này.
const fs = require("fs");
const path = require("path");

const thuMuc = path.join(__dirname, "baitap");
const ds = fs.existsSync(thuMuc)
  ? fs.readdirSync(thuMuc).filter((f) => /\.html?$/i.test(f))
  : [];

const ketQua = ds.map((file) => {
  let title = "";
  try {
    const html = fs.readFileSync(path.join(thuMuc, file), "utf8");
    const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (m) title = m[1].replace(/\s+/g, " ").trim();
  } catch (e) {}
  return { file, title };
});

fs.writeFileSync(path.join(__dirname, "danh-sach.json"), JSON.stringify(ketQua, null, 1));
console.log("Đã tạo danh-sach.json với " + ketQua.length + " bài.");
