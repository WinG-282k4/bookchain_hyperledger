import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Alert, Spinner, Badge, Container, Row, Col, InputGroup, FormControl } from 'react-bootstrap';
import { sachAPI } from '../services/api';

const SachTable = () => {
    // State quản lý dữ liệu và giao diện
    const [sachs, setSachs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    
    // State cho tìm kiếm
    const [filterCategory, setFilterCategory] = useState('');

    // State cho Modal (Thêm/Sửa)
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentSach, setCurrentSach] = useState({
        maSach: '',
        tenSach: '',
        theLoai: '',
        tacGia: '',
        namXuatBan: '',
        soLuong: ''
    });

    // Load dữ liệu khi component được mount
    useEffect(() => {
        fetchSachs();
    }, []);

    // Hàm lấy danh sách sách từ API
    const fetchSachs = async () => {
        setLoading(true);
        try {
            const response = await sachAPI.getAllSach();
            if (response.data && response.data.success) {
                const formattedData = response.data.data.map(item => item.Record ? item.Record : item);
                setSachs(formattedData);
            }
            setError(null);
        } catch (err) {
            setError('Không thể tải danh sách sách. ' + (err.message || ''));
        } finally {
            setLoading(false);
        }
    };

    // Hàm lọc sách theo thể loại
    const handleFilter = async () => {
        setLoading(true);
        try {
            // Nếu ô tìm kiếm trống, tải lại tất cả sách
            if (!filterCategory.trim()) {
                await fetchSachs();
                return;
            }

            const response = await sachAPI.getSachByTheLoai(filterCategory);
            if (response.data && response.data.success) {
                const formattedData = response.data.data.map(item => item.Record ? item.Record : item);
                setSachs(formattedData);
                if (formattedData.length === 0) {
                    setError(`Không tìm thấy sách nào thuộc thể loại "${filterCategory}"`);
                } else {
                    setError(null);
                }
            }
        } catch (err) {
            setError('Lỗi khi tìm kiếm: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Reset bộ lọc
    const handleResetFilter = () => {
        setFilterCategory('');
        fetchSachs();
        setError(null);
    };

    // Hàm khởi tạo dữ liệu mẫu
    const handleInitData = async () => {
        setLoading(true);
        try {
            await sachAPI.initData();
            setSuccess('Đã khởi tạo dữ liệu mẫu thành công!');
            await fetchSachs();
        } catch (err) {
            setError('Lỗi khi khởi tạo dữ liệu: ' + err.message);
        } finally {
            setLoading(false);
            setTimeout(() => setSuccess(null), 3000);
        }
    };

    // Hàm xóa sách
    const handleDelete = async (maSach) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa sách ${maSach}?`)) {
            try {
                await sachAPI.deleteSach(maSach);
                setSuccess(`Đã xóa sách ${maSach} thành công!`);
                // Nếu đang lọc thì gọi lại lọc, ngược lại gọi fetch all
                if (filterCategory) {
                    handleFilter();
                } else {
                    fetchSachs();
                }
            } catch (err) {
                setError('Lỗi khi xóa sách: ' + err.message);
            }
        }
    };

    // Xử lý thay đổi input trong form
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCurrentSach({ ...currentSach, [name]: value });
    };

    // Mở Modal để thêm mới
    const handleShowAdd = () => {
        setIsEditing(false);
        setCurrentSach({
            maSach: '',
            tenSach: '',
            theLoai: '',
            tacGia: '',
            namXuatBan: '',
            soLuong: ''
        });
        setShowModal(true);
    };

    // Mở Modal để sửa
    const handleShowEdit = (sach) => {
        setIsEditing(true);
        setCurrentSach(sach);
        setShowModal(true);
    };

    // Xử lý Submit form (Thêm hoặc Sửa)
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEditing) {
                await sachAPI.updateSach(currentSach.maSach, currentSach);
                setSuccess(`Cập nhật sách ${currentSach.maSach} thành công!`);
            } else {
                await sachAPI.createSach(currentSach);
                setSuccess(`Thêm sách ${currentSach.maSach} thành công!`);
            }
            setShowModal(false);
            // Refresh dữ liệu
            if (filterCategory) {
                handleFilter();
            } else {
                fetchSachs();
            }
        } catch (err) {
            setError('Lỗi khi lưu thông tin: ' + err.message);
        } finally {
            setLoading(false);
            setTimeout(() => setSuccess(null), 3000);
        }
    };

    return (
        <Container className="mt-4">
            {/* Thông báo lỗi hoặc thành công */}
            {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess(null)} dismissible>{success}</Alert>}

            {/* Thanh công cụ và Tìm kiếm */}
            <Row className="mb-3 g-2">
                <Col md={4}>
                    <h3 className="text-primary mb-0">Danh Sách Sách</h3>
                </Col>
                
                {/* Form Tìm kiếm Thể loại */}
                <Col md={4}>
                    <InputGroup>
                        <FormControl
                            placeholder="Nhập thể loại (VD: CNTT)"
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleFilter()}
                        />
                        <Button variant="outline-secondary" onClick={handleFilter}>
                            <i className="bi bi-search"></i> Tìm
                        </Button>
                        {filterCategory && (
                            <Button variant="outline-danger" onClick={handleResetFilter}>
                                <i className="bi bi-x-lg"></i>
                            </Button>
                        )}
                    </InputGroup>
                </Col>

                <Col md={4} className="text-end">
                    <Button variant="warning" className="me-2" onClick={handleInitData} disabled={loading}>
                         Khởi tạo 
                    </Button>
                    <Button variant="success" onClick={handleShowAdd} disabled={loading}>
                         Thêm Mới
                    </Button>
                </Col>
            </Row>

            {/* Bảng dữ liệu */}
            {loading ? (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-2">Đang xử lý dữ liệu blockchain...</p>
                </div>
            ) : (
                <div className="table-responsive shadow-sm rounded">
                    <Table striped bordered hover className="mb-0 align-middle">
                        <thead className="bg-dark text-white">
                            <tr>
                                <th>Mã Sách</th>
                                <th>Tên Sách</th>
                                <th>Thể Loại</th>
                                <th>Tác Giả</th>
                                <th>Năm XB</th>
                                <th>Số Lượng</th>
                                <th className="text-center">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sachs.length > 0 ? (
                                sachs.map((sach) => (
                                    <tr key={sach.maSach}>
                                        <td><Badge bg="secondary">{sach.maSach}</Badge></td>
                                        <td className="fw-bold">{sach.tenSach}</td>
                                        <td><Badge bg="info" text="dark">{sach.theLoai}</Badge></td>
                                        <td>{sach.tacGia}</td>
                                        <td>{sach.namXuatBan}</td>
                                        <td>{sach.soLuong}</td>
                                        <td className="text-center">
                                            <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleShowEdit(sach)}>
                                                Sửa
                                            </Button>
                                            <Button variant="outline-danger" size="sm" onClick={() => handleDelete(sach.maSach)}>
                                                Xóa
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="text-center text-muted py-4">
                                        {filterCategory 
                                            ? `Không tìm thấy sách nào thuộc thể loại "${filterCategory}"`
                                            : 'Chưa có dữ liệu sách. Hãy nhấn "Khởi tạo".'
                                        }
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </div>
            )}

            {/* Modal Thêm/Sửa Sách (Giữ nguyên như cũ) */}
            <Modal show={showModal} onHide={() => setShowModal(false)} backdrop="static">
                <Modal.Header closeButton>
                    <Modal.Title>{isEditing ? 'Cập Nhật Thông Tin Sách' : 'Thêm Sách Mới'}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Mã Sách (*)</Form.Label>
                            <Form.Control 
                                type="text" 
                                name="maSach" 
                                value={currentSach.maSach} 
                                onChange={handleInputChange} 
                                required 
                                disabled={isEditing}
                                placeholder="Ví dụ: S001"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Tên Sách (*)</Form.Label>
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
                                    <Form.Label>Thể Loại</Form.Label>
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
                                    <Form.Label>Số Lượng</Form.Label>
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
                                    <Form.Label>Tác Giả</Form.Label>
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
                                    <Form.Label>Năm Xuất Bản</Form.Label>
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
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Hủy</Button>
                        <Button variant="primary" type="submit" disabled={loading}>
                            {loading ? 'Đang xử lý...' : (isEditing ? 'Cập Nhật' : 'Thêm Mới')}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default SachTable;