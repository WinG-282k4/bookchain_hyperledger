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

  useEffect(() => {
    fetchMetrics();
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
                <LineChart data={chartData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
