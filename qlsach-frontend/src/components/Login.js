// qlsach-frontend/src/components/Login.js

import React, { useState } from "react";
import { Form, Button, Card, Alert, Container, Spinner } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, loading, authError, continueAsGuest } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await login(username, password);
    if (ok) {
      // redirect to home when login successful
      window.location.href = "/";
    }
  };

  return (
    <Container style={{ maxWidth: "400px", marginTop: "100px" }}>
      <Card className="shadow-lg">
        <Card.Body>
          <h2 className="text-center mb-4 text-primary">Login</h2>
          {authError && <Alert variant="danger">{authError}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="username">
              <Form.Label>Username</Form.Label>
              <Form.Control
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </Form.Group>

            <Form.Group className="mb-4" controlId="password">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </Form.Group>

            <Button
              variant="primary"
              type="submit"
              className="w-100"
              disabled={loading}
            >
              {loading ? <Spinner animation="border" size="sm" /> : "Login"}
            </Button>
            <Button
              variant="secondary"
              className="w-100 mt-2"
              onClick={() => {
                continueAsGuest();
                window.location.href = "/";
              }}
            >
              Continue as Guest
            </Button>
          </Form>
        </Card.Body>
        <div className="w-100 text-center mt-2 mb-3">
          <a href="/request-reset">Quen mat khau?</a>
        </div>
      </Card>
    </Container>
  );
};

export default Login;
