import React, { useEffect, useState } from "react";
import {
  Container,
  Table,
  Button,
  Form,
  Row,
  Col,
  Spinner,
  Alert,
} from "react-bootstrap";
import api, { salesAPI, authAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Reports() {
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [topSellers, setTopSellers] = useState(null);
  const [salesLoading, setSalesLoading] = useState(false);
  const { user, isAuthorized } = useAuth();
  const isAdmin = isAuthorized(["Admin"]);
  const [mgrForm, setMgrForm] = useState({
    username: "",
    password: "",
    fullName: "",
    fabricId: "",
    email: "",
  });
  const [mgrMsg, setMgrMsg] = useState(null);

  useEffect(() => {
    fetchList();
  }, []);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await api.get("/reports");
      if (res.data && res.data.success) setReports(res.data.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await api.post("/reports/generate", {
        type: "summary",
        format: "xlsx",
        period: "daily",
      });
      if (res.data && res.data.success) {
        await fetchList();
      }
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  };

  const fetchTopSellers = async (period = "1d") => {
    setSalesLoading(true);
    try {
      const res = await salesAPI.getTopSellers(period);
      if (res.data && res.data.success) setTopSellers(res.data.data);
    } catch (err) {
      console.error("Error fetching top sellers", err);
      setTopSellers(null);
    }
    setSalesLoading(false);
  };

  const handleCreateManager = async (e) => {
    e.preventDefault();
    setMgrMsg(null);
    try {
      const res = await authAPI.createManager(mgrForm);
      if (res.data && res.data.success) {
        setMgrMsg({ type: "success", text: "Manager created" });
        setMgrForm({
          username: "",
          password: "",
          fullName: "",
          fabricId: "",
          email: "",
        });
      }
    } catch (err) {
      console.error("create manager error", err);
      const text = err.response?.data?.error || err.message || "Error";
      setMgrMsg({ type: "danger", text });
    }
  };

  const handleDownload = (id) => {
    // Use authenticated API client to download blob so Authorization header is included
    (async () => {
      try {
        const res = await api.get(`/reports/${id}/download`, {
          responseType: "blob",
        });
        const disposition = res.headers["content-disposition"] || "";
        let filename = "";
        const match =
          /filename\*=UTF-8''(.+)$/.exec(disposition) ||
          /filename="?([^";]+)"?/.exec(disposition);
        if (match) filename = decodeURIComponent(match[1]);
        if (!filename) {
          // fallback: try to find file name from reports list
          const r = reports.find((x) => x.id === id);
          filename = r?.file || `report_${id}`;
        }
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Download error", err);
        alert("Khong tai duoc file. Kiem tra quyen truy cap va dang nhap.");
      }
    })();
  };

  if (loading)
    return (
      <div className="text-center py-4">
        <Spinner animation="border" />
      </div>
    );

  return (
    <Container className="mt-4">
      <Row className="mb-3">
        <Col>
          <h3>Reports</h3>
        </Col>
      </Row>
      <Form onSubmit={handleGenerate} className="mb-3">
        <Button type="submit" disabled={generating}>
          {generating ? "Generating..." : "Generate Daily Summary"}
        </Button>
      </Form>

      {/* Top sellers for the last day (Admin/Manager can view) */}
      <Row className="mb-3">
        <Col>
          <h5>Top Sellers</h5>
          <div className="mb-2">
            <Button
              size="sm"
              className="me-2"
              onClick={() => fetchTopSellers("1h")}
              disabled={salesLoading}
            >
              1 hour
            </Button>
            <Button
              size="sm"
              className="me-2"
              onClick={() => fetchTopSellers("1d")}
              disabled={salesLoading}
            >
              1 day
            </Button>
            <Button
              size="sm"
              onClick={() => fetchTopSellers("7d")}
              disabled={salesLoading}
            >
              7 days
            </Button>
          </div>
          {salesLoading && <Spinner animation="border" size="sm" />}
          {topSellers && (
            <Table striped bordered size="sm">
              <thead>
                <tr>
                  <th>Ma Sach</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {topSellers.top.map((t) => (
                  <tr key={t.maSach}>
                    <td>{t.maSach}</td>
                    <td>{t.count}</td>
                  </tr>
                ))}
                <tr>
                  <td>
                    <strong>Total Sold</strong>
                  </td>
                  <td>
                    <strong>{topSellers.totalSold}</strong>
                  </td>
                </tr>
              </tbody>
            </Table>
          )}
        </Col>
      </Row>

      {/* Manager creation (Admin only) */}
      {isAdmin && (
        <Row className="mb-4">
          <Col md={6}>
            <h5>Create Manager Account</h5>
            {mgrMsg && <Alert variant={mgrMsg.type}>{mgrMsg.text}</Alert>}
            <Form onSubmit={handleCreateManager}>
              <Form.Group className="mb-2">
                <Form.Label>Username</Form.Label>
                <Form.Control
                  value={mgrForm.username}
                  onChange={(e) =>
                    setMgrForm({ ...mgrForm, username: e.target.value })
                  }
                  required
                />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  value={mgrForm.password}
                  onChange={(e) =>
                    setMgrForm({ ...mgrForm, password: e.target.value })
                  }
                  required
                />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Full Name</Form.Label>
                <Form.Control
                  value={mgrForm.fullName}
                  onChange={(e) =>
                    setMgrForm({ ...mgrForm, fullName: e.target.value })
                  }
                />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Fabric ID</Form.Label>
                <Form.Control
                  value={mgrForm.fabricId}
                  onChange={(e) =>
                    setMgrForm({ ...mgrForm, fabricId: e.target.value })
                  }
                  required
                />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  value={mgrForm.email}
                  onChange={(e) =>
                    setMgrForm({ ...mgrForm, email: e.target.value })
                  }
                />
              </Form.Group>
              <Button type="submit">Create Manager</Button>
            </Form>
          </Col>
        </Row>
      )}

      <Table striped bordered>
        <thead>
          <tr>
            <th>ID</th>
            <th>File</th>
            <th>Type</th>
            <th>Created At</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.file}</td>
              <td>{r.type}</td>
              <td>{r.createdAt}</td>
              <td>
                <Button size="sm" onClick={() => handleDownload(r.id)}>
                  Download
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}
