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
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyQty, setBuyQty] = useState(1);
  const [buyItem, setBuyItem] = useState(null);

  // Load du lieu khi component duoc mount
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
        if (formattedData.length === 0) {
          setError(
            `Khong tim thay sach nao thuoc the loai "${filterCategory}"`
          );
        } else {
          setError(null);
        }
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

  // ---------------------- Import / Export Helpers ----------------------
  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lines.length === 0) return [];
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = [];
      let cur = "";
      let inQuotes = false;
      for (let chIndex = 0; chIndex < line.length; chIndex++) {
        const ch = line[chIndex];
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === "," && !inQuotes) {
          values.push(cur);
          cur = "";
        } else {
          cur += ch;
        }
      }
      values.push(cur);
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx] ? values[idx].trim().replace(/^"|"$/g, "") : "";
      });
      rows.push(obj);
    }
    return rows;
  };

  const downloadBlob = (content, filename, mime) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportCSV = (data) => {
    if (!data || data.length === 0) return;
    const headers = [
      "maSach",
      "tenSach",
      "theLoai",
      "tacGia",
      "namXuatBan",
      "soLuong",
    ];
    const lines = [headers.join(",")];
    data.forEach((d) => {
      const row = headers.map((h) => {
        const val = d[h] == null ? "" : String(d[h]);
        return val.includes(",") || val.includes('"')
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      });
      lines.push(row.join(","));
    });
    downloadBlob(
      lines.join("\r\n"),
      `sachs_export_${Date.now()}.csv`,
      "text/csv;charset=utf-8;"
    );
  };

  const exportExcel = (data) => {
    // lightweight Excel export: HTML table saved as .xls
    if (!data || data.length === 0) return;
    const headers = [
      "Ma Sach",
      "Ten Sach",
      "The Loai",
      "Tac Gia",
      "Nam XB",
      "So Luong",
    ];
    let html = "<table><thead><tr>";
    headers.forEach((h) => (html += `<th>${h}</th>`));
    html += "</tr></thead><tbody>";
    data.forEach((d) => {
      html += "<tr>";
      html += `<td>${d.maSach || ""}</td>`;
      html += `<td>${d.tenSach || ""}</td>`;
      html += `<td>${d.theLoai || ""}</td>`;
      html += `<td>${d.tacGia || ""}</td>`;
      html += `<td>${d.namXuatBan || ""}</td>`;
      html += `<td>${d.soLuong || ""}</td>`;
      html += "</tr>";
    });
    html += "</tbody></table>";
    downloadBlob(
      html,
      `sachs_export_${Date.now()}.xls`,
      "application/vnd.ms-excel"
    );
  };

  const exportPDF = (data) => {
    // Simple PDF via print: open new window with printable table
    if (!data || data.length === 0) return;
    const headers = [
      "Ma Sach",
      "Ten Sach",
      "The Loai",
      "Tac Gia",
      "Nam XB",
      "So Luong",
    ];
    let html = `<!doctype html><html><head><meta charset="utf-8"><title>Export PDF</title><style>table{width:100%;border-collapse:collapse}th,td{border:1px solid #333;padding:6px;font-size:12px}</style></head><body>`;
    html += "<h3>Danh sach sach</h3>";
    html += "<table><thead><tr>";
    headers.forEach((h) => (html += `<th>${h}</th>`));
    html += "</tr></thead><tbody>";
    data.forEach((d) => {
      html += "<tr>";
      html += `<td>${d.maSach || ""}</td>`;
      html += `<td>${d.tenSach || ""}</td>`;
      html += `<td>${d.theLoai || ""}</td>`;
      html += `<td>${d.tacGia || ""}</td>`;
      html += `<td>${d.namXuatBan || ""}</td>`;
      html += `<td>${d.soLuong || ""}</td>`;
      html += "</tr>";
    });
    html += "</tbody></table></body></html>";
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    // give it a moment to render then call print
    setTimeout(() => w.print(), 500);
  };

  return (
    <Container className="mt-4">
      {/* Thong bao loi hoac thanh cong */}
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

      {/* Thanh cong cu va Tim kiem */}
      <Row className="mb-3 g-2">
        <Col md={4}>
          <h3 className="text-primary mb-0">Danh Sach Sach</h3>
        </Col>

        {/* Form Tim kiem The loai */}
        <Col md={4}>
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

        <Col md={4} className="text-end">
          {/* Home button moved to top navigation */}

          {/* Import (only for write roles) and Export controls */}
          {canWrite && (
            <>
              <input
                id="import-file"
                type="file"
                accept=".csv,text/csv"
                style={{ display: "none" }}
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const text = await file.text();
                  const rows = parseCSV(text);
                  // expect header: maSach,tenSach,theLoai,tacGia,namXuatBan,soLuong
                  for (const row of rows) {
                    const item = {
                      maSach: row.maSach || row.MaSach || row["maSach"] || "",
                      tenSach:
                        row.tenSach || row.TenSach || row["tenSach"] || "",
                      theLoai:
                        row.theLoai || row.TheLoai || row["theLoai"] || "",
                      tacGia: row.tacGia || row.TacGia || row["tacGia"] || "",
                      namXuatBan:
                        row.namXuatBan || row.NamXB || row["namXuatBan"] || "",
                      soLuong:
                        row.soLuong || row.SoLuong || row["soLuong"] || 0,
                    };
                    try {
                      const exists = sachs.find(
                        (s) => s.maSach === item.maSach
                      );
                      if (exists) {
                        await sachAPI.updateSach(item.maSach, item);
                      } else {
                        await sachAPI.createSach(item);
                      }
                    } catch (err) {
                      console.error("Import error for", item, err);
                    }
                  }
                  fetchSachs();
                  e.target.value = null;
                }}
              />
              <Button
                variant="outline-secondary"
                className="me-2"
                onClick={() => document.getElementById("import-file").click()}
              >
                Import CSV
              </Button>
            </>
          )}

          <Button
            variant="outline-primary"
            className="me-2"
            onClick={() => exportCSV(sachs)}
            disabled={sachs.length === 0}
          >
            Export CSV
          </Button>
          <Button
            variant="outline-success"
            className="me-2"
            onClick={() => exportExcel(sachs)}
            disabled={sachs.length === 0}
          >
            Export Excel
          </Button>
          <Button
            variant="outline-dark"
            className="me-2"
            onClick={() => exportPDF(sachs)}
            disabled={sachs.length === 0}
          >
            Export PDF
          </Button>

          {canWrite && (
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
          )}
        </Col>
      </Row>

      {/* Bang du lieu */}
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
                      {/* Buy button for logged-in users */}
                      {user && (
                        <Button
                          variant="outline-success"
                          size="sm"
                          className="me-2"
                          onClick={() => {
                            setBuyItem(sach);
                            setBuyQty(1);
                            setShowBuyModal(true);
                          }}
                        >
                          Mua
                        </Button>
                      )}
                      {canWrite && (
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
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center text-muted py-4">
                    {filterCategory
                      ? `Khong tim thay sach nao thuoc the loai "${filterCategory}"`
                      : 'Chua co du lieu sach. Hay nhan "Khoi tao".'}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      )}

      {/* Modal Them/Sua Sach (Giu nguyen nhu cu) */}
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

      {/* Modal Mua Sach */}
      <Modal
        show={showBuyModal}
        onHide={() => setShowBuyModal(false)}
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>Mua sach {buyItem?.maSach || ""}</Modal.Title>
        </Modal.Header>
        <Form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!buyItem) return;
            try {
              setLoading(true);
              await sachAPI.buySach(buyItem.maSach, buyQty);
              setSuccess(`Mua ${buyQty} quyển ${buyItem.maSach} thanh cong.`);
              setShowBuyModal(false);
              await fetchSachs();
            } catch (err) {
              setError(
                "Loi khi mua: " +
                  (err.message || err.response?.data?.error || "")
              );
            } finally {
              setLoading(false);
              setTimeout(() => setSuccess(null), 3000);
            }
          }}
        >
          <Modal.Body>
            <p>
              <strong>{buyItem?.tenSach}</strong>
            </p>
            <Form.Group className="mb-3">
              <Form.Label>So luong mua</Form.Label>
              <Form.Control
                type="number"
                min="1"
                value={buyQty}
                onChange={(e) => setBuyQty(Number(e.target.value))}
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowBuyModal(false)}>
              Huy
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? "Dang xu ly..." : "Mua"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default SachTable;
