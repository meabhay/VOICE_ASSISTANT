const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const header = req.headers.authorization;

    if(!header && !header.startsWith('Bearer')) {
        return res.status(401).json({
            msg: 'Authorization token is missing'
        })
    }

    const token = header.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded
        next()
    } catch(error) {
        return res.status(403).json({
            msg: 'Invalid or expired token',
            error: error.message
        })
    }
}

module.exports = authMiddleware