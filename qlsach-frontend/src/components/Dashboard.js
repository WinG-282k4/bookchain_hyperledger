import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Spinner } from "react-bootstrap";
import api from "../services/api";
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

  useEffect(() => {
    fetchMetrics();
    fetchTopTransactions();
    fetchTransactionsByHour();
  }, []);

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

  // Aggregate transactions per hour across all books by fetching each book history.
  const fetchTransactionsByHour = async () => {
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

      // Flatten and aggregate by hour (local time) and compute per-book counts for today
      const counts = new Array(24).fill(0);
      const perBookToday = {};
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
            const hr = date.getHours();
            counts[hr] = (counts[hr] || 0) + 1;
            // if the date is today (local), count for per-book today
            const now = new Date();
            if (
              date.getFullYear() === now.getFullYear() &&
              date.getMonth() === now.getMonth() &&
              date.getDate() === now.getDate()
            ) {
              perBookToday[ma] = (perBookToday[ma] || 0) + 1;
            }
          }
        }
      }

      const data = counts.map((c, h) => ({
        hour: `${String(h).padStart(2, "0")}:00`,
        count: c,
      }));
      setTxByHour(data);

      // compute top books today from perBookToday
      const topBooks = Object.keys(perBookToday).map((ma) => ({
        maSach: ma,
        count: perBookToday[ma],
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
              <h5>Transactions per Hour (today)</h5>
              {txHourLoading || !txByHour ? (
                <div className="text-center py-3">
                  <Spinner animation="border" size="sm" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={txByHour}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
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
                <div className="text-center py-3">No transactions today</div>
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
    </Container>
  );
}
