import React, { useEffect, useState } from "react";
import { Form, Button, Card, Container, Alert } from "react-bootstrap";
import { authAPI } from "../services/api";

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authAPI.getProfile();
        if (res.data && res.data.success) {
          setProfile(res.data.data);
        }
      } catch (err) {
        setError(err.response?.data?.error || err.message || "Loi");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleChange = (field, value) => {
    setProfile((p) => ({ ...p, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    try {
      const payload = {
        username: profile.username,
        email: profile.email,
        fullName: profile.fullName,
        sdt: profile.sdt,
      };

      const res = await authAPI.updateProfile(payload);
      if (res.data && res.data.success) {
        setMessage("Cap nhat thong tin thanh cong");
        // update localStorage user if present
        try {
          const stored = localStorage.getItem("user");
          if (stored) {
            const u = JSON.parse(stored);
            u.username = res.data.data.username || u.username;
            localStorage.setItem("user", JSON.stringify(u));
          }
        } catch (e) {}
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Loi server");
    }
  };

  if (loading) return <div>Loading...</div>;

  if (!profile) return <div>Khong tim thay thong tin nguoi dung</div>;

  return (
    <Container style={{ maxWidth: "640px", marginTop: "80px" }}>
      <Card>
        <Card.Body>
          <h3 className="mb-3">Ho so</h3>
          {message && <Alert variant="success">{message}</Alert>}
          {error && <Alert variant="danger">{error}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Username</Form.Label>
              <Form.Control
                value={profile.username || ""}
                onChange={(e) => handleChange("username", e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={profile.email || ""}
                onChange={(e) => handleChange("email", e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Full name</Form.Label>
              <Form.Control
                value={profile.fullName || ""}
                onChange={(e) => handleChange("fullName", e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>SDT</Form.Label>
              <Form.Control
                value={profile.sdt || ""}
                onChange={(e) => handleChange("sdt", e.target.value)}
              />
            </Form.Group>

            {/* Password changes are handled separately in the Change Password page */}

            <Button type="submit">Cap nhat</Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Profile;
