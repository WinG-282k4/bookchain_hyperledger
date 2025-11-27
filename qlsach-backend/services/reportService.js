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
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
const purchasesFile = path.join(dataDir, "purchases.json");
if (!fs.existsSync(purchasesFile))
  fs.writeFileSync(purchasesFile, "[]", "utf8");

// Helper: query all books from Fabric via provided contract connection
async function fetchAllBooks(conn) {
  if (!conn || !conn.contract) throw new Error("Fabric connection required");
  const result = await conn.contract.evaluateTransaction("queryAllSach");
  const raw = JSON.parse(result.toString());
  // normalize objects: many Fabric query results use { Key, Record } or { Record }
  if (Array.isArray(raw)) {
    return raw.map((r) => (r && r.Record ? r.Record : r));
  }
  return raw;
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
// Save report metadata (do NOT overwrite the generated file)
function saveReportMeta(filename, meta = {}) {
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
    const { filename, path: filePath } = buildWorkbookAndSave(
      books,
      `books_${type}_${period}`
    );
    // ensure file exists
    if (!fs.existsSync(path.join(reportsDir, filename))) {
      // if workbook function returned a path, use that
      if (filePath && fs.existsSync(filePath)) {
        // ok
      } else {
        throw new Error("Report file was not created");
      }
    }
    const meta = { type, period, format, from, to };
    const entry = saveReportMeta(filename, meta);
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

  // Purchases handling
  listPurchases() {
    try {
      return JSON.parse(fs.readFileSync(purchasesFile, "utf8") || "[]");
    } catch (e) {
      return [];
    }
  },

  recordPurchase({ maSach, quantity, buyer }) {
    const arr = this.listPurchases();
    const entry = {
      id: String(Date.now()),
      maSach,
      quantity: Number(quantity),
      buyer: buyer || "unknown",
      ts: Date.now(),
    };
    arr.push(entry);
    fs.writeFileSync(purchasesFile, JSON.stringify(arr, null, 2), "utf8");
    return entry;
  },

  // period: '1h'|'1d'|'7d'|'all'
  getTopSellers(period = "1d", limit = 10) {
    const now = Date.now();
    let windowMs = Infinity;
    if (period === "1h") windowMs = 1000 * 60 * 60;
    else if (period === "1d") windowMs = 1000 * 60 * 60 * 24;
    else if (period === "7d") windowMs = 1000 * 60 * 60 * 24 * 7;

    const purchases = this.listPurchases();
    const cutoff = windowMs === Infinity ? 0 : now - windowMs;
    const filtered = purchases.filter((p) => p.ts >= cutoff);
    const agg = {};
    let totalSold = 0;
    filtered.forEach((p) => {
      agg[p.maSach] = (agg[p.maSach] || 0) + Number(p.quantity || 0);
      totalSold += Number(p.quantity || 0);
    });
    const arr = Object.entries(agg).map(([maSach, count]) => ({
      maSach,
      count,
    }));
    arr.sort((a, b) => b.count - a.count);
    return { totalSold, top: arr.slice(0, limit) };
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
