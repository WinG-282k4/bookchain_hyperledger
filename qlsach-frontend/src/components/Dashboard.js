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

  useEffect(() => {
    fetchMetrics();
    fetchTopTransactions();
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

      <Row>
        <Col md={12} className="mt-3">
          <Card>
            <Card.Body>
              <h5>Category Breakdown</h5>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
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
