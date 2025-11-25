// qlsach-backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            // Payload token: { id, role, fabricId }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Gán thông tin user t? token vào request d? s? d?ng
            req.user = decoded; 
            next();

        } catch (error) {
            console.error('L?i xác th?c token:', error);
            return res.status(401).json({ success: false, error: 'Không du?c ?y quy?n. Token không h?p l?/h?t h?n.' });
        }
    }

    if (!token) {
        return res.status(401).json({ success: false, error: 'Không du?c ?y quy?n. Không tìm th?y Token.' });
    }
};

// Middleware phân quy?n theo role (Gi? nguyên)
const authorize = (...roles) => { 
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, error: `Truy c?p b? t? ch?i. Ch? role ${roles.join(', ')} m?i du?c phép th?c hi?n.` });
        }
        next();
    };
};

module.exports = { protect, authorize };