# Dự án Blockchain Quản lý Sách

Dự án demo Hyperledger Fabric (Chaincode, Node.js API, React.js Frontend).

## Yêu cầu

- Node.js 16+ và `npm`
- Docker & Docker Compose (dùng cho Fabric test network)
- Git
- Hyperledger Fabric samples (ví dụ: `fabric-samples` với `test-network`) và các binary của Fabric
- Trên Windows: dùng **Git Bash** hoặc **WSL** để chạy các script của Fabric (`network.sh`). Nếu chạy PowerShell thì cần lưu ý đường dẫn tuyệt đối và quyền thực thi.

## Cấu trúc dự án

- `chaincode/javascript`: Smart Contract (chaincode) bằng Node.js
- `qlsach-backend`: API server (Node.js / Express) kết nối tới Fabric
- `qlsach-frontend`: React app (giao diện)

## Tổng quan các bước

1. Chuẩn bị và khởi động Fabric Test Network (từ `fabric-samples/test-network`).
2. Cài đặt dependency cho `chaincode/javascript`, `qlsach-backend`, `qlsach-frontend`.
3. Triển khai chaincode lên mạng (deploy CC).
4. Enroll admin, register user (thực hiện trong `qlsach-backend`).
5. Khởi động backend và frontend.

---

## Hướng dẫn chi tiết (Quick Start)

Lưu ý: phần hướng dẫn này giả sử bạn đã có `fabric-samples` trên máy và sẽ chạy các script mạng từ Git Bash / WSL. Nếu bạn đặt `fabric-samples` ở vị trí khác, thay các đường dẫn tương ứng hoặc chỉnh `ccpPath` trong các file `qlsach-backend/*.js`.

1. Chuẩn bị Fabric test network (ví dụ chạy trong Git Bash / WSL)

```bash
git clone https://github.com/hyperledger/fabric-samples.git
cd fabric-samples/test-network
./network.sh up createChannel -c mychannel -s couchdb
```

Triển khai chaincode (từ thư mục `fabric-samples/test-network`)

```bash
# Thay /absolute/path/to/... bằng đường dẫn tuyệt đối tới thư mục chaincode của bạn
./network.sh deployCC -ccn qlsach -ccp /absolute/path/to/bookchain_hyperledger/chaincode/javascript -ccl javascript
```

Ghi chú: một số phiên bản của `fabric-samples` có lệnh `deployCC` hoặc `deployCC.sh`. Nếu không có, bạn cần thực hiện các bước package/install/approve/commit chaincode bằng `peer lifecycle` theo tài liệu Fabric.

2. Cài dependencies cho chaincode (tại repo này)

```powershell
cd C:\path\to\bookchain_hyperledger\chaincode\javascript
npm install
```

3. Backend (API server)

```powershell
cd C:\path\to\bookchain_hyperledger\qlsach-backend
npm install
# Enroll admin (tạo identity admin trong wallet)
node enrollAdmin.js
# Register user (mặc định mã user được đặt trong file registerUser.js)
node registerUser.js
# Chạy server
npm start
```

Ghi chú quan trọng:

- Các file `enrollAdmin.js`, `registerUser.js`, `server.js` hiện đang sử dụng đường dẫn kết nối tĩnh tới `connection-org1.json` tại `/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json`.
- Nếu `fabric-samples` không nằm ở `/fabric-samples`, hãy sửa biến `ccpPath` trong các file này sang đường dẫn chính xác trên máy của bạn (ví dụ `C:\Users\...\fabric-samples\test-network\organizations\...\connection-org1.json`) hoặc chạy script trong WSL/Git Bash và sử dụng đường dẫn tương ứng.

4. Frontend (React)

```powershell
cd C:\path\to\bookchain_hyperledger\qlsach-frontend
npm install
npm start
```

Front-end mặc định chạy ở `http://localhost:3000`. Backend mặc định chạy ở `http://localhost:3006` (xem `qlsach-backend/server.js`). Nếu cần, chỉnh URL API trong `qlsach-frontend/src/services/api.js`.

If your backend runs on a VM reachable at `192.168.31.60` and your frontend is served from a different port (for example `8006`), set the following environment variables:

- In backend `.env` (qlsach-backend):

```
FRONTEND_URL=http://192.168.31.60:8006
```

- In frontend `.env` (qlsach-frontend):

```
REACT_APP_API_BASE=http://192.168.31.60:3006/api
```

This ensures the frontend on `http://192.168.31.60:8006` can reach the API on `http://192.168.31.60:3006` and that password-reset emails include links pointing to the frontend URL.

---

## Lời khuyên & Troubleshooting

- Nếu gặp lỗi kết nối tới Fabric: đảm bảo test network đang chạy và channel `mychannel` tồn tại.
- Nếu thấy thông báo "User identity not found in wallet": chạy `node enrollAdmin.js` rồi `node registerUser.js` trước khi khởi động server.
- Phiên bản Node.js không tương thích có thể gây lỗi `grpc` hoặc `fabric-network`: dùng Node.js 16 hoặc 18.
- Trên Windows, chạy script shell của Fabric (ví dụ `network.sh`) tốt nhất trong **Git Bash** hoặc **WSL**. PowerShell thường không chạy shell script UNIX trực tiếp.
- Nếu muốn sửa đường dẫn `connection-org1.json`, mở `qlsach-backend/enrollAdmin.js`, `qlsach-backend/registerUser.js`, `qlsach-backend/server.js` và cập nhật `ccpPath`.

## Tóm tắt các lệnh hay dùng (PowerShell)

```powershell
# Từ root project
cd C:\path\to\bookchain_hyperledger\chaincode\javascript; npm install
cd ..\qlsach-backend; npm install; node enrollAdmin.js; node registerUser.js; npm start
cd ..\qlsach-frontend; npm install; npm start
```

---

## Dashboard, Báo cáo định kỳ, Biểu đồ, Xuất báo cáo

Trong phiên bản này có một prototype báo cáo và dashboard cơ bản. Phần này mô tả chức năng, API liên quan và cách kiểm tra nhanh.

### 1) Mô tả chức năng

- **Dashboard**: trang tổng quan hiển thị KPI (số tựa sách, tổng tồn kho, top thể loại/tác giả) và biểu đồ.
- **Báo cáo định kỳ**: job cron sinh báo cáo hàng ngày và lưu file vào `qlsach-backend/reports/`.
- **Tạo báo cáo theo yêu cầu**: Admin/Manager có thể tạo báo cáo bằng API hoặc trang `Reports`.
- **Xuất báo cáo**: file `.xlsx` nếu cài `xlsx` (SheetJS), ngược lại tạo `.csv`.

### 2) API mới (đặt dưới `/api`)

- `GET /api/dashboard/metrics?period=daily` — trả về KPI cho Dashboard (guest có thể truy vấn).
- `POST /api/reports/generate` — tạo báo cáo theo yêu cầu (yêu cầu JWT + role Admin/Manager). Body: `{ type, format, period, from, to }`.
- `GET /api/reports` — danh sách báo cáo (Admin/Manager).
- `GET /api/reports/:id/download` — tải file báo cáo (Admin/Manager).

### 3) Cài đặt phụ thuộc bổ sung

- Backend (thư mục `qlsach-backend`):

```powershell
cd qlsach-backend
npm install node-cron xlsx
```

- Frontend (thư mục `qlsach-frontend`):

```powershell
cd qlsach-frontend
npm install recharts
```

### 5) Vị trí file & metadata

### 6) Bảo mật & Quyền

### 7) Mua sách (Purchase) và Thống kê bán hàng

- **Mua sách (API)**: endpoint `POST /api/purchase` (yêu cầu token) cho phép user mua sách. Body: `{ maSach, quantity }`.

  - Hành vi: kiểm tra tồn kho, cập nhật `soLuong` trên ledger (gọi chaincode `updateSoLuongSach`), và ghi lại giao dịch mua vào `qlsach-backend/data/purchases.json`.
  - Trả về: `newQty` (tồn kho sau khi mua) và entry metadata.

- **Thống kê bán hàng**: endpoint `GET /api/reports/sales?period=1h|1d|7d` (Admin/Manager) trả về `totalSold` và danh sách `top` sách bán chạy (theo `maSach` và `count`) trong khoảng thời gian chọn.

### 8) Tạo tài khoản Manager (Admin only)

- Endpoint `POST /auth/create-manager` (Admin only) để Admin tạo tài khoản có role `Manager`. Body: `{ username, password, fullName, fabricId, email }`.

### 7) Nội dung file báo cáo (CSV / XLSX)

Mặc định prototype hiện tại xuất toàn bộ danh sách sách (full dump). Các cột được xuất là:

- `maSach` : Mã sách (ví dụ `S001`)
- `tenSach` : Tên sách
- `theLoai` : Thể loại
- `tacGia` : Tác giả
- `namXuatBan` : Năm xuất bản
- `soLuong` : Số lượng tồn kho (số nguyên)
