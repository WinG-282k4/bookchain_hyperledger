// qlsach-frontend/src/components/ResetPassword.js
import React, { useState, useEffect } from "react";
import { Form, Button, Card, Container, Alert } from "react-bootstrap";
import { authAPI } from "../services/api";

const ResetPassword = () => {
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) setToken(t);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (newPassword !== confirm)
      return setError("Mat khau xac nhan khong khop");
    try {
      const res = await authAPI.resetPassword(token, newPassword);
      if (res.data && res.data.success) {
        setMessage(res.data.message);
        setTimeout(() => (window.location.href = "/login"), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Loi server");
    }
  };

  return (
    <Container style={{ maxWidth: "480px", marginTop: "80px" }}>
      <Card>
        <Card.Body>
          <h3 className="mb-3">Dat lai mat khau</h3>
          {message && <Alert variant="success">{message}</Alert>}
          {error && <Alert variant="danger">{error}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Token</Form.Label>
              <Form.Control
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Mat khau moi</Form.Label>
              <Form.Control
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Xac nhan mat khau</Form.Label>
              <Form.Control
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </Form.Group>

            <Button type="submit">Dat lai mat khau</Button>
          </Form>

          <div className="mt-3">
            <a href="/login">Quay lai dang nhap</a>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ResetPassword;
