const jwt = require('jsonwebtoken');

exports.generateTokens = (user) => {
    const accessToken = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '15m' }
    );
    const refreshToken = jwt.sign(
        { userId: user.id},
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '7d' }
    );
    return { accessToken, refreshToken };
};