import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Spinner, Tabs, Tab } from "react-bootstrap";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";

const KPI = ({ title, value }) => (
  <Card className="mb-3">
    <Card.Body>
      <h6 className="text-muted">{title}</h6>
      <h3>{value}</h3>
    </Card.Body>
  </Card>
);

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [topTx, setTopTx] = useState(null);
  const [txLoading, setTxLoading] = useState(false);
  const [txByHour, setTxByHour] = useState(null);
  const [txHourLoading, setTxHourLoading] = useState(false);
  const [topBooksToday, setTopBooksToday] = useState([]);
  const [txGranularity, setTxGranularity] = useState("hour"); // minute | hour | day
  const [myBooks, setMyBooks] = useState(null);
  const [myBooksLoading, setMyBooksLoading] = useState(false);
  const { user } = useAuth();
  const canSeeMyBooks = user && user.role === "User";

  useEffect(() => {
    fetchMetrics();
    fetchTopTransactions();
    fetchMyBooks();
  }, []);

  // Re-fetch transactions chart when granularity changes
  useEffect(() => {
    fetchTransactionsByGranularity(txGranularity);
  }, [txGranularity]);

  const fetchMyBooks = async () => {
    setMyBooksLoading(true);
    try {
      const res = await api.get("/my-books");
      if (res.data && res.data.success) setMyBooks(res.data.data || []);
      else setMyBooks([]);
    } catch (err) {
      console.error("fetchMyBooks", err);
      setMyBooks([]);
    } finally {
      setMyBooksLoading(false);
    }
  };

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await api.get("/dashboard/metrics?period=daily");
      if (res.data && res.data.success) setMetrics(res.data.data.metrics);
    } catch (err) {
      console.error("fetchMetrics", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopTransactions = async () => {
    setTxLoading(true);
    try {
      const res = await api.get("/reports/transactions?limit=10");
      if (res.data && res.data.success) setTopTx(res.data.data.top);
    } catch (err) {
      console.error("fetchTopTransactions", err);
    } finally {
      setTxLoading(false);
    }
  };

  // Aggregate transactions across all books by fetching each book history.
  // granularity: 'minute' => last 60 minutes per-minute buckets
  // 'hour' => last 24 hours per-hour buckets
  // 'day' => last 7 days per-day buckets
  const fetchTransactionsByGranularity = async (granularity = "hour") => {
    setTxHourLoading(true);
    try {
      // get all books
      const allRes = await api.get("/sach");
      const all =
        allRes.data && allRes.data.success && Array.isArray(allRes.data.data)
          ? allRes.data.data
          : [];

      // For each book, fetch history (public endpoint) and keep ma
      const historyPromises = all.map(async (item) => {
        const ma = item.Record ? item.Record.maSach : item.maSach || item.Key;
        try {
          const hisRes = await api.get(`/sach/${ma}/history`);
          if (hisRes.data && hisRes.data.success)
            return { ma, history: hisRes.data.data || [] };
        } catch (e) {
          console.warn("history fetch failed for", ma, e.message || e);
        }
        return { ma, history: [] };
      });

      const allHistories = await Promise.all(historyPromises);

      // Choose buckets based on granularity
      let buckets = 24;
      let bucketMs = 60 * 60 * 1000; // default 1 hour
      if (granularity === "minute") {
        buckets = 60;
        bucketMs = 60 * 1000;
      } else if (granularity === "hour") {
        buckets = 24;
        bucketMs = 60 * 60 * 1000;
      } else if (granularity === "day") {
        buckets = 7;
        bucketMs = 24 * 60 * 60 * 1000;
      }

      const nowMs = Date.now();
      const windowStart = nowMs - buckets * bucketMs;

      const counts = new Array(buckets).fill(0);
      const perBookWindow = {};
      for (const arr of allHistories) {
        // arr is now { ma, history }
        if (!arr || !Array.isArray(arr.history)) continue;
        const ma = arr.ma;
        for (const entry of arr.history) {
          let ts =
            entry.timestamp ||
            entry.time ||
            entry.TxTimestamp ||
            entry.txTimestamp ||
            entry.timeStamp ||
            null;
          if (
            !ts &&
            entry["timestamp"] === undefined &&
            typeof entry === "string"
          ) {
            // sometimes entry may be a raw string
            ts = entry;
          }
          let date = null;
          if (ts) {
            try {
              // some timestamps may be ISO or locale strings or numbers
              if (typeof ts === "object" && ts.seconds) {
                const secs =
                  typeof ts.seconds === "function" ? ts.seconds() : ts.seconds;
                const nanos = ts.nanos || 0;
                date = new Date(Number(secs) * 1000 + Number(nanos) / 1000000);
              } else if (typeof ts === "number") date = new Date(ts);
              else date = new Date(String(ts));
            } catch (e) {
              date = null;
            }
          }
          if (date && !isNaN(date.getTime())) {
            const ms = date.getTime();
            if (ms >= windowStart && ms <= nowMs) {
              const idx = Math.floor((ms - windowStart) / bucketMs);
              if (idx >= 0 && idx < buckets)
                counts[idx] = (counts[idx] || 0) + 1;
              perBookWindow[ma] = (perBookWindow[ma] || 0) + 1;
            }
          }
        }
      }
      // build labels from windowStart
      const data = counts.map((c, i) => {
        const startMs = windowStart + i * bucketMs;
        const d = new Date(startMs);
        let label = "";
        if (granularity === "minute") {
          label = `${String(d.getHours()).padStart(2, "0")}:${String(
            d.getMinutes()
          ).padStart(2, "0")}`;
        } else if (granularity === "hour") {
          label = `${String(d.getHours()).padStart(2, "0")}:00`;
        } else {
          label = d.toLocaleDateString();
        }
        return { label, count: c };
      });
      setTxByHour(data);

      // compute top books in the window
      const topBooks = Object.keys(perBookWindow).map((ma) => ({
        maSach: ma,
        count: perBookWindow[ma],
      }));
      topBooks.sort((a, b) => b.count - a.count);
      setTopBooksToday(topBooks.slice(0, 20));
    } catch (err) {
      console.error("fetchTransactionsByHour", err);
      setTxByHour(null);
    } finally {
      setTxHourLoading(false);
    }
  };

  if (loading || !metrics)
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );

  const chartData = metrics.topCategories.map((c, i) => ({
    name: c.category,
    value: c.count,
  }));

  const booksChartData = (topBooksToday || []).map((b) => ({
    name: b.maSach,
    value: b.count,
  }));

  return (
    <Container className="mt-4">
      <Tabs defaultActiveKey="overview" id="dashboard-tabs" className="mb-3">
        <Tab eventKey="overview" title="Overview">
          <Row>
            <Col md={3}>
              <KPI title="Total Titles" value={metrics.totalTitles} />
            </Col>
            <Col md={3}>
              <KPI title="Total Inventory" value={metrics.totalInventory} />
            </Col>
            <Col md={3}>
              <KPI
                title="Top Category"
                value={(metrics.topCategories[0] || {}).category || "-"}
              />
            </Col>
            <Col md={3}>
              <KPI
                title="Top Author"
                value={(metrics.topAuthors[0] || {}).author || "-"}
              />
            </Col>
          </Row>

          <Row className="mt-3">
            <Col md={12}>
              <Card>
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                      Transactions (
                      {txGranularity === "minute"
                        ? "per minute"
                        : txGranularity === "hour"
                        ? "per hour"
                        : "per day"}
                      )
                    </h5>
                    <div>
                      <select
                        className="form-select form-select-sm"
                        value={txGranularity}
                        onChange={(e) => setTxGranularity(e.target.value)}
                        style={{ width: 220 }}
                      >
                        <option value="minute">
                          Per Minute (last 60 minutes)
                        </option>
                        <option value="hour">Per Hour (last 24 hours)</option>
                        <option value="day">Per Day (last 7 days)</option>
                      </select>
                    </div>
                  </div>
                  {txHourLoading || !txByHour ? (
                    <div className="text-center py-3">
                      <Spinner animation="border" size="sm" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={txByHour}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#82ca9d"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col md={12} className="mt-3">
              <Card>
                <Card.Body>
                  <h5>Top Books Today (transactions)</h5>
                  {!booksChartData || booksChartData.length === 0 ? (
                    <div className="text-center py-3">
                      No transactions today
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={booksChartData}
                        layout="vertical"
                        margin={{ left: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={150} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="mt-3">
            <Col md={6}>
              <Card>
                <Card.Body>
                  <h5>Top 10 Authors</h5>
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Author</th>
                        <th>Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(metrics.topAuthors || []).slice(0, 10).map((a, idx) => (
                        <tr key={a.author + idx}>
                          <td>{idx + 1}</td>
                          <td>{a.author}</td>
                          <td>{a.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card>
                <Card.Body>
                  <h5>Top Books by Transactions</h5>
                  {txLoading ? (
                    <div className="text-center py-3">
                      <Spinner animation="border" size="sm" />
                    </div>
                  ) : (
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Ma Sach</th>
                          <th>Tx Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(topTx || []).map((t, idx) => (
                          <tr key={t.maSach}>
                            <td>{idx + 1}</td>
                            <td>{t.maSach}</td>
                            <td>{t.transactions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        {canSeeMyBooks && (
          <Tab eventKey="mybooks" title="My Purchased Books">
            <Row className="mt-3">
              <Col md={12}>
                <Card>
                  <Card.Body>
                    {myBooksLoading ? (
                      <div className="text-center py-3">
                        <Spinner animation="border" size="sm" />
                      </div>
                    ) : !myBooks || myBooks.length === 0 ? (
                      <div className="text-center py-3">
                        You have not purchased any books yet.
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-sm mb-0">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Ma Sach</th>
                              <th>So luong so huu</th>
                            </tr>
                          </thead>
                          <tbody>
                            {myBooks.map((b, idx) => (
                              <tr key={b.maSach + idx}>
                                <td>{idx + 1}</td>
                                <td>{b.maSach}</td>
                                <td>
                                  {b.soLuongSoHuu ||
                                    b.soLuong ||
                                    b.quantity ||
                                    0}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>
        )}
      </Tabs>
    </Container>
  );
}
