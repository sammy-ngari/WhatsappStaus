const bcrypt = require('bcryptjs');
const prisma = require('../prisma');
const { generateTokens } = require('../utils/generateTokens');

exports.signup = async (req, res) => {
    const { email, password } = req.body;
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
        data: { email, password: hashedPassword }
    });
    res.status(201).json({ message: 'User created successfully' });
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }
    const { accessToken, refreshToken } = generateTokens(user);
    await prisma.sessions.create({
        data: { 
            userId: user.id, 
            session_token: refreshToken,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
    });
    res.json({ accessToken, refreshToken });
};

exports.logout = async (req, res) => {
    const { refreshToken } = req.body;
    await prisma.sessions.deleteMany({
        where: { session_token: refreshToken }
    });
    res.json({ message: 'Logged out successfully' });
};