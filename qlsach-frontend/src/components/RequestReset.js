// qlsach-frontend/src/components/RequestReset.js
import React, { useState } from "react";
import { Form, Button, Card, Container, Alert } from "react-bootstrap";
import { authAPI } from "../services/api";

const RequestReset = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    try {
      const res = await authAPI.requestReset(username, email);
      if (res.data && res.data.success) {
        setMessage(res.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Loi server");
    }
  };

  return (
    <Container style={{ maxWidth: "480px", marginTop: "80px" }}>
      <Card>
        <Card.Body>
          <h3 className="mb-3">Yeu cau dat lai mat khau</h3>
          {message && <Alert variant="success">{message}</Alert>}
          {error && <Alert variant="danger">{error}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Username</Form.Label>
              <Form.Control
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Form.Group>

            <Button type="submit">Gui yeu cau</Button>
          </Form>
          <div className="mt-3">
            <a href="/login">Quay lai dang nhap</a>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default RequestReset;
