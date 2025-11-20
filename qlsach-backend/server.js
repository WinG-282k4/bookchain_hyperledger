const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { Wallets, Gateway } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3006;

// Middleware
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Fabric Network Configuration
const ccpPath = path.resolve('/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json');
const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

// Ket noi den Fabric Network
async function connectToNetwork() {
    try {
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        
        console.log(`Wallet path: ${walletPath}`);
        // Kiem tra identity (S? d?ng username trong file lab, ví d?: sv102102666)
        const identity = await wallet.get('sv102220126');
        if (!identity) {
            console.log('Run the registerUser.js application before retrying');
            throw new Error('User identity not found in wallet');
        }

        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: 'sv102220126',
            discovery: { enabled: true, asLocalhost: true }
        });

        const network = await gateway.getNetwork('mychannel');
        // Thay d?i tên contract
        const contract = network.getContract('qlsach');
        
        return { gateway, contract };
    } catch (error) {
        console.error(`Failed to connect to network: ${error}`);
        throw error;
    }
}

// ==================== API ROUTES ====================

// 1. Khoi tao du lieu
app.post('/api/init', async (req, res) => {
    try {
        const { gateway, contract } = await connectToNetwork();
        console.log('--> Khoi tao du lieu sach');
        await contract.submitTransaction('initLedger');
        await gateway.disconnect();
        
        res.status(200).json({
            success: true,
            message: 'Da khoi tao du lieu sach thanh cong'
        });
    } catch (error) {
        console.error(`Failed to initialize ledger: ${error}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Lay tat ca sach
app.get('/api/sach', async (req, res) => {
    try {
        const { gateway, contract } = await connectToNetwork();
        console.log('--> Truy van tat ca sach');
        const result = await contract.evaluateTransaction('queryAllSach');
        await gateway.disconnect();
        
        const sachs = JSON.parse(result.toString());
        res.status(200).json({ success: true, data: sachs });
    } catch (error) {
        console.error(`Failed to query all books: ${error}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. Lay sach theo ma
app.get('/api/sach/:maSach', async (req, res) => {
    try {
        const maSach = req.params.maSach;
        const { gateway, contract } = await connectToNetwork();
        
        console.log(`--> Truy van sach: ${maSach}`);
        const result = await contract.evaluateTransaction('querySach', maSach);
        await gateway.disconnect();
        
        const sach = JSON.parse(result.toString());
        res.status(200).json({ success: true, data: sach });
    } catch (error) {
        console.error(`Failed to query book: ${error}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. Tao sach moi
app.post('/api/sach', async (req, res) => {
    try {
        const { maSach, tenSach, theLoai, tacGia, namXuatBan, soLuong } = req.body;
        
        if (!maSach || !tenSach || !theLoai || !tacGia || !namXuatBan || !soLuong) {
            return res.status(400).json({ success: false, error: 'Thieu thong tin bat buoc' });
        }
        const { gateway, contract } = await connectToNetwork();
        
        console.log(`--> Tao sach moi: ${maSach}`);
        await contract.submitTransaction('createSach', maSach, tenSach, theLoai, tacGia, namXuatBan, soLuong.toString());
        await gateway.disconnect();
        
        res.status(201).json({
            success: true,
            message: `Da tao sach ${maSach} thanh cong`,
            data: { maSach, tenSach, theLoai, tacGia, namXuatBan, soLuong }
        });
    } catch (error) {
        console.error(`Failed to create book: ${error}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 5. Cap nhat sach
app.put('/api/sach/:maSach', async (req, res) => {
    try {
        const maSach = req.params.maSach;
        const { tenSach, theLoai, tacGia, namXuatBan, soLuong } = req.body;
        
        if (!tenSach || !theLoai || !tacGia || !namXuatBan || !soLuong) {
            return res.status(400).json({ success: false, error: 'Thieu thong tin bat buoc' });
        }
        const { gateway, contract } = await connectToNetwork();
        
        console.log(`--> Cap nhat sach: ${maSach}`);
        await contract.submitTransaction('updateSach', maSach, tenSach, theLoai, tacGia, namXuatBan, soLuong.toString());
        await gateway.disconnect();
        
        res.status(200).json({
            success: true,
            message: `Da cap nhat sach ${maSach} thanh cong`,
            data: { maSach, tenSach, theLoai, tacGia, namXuatBan, soLuong }
        });
    } catch (error) {
        console.error(`Failed to update book: ${error}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 6. Xoa sach
app.delete('/api/sach/:maSach', async (req, res) => {
    try {
        const maSach = req.params.maSach;
        const { gateway, contract } = await connectToNetwork();
        
        console.log(`--> Xoa sach: ${maSach}`);
        await contract.submitTransaction('deleteSach', maSach);
        await gateway.disconnect();
        
        res.status(200).json({
            success: true,
            message: `Da xoa sach ${maSach} thanh cong`
        });
    } catch (error) {
        console.error(`Failed to delete book: ${error}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 7. Tim sach theo the loai
app.get('/api/sach/theloai/:theLoai', async (req, res) => {
    try {
        const theLoai = req.params.theLoai;
        const { gateway, contract } = await connectToNetwork();
        
        console.log(`--> Tim sach the loai: ${theLoai}`);
        const result = await contract.evaluateTransaction('querySachByTheLoai', theLoai);
        await gateway.disconnect();
        
        const sachs = JSON.parse(result.toString());
        res.status(200).json({ success: true, data: sachs });
    } catch (error) {
        console.error(`Failed to query books by category: ${error}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 8. Cap nhat so luong sach
app.patch('/api/sach/:maSach/soluong', async (req, res) => {
    try {
        const maSach = req.params.maSach;
        const { soLuongMoi } = req.body;
        
        if (!soLuongMoi) {
            return res.status(400).json({ success: false, error: 'Thieu thong tin so luong moi' });
        }
        const { gateway, contract } = await connectToNetwork();
        
        console.log(`--> Cap nhat so luong sach ${maSach} thanh ${soLuongMoi}`);
        await contract.submitTransaction('updateSoLuongSach', maSach, soLuongMoi.toString());
        await gateway.disconnect();
        
        res.status(200).json({
            success: true,
            message: `Da cap nhat so luong sach ${maSach} thanh ${soLuongMoi} thanh cong`
        });
    } catch (error) {
        console.error(`Failed to update book quantity: ${error}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'QLSach API Server is running',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Error handler
app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal server error' });
});

// Khoi dong server
app.listen(PORT, () => {
    console.log(`+ QLSach API Server running on port ${PORT}`);
    console.log(`+ Endpoints available at http://localhost:${PORT}/api`);
});
