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
