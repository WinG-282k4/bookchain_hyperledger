import React, { useState } from "react";
import { Form, Button, Card, Container, Alert } from "react-bootstrap";
import { authAPI } from "../services/api";

const Register = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [fabricId, setFabricId] = useState("");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    try {
      const res = await authAPI.register({
        username,
        password,
        fullName,
        email,
        fabricId,
      });
      if (res.data && res.data.success) {
        setMessage("Dang ky thanh cong. Vui long dang nhap.");
        setTimeout(() => (window.location.href = "/login"), 1200);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Loi server");
    }
  };

  return (
    <Container style={{ maxWidth: "560px", marginTop: "80px" }}>
      <Card>
        <Card.Body>
          <h3 className="mb-3">Dang ky tai khoan</h3>
          {message && <Alert variant="success">{message}</Alert>}
          {error && <Alert variant="danger">{error}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Username</Form.Label>
              <Form.Control
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Full name</Form.Label>
              <Form.Control
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Fabric ID</Form.Label>
              <Form.Control
                value={fabricId}
                onChange={(e) => setFabricId(e.target.value)}
                required
              />
            </Form.Group>

            <Button type="submit">Dang ky</Button>
          </Form>

          <div className="mt-3">
            <a href="/login">Quay lai dang nhap</a>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Register;
