import React, { useState } from "react";
import { Form, Button, Card, Container, Alert } from "react-bootstrap";
import { authAPI } from "../services/api";

const ChangePassword = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    try {
      const res = await authAPI.changePassword(oldPassword, newPassword);
      if (res.data && res.data.success) {
        setMessage("Mat khau da thay doi");
        setOldPassword("");
        setNewPassword("");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Loi server");
    }
  };

  return (
    <Container style={{ maxWidth: "560px", marginTop: "80px" }}>
      <Card>
        <Card.Body>
          <h3 className="mb-3">Doi mat khau</h3>
          {message && <Alert variant="success">{message}</Alert>}
          {error && <Alert variant="danger">{error}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Mat khau cu</Form.Label>
              <Form.Control
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
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

            <Button type="submit">Doi mat khau</Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ChangePassword;
