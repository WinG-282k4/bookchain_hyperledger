const path = require("path");
const fs = require("fs");
const os = require("os");

// Optional dependency: sheetjs (xlsx)
let xlsx;
try {
  xlsx = require("xlsx");
} catch (e) {
  xlsx = null;
}

const reportsDir = path.join(process.cwd(), "reports");
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir);

// Helper: query all books from Fabric via provided contract connection
async function fetchAllBooks(conn) {
  if (!conn || !conn.contract) throw new Error("Fabric connection required");
  const result = await conn.contract.evaluateTransaction("queryAllSach");
  return JSON.parse(result.toString());
}

// Compute basic metrics from book list
function computeMetrics(books = [], period = "daily") {
  const totalTitles = books.length;
  const totalInventory = books.reduce((s, b) => s + Number(b.soLuong || 0), 0);

  // top categories
  const categories = {};
  const authors = {};
  books.forEach((b) => {
    const theLoai = b.theLoai || "Unknown";
    categories[theLoai] = (categories[theLoai] || 0) + 1;
    const a = b.tacGia || "Unknown";
    authors[a] = (authors[a] || 0) + 1;
  });

  const topCategories = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([k, v]) => ({ category: k, count: v }));

  const topAuthors = Object.entries(authors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([k, v]) => ({ author: k, count: v }));

  return {
    totalTitles,
    totalInventory,
    topCategories,
    topAuthors,
  };
}

// Save buffer or string to reports folder and write metadata
function saveReportFile(bufferOrString, filename, meta = {}) {
  const filePath = path.join(reportsDir, filename);
  if (Buffer.isBuffer(bufferOrString))
    fs.writeFileSync(filePath, bufferOrString);
  else fs.writeFileSync(filePath, String(bufferOrString), "utf8");

  // metadata index
  const indexFile = path.join(reportsDir, "index.json");
  let index = [];
  if (fs.existsSync(indexFile)) {
    try {
      index = JSON.parse(fs.readFileSync(indexFile, "utf8") || "[]");
    } catch (e) {
      index = [];
    }
  }
  const id = String(Date.now());
  const entry = Object.assign(
    { id, file: filename, createdAt: new Date().toISOString() },
    meta
  );
  index.unshift(entry);
  fs.writeFileSync(indexFile, JSON.stringify(index, null, 2), "utf8");
  return entry;
}

// Generate XLSX (if xlsx available) or fallback CSV
function buildWorkbookAndSave(books, filenameBase = "report") {
  const timestamp = Date.now();
  const xlsName = `${filenameBase}_${timestamp}.xlsx`;
  const csvName = `${filenameBase}_${timestamp}.csv`;

  const rows = books.map((b) => ({
    maSach: b.maSach || "",
    tenSach: b.tenSach || "",
    theLoai: b.theLoai || "",
    tacGia: b.tacGia || "",
    namXuatBan: b.namXuatBan || "",
    soLuong: b.soLuong || "",
  }));

  if (xlsx) {
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(rows);
    xlsx.utils.book_append_sheet(wb, ws, "Books");
    const outPath = path.join(reportsDir, xlsName);
    xlsx.writeFile(wb, outPath);
    return { filename: xlsName, path: outPath };
  }

  // fallback CSV
  const headers = [
    "maSach",
    "tenSach",
    "theLoai",
    "tacGia",
    "namXuatBan",
    "soLuong",
  ];
  const lines = [headers.join(",")].concat(
    rows.map((r) =>
      headers
        .map((h) => `"${String(r[h] || "").replace(/"/g, '""')}"`)
        .join(",")
    )
  );
  const outPath = path.join(reportsDir, csvName);
  fs.writeFileSync(outPath, lines.join(os.EOL), "utf8");
  return { filename: csvName, path: outPath };
}

module.exports = {
  // conn: an object with { gateway, contract } returned by connectToNetwork
  async getMetrics(conn, opts = {}) {
    const books = await fetchAllBooks(conn);
    const metrics = computeMetrics(books, opts.period);
    // include a small series example (counts per category)
    return { metrics, sample: { totalByCategory: metrics.topCategories } };
  },

  async generateReport(
    conn,
    { type = "summary", format = "xlsx", period = "daily", from, to } = {}
  ) {
    const books = await fetchAllBooks(conn);
    // for now type/dates ignored: full dump
    const { filename } = buildWorkbookAndSave(books, `books_${type}_${period}`);
    const meta = { type, period, format, from, to };
    const entry = saveReportFile(null, filename, meta);
    return entry;
  },

  listReports() {
    const indexFile = path.join(reportsDir, "index.json");
    if (!fs.existsSync(indexFile)) return [];
    try {
      return JSON.parse(fs.readFileSync(indexFile, "utf8") || "[]");
    } catch (e) {
      return [];
    }
  },

  getReportFilePath(idOrFilename) {
    // try index lookup
    const index = this.listReports();
    const found = index.find(
      (i) => i.id === idOrFilename || i.file === idOrFilename
    );
    if (found) return path.join(reportsDir, found.file);
    const maybe = path.join(reportsDir, String(idOrFilename));
    if (fs.existsSync(maybe)) return maybe;
    return null;
  },
};
