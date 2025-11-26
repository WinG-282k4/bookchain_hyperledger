import React, { useEffect, useState } from "react";
import {
  Container,
  Table,
  Button,
  Form,
  Row,
  Col,
  Spinner,
} from "react-bootstrap";
import api from "../services/api";

export default function Reports() {
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [generating, setGenerating] = useState(false);

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

  const handleDownload = (id) => {
    window.location.href = `/api/reports/${id}/download`;
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
