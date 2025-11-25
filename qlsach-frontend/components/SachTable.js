// Cleaned SachTable (no-diacritics)
import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Alert,
  Spinner,
  Badge,
  Container,
  Row,
  Col,
  InputGroup,
  FormControl,
} from "react-bootstrap";
import { sachAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

const SachTable = () => {
  const { user, isAuthorized } = useAuth();
  const canWrite = isAuthorized(["Admin", "Manager"]);

  const [sachs, setSachs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [filterCategory, setFilterCategory] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSach, setCurrentSach] = useState({
    maSach: "",
    tenSach: "",
    theLoai: "",
    tacGia: "",
    namXuatBan: "",
    soLuong: "",
  });

  useEffect(() => {
    fetchSachs();
  }, []);

  const fetchSachs = async () => {
    setLoading(true);
    try {
      const response = await sachAPI.getAllSach();
      if (response.data && response.data.success) {
        const formattedData = response.data.data.map((item) =>
          item.Record ? item.Record : item
        );
        setSachs(formattedData);
      }
      setError(null);
    } catch (err) {
      setError("Khong tai duoc danh sach sach. " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = async () => {
    setLoading(true);
    try {
      if (!filterCategory.trim()) {
        await fetchSachs();
        return;
      }
      const response = await sachAPI.getSachByTheLoai(filterCategory);
      if (response.data && response.data.success) {
        const formattedData = response.data.data.map((item) =>
          item.Record ? item.Record : item
        );
        setSachs(formattedData);
        if (formattedData.length === 0)
          setError(
            `Khong tim thay sach nao thuoc the loai "${filterCategory}"`
          );
        else setError(null);
      }
    } catch (err) {
      setError("Loi khi tim kiem: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilter = () => {
    setFilterCategory("");
    fetchSachs();
    setError(null);
  };
  const handleInitData = async () => {
    if (!canWrite) {
      setError(
        "Ban khong co quyen Khoi tao du lieu. Vui long dang nhap bang tai khoan Admin/Manager."
      );
      return;
    }
    setLoading(true);
    try {
      await sachAPI.initData();
      setSuccess("Da khoi tao du lieu mau thanh cong!");
      await fetchSachs();
    } catch (err) {
      setError("Loi khi khoi tao du lieu: " + err.message);
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleDelete = async (maSach) => {
    if (!canWrite) {
      setError("Ban khong co quyen Xoa sach.");
      return;
    }
    if (!window.confirm(`Ban co chac chan muon xoa sach ${maSach}?`)) return;
    try {
      await sachAPI.deleteSach(maSach);
      setSuccess(`Da xoa sach ${maSach} thanh cong!`);
      if (filterCategory) handleFilter();
      else fetchSachs();
    } catch (err) {
      setError("Loi khi xoa sach: " + err.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentSach({ ...currentSach, [name]: value });
  };
  const handleShowAdd = () => {
    if (!canWrite) {
      setError("Ban khong co quyen Them sach moi.");
      return;
    }
    setIsEditing(false);
    setCurrentSach({
      maSach: "",
      tenSach: "",
      theLoai: "",
      tacGia: "",
      namXuatBan: "",
      soLuong: "",
    });
    setShowModal(true);
  };
  const handleShowEdit = (sach) => {
    if (!canWrite) {
      setError("Ban khong co quyen Sua sach.");
      return;
    }
    setIsEditing(true);
    setCurrentSach(sach);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canWrite) {
      setError("Ban khong co quyen Them/Sua sach.");
      return;
    }
    setLoading(true);
    try {
      if (isEditing) {
        await sachAPI.updateSach(currentSach.maSach, currentSach);
        setSuccess(`Cap nhat sach ${currentSach.maSach} thanh cong!`);
      } else {
        await sachAPI.createSach(currentSach);
        setSuccess(`Them sach ${currentSach.maSach} thanh cong!`);
      }
      setShowModal(false);
      if (filterCategory) handleFilter();
      else fetchSachs();
    } catch (err) {
      setError("Loi khi luu thong tin: " + err.message);
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  return (
    <Container className="mt-4">
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" onClose={() => setSuccess(null)} dismissible>
          {success}
        </Alert>
      )}

      <Row className="mb-3 g-2 justify-content-between align-items-center">
        <Col md={4} xs={12}>
          <h3 className="text-primary mb-0">Danh Sach Sach</h3>
        </Col>
        <Col md={4} xs={12} className="mt-3 mt-md-0">
          <InputGroup>
            <FormControl
              placeholder="Nhap the loai (VD: CNTT)"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleFilter()}
            />
            <Button variant="outline-secondary" onClick={handleFilter}>
              <i className="bi bi-search"></i> Tim
            </Button>
            {filterCategory && (
              <Button variant="outline-danger" onClick={handleResetFilter}>
                <i className="bi bi-x-lg"></i>
              </Button>
            )}
          </InputGroup>
        </Col>

        <Col md={4} xs={12} className="text-end mt-3 mt-md-0">
          {canWrite ? (
            <>
              <Button
                variant="warning"
                className="me-2"
                onClick={handleInitData}
                disabled={loading}
              >
                Khoi tao
              </Button>
              <Button
                variant="success"
                onClick={handleShowAdd}
                disabled={loading}
              >
                Them Moi
              </Button>
            </>
          ) : (
            <Button
              variant="info"
              onClick={() => (window.location.href = "/login")}
            >
              Dang nhap de Thao tac
            </Button>
          )}
        </Col>
      </Row>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Dang xu ly du lieu blockchain...</p>
        </div>
      ) : (
        <div className="table-responsive shadow-sm rounded">
          <Table striped bordered hover className="mb-0 align-middle">
            <thead className="bg-dark text-white">
              <tr>
                <th>Ma Sach</th>
                <th>Ten Sach</th>
                <th>The Loai</th>
                <th>Tac Gia</th>
                <th>Nam XB</th>
                <th>So Luong</th>
                <th className="text-center">Thao Tac</th>
              </tr>
            </thead>
            <tbody>
              {sachs.length > 0 ? (
                sachs.map((sach) => (
                  <tr key={sach.maSach}>
                    <td>
                      <Badge bg="secondary">{sach.maSach}</Badge>
                    </td>
                    <td className="fw-bold">{sach.tenSach}</td>
                    <td>
                      <Badge bg="info" text="dark">
                        {sach.theLoai}
                      </Badge>
                    </td>
                    <td>{sach.tacGia}</td>
                    <td>{sach.namXuatBan}</td>
                    <td>{sach.soLuong}</td>
                    <td className="text-center">
                      {canWrite ? (
                        <>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                            onClick={() => handleShowEdit(sach)}
                          >
                            Sua
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(sach.maSach)}
                          >
                            Xoa
                          </Button>
                        </>
                      ) : (
                        <Badge bg="secondary">Chi xem</Badge>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    {filterCategory
                      ? `Khong tim thay sach nao thuoc the loai "${filterCategory}"`
                      : "Chua co du lieu sach. Hay dang nhap voi quyen Admin/Manager de khoi tao."}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      )}

      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {isEditing ? "Cap Nhat Thong Tin Sach" : "Them Sach Moi"}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Ma Sach (*)</Form.Label>
              <Form.Control
                type="text"
                name="maSach"
                value={currentSach.maSach}
                onChange={handleInputChange}
                required
                disabled={isEditing}
                placeholder="Vi du: S001"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Ten Sach (*)</Form.Label>
              <Form.Control
                type="text"
                name="tenSach"
                value={currentSach.tenSach}
                onChange={handleInputChange}
                required
              />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>The Loai</Form.Label>
                  <Form.Control
                    type="text"
                    name="theLoai"
                    value={currentSach.theLoai}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>So Luong</Form.Label>
                  <Form.Control
                    type="number"
                    name="soLuong"
                    value={currentSach.soLuong}
                    onChange={handleInputChange}
                    required
                    min="0"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tac Gia</Form.Label>
                  <Form.Control
                    type="text"
                    name="tacGia"
                    value={currentSach.tacGia}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nam Xuat Ban</Form.Label>
                  <Form.Control
                    type="text"
                    name="namXuatBan"
                    value={currentSach.namXuatBan}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Huy
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? "Dang xu ly..." : isEditing ? "Cap Nhat" : "Them Moi"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default SachTable;
