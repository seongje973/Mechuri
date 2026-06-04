const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'mechuri_secret_key_2026_qquail';

// JWT Verification Middleware
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token is missing or invalid.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    req.user = { id: decoded.id };
    next();
  } catch (error) {
    console.error('⚠️ JWT Verification Failed:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

// Register Route
router.post('/register', async (req, res) => {
  try {
    const { email, password, nickname } = req.body;
    
    if (!email || !password || !nickname) {
      return res.status(400).json({ error: 'All fields (email, password, nickname) are required.' });
    }

    // Check existing
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'This email is already registered.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      nickname
    });

    // Generate JWT token
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });

    return res.json({
      message: 'Registration successful! 🐣',
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avoidTags: user.avoidTags
      }
    });

  } catch (error) {
    console.error('❌ Registration Error:', error.message);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Generate token
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });

    return res.json({
      message: 'Login successful! Welcome back 🐣',
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avoidTags: user.avoidTags
      }
    });

  } catch (error) {
    console.error('❌ Login Error:', error.message);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// Get Current Profile Route
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avoidTags: user.avoidTags
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

// --- Kakao OAuth callback ---
const axios = require('axios');

router.get('/kakao/callback', async (req, res) => {
  const { code, state } = req.query;
  const apiKey = process.env.KAKAO_REST_API_KEY;
  const redirectUri = `http://localhost:5000/api/auth/kakao/callback`;
  const hostUri = state ? decodeURIComponent(state) : '127.0.0.1:8081';

  if (!code) {
    return res.status(400).send('Authorization code is missing.');
  }

  try {
    // 1. Exchange Auth Code for Access Token
    console.log('📡 Exchanging Kakao authorization code for access token...');
    const tokenResponse = await axios.post('https://kauth.kakao.com/oauth/token', null, {
      params: {
        grant_type: 'authorization_code',
        client_id: apiKey,
        redirect_uri: redirectUri,
        code
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
      }
    });

    const { access_token } = tokenResponse.data;

    // 2. Fetch User Profile from Kakao API
    console.log('📡 Fetching Kakao user profile with access token...');
    const profileResponse = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    const kakaoUser = profileResponse.data;
    const kakaoId = kakaoUser.id;
    const nickname = kakaoUser.properties?.nickname || `카카오_미식가_${kakaoId}`;
    const email = kakaoUser.kakao_account?.email || `kakao_${kakaoId}@mechuri.com`;

    // 3. Find or Create User in MySQL
    let user = await User.findOne({ where: { email } });
    if (!user) {
      const dummyPassword = await bcrypt.hash(`kakao_oauth_dummy_${kakaoId}`, 10);
      user = await User.create({
        email,
        password: dummyPassword,
        nickname,
        avoidTags: ''
      });
      console.log(`✅ Created new user from Kakao OAuth: ${nickname}`);
    } else {
      console.log(`✅ Existing Kakao user logged in: ${nickname}`);
    }

    // 4. Generate MeChuri JWT Token
    const jwtToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });

    // 5. Redirect HTML script to Deep Link back to React Native App
    const userData = {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avoidTags: user.avoidTags
    };

    const redirectScript = `
      <html>
        <head>
          <title>Kakao Authentication Successful</title>
          <script>
            const token = "${jwtToken}";
            const user = ${JSON.stringify(userData)};
            const deepLink = "exp://${hostUri}/--/auth?token=" + token + "&user=" + encodeURIComponent(JSON.stringify(user));
            
            console.log("Redirecting to: " + deepLink);
            window.location.href = deepLink;
            
            setTimeout(() => {
              window.location.href = "mechuri://auth?token=" + token + "&user=" + encodeURIComponent(JSON.stringify(user));
            }, 1000);
          </script>
        </head>
        <body style="background-color: #1c1917; color: #fbbf24; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; text-align: center; padding: 20px;">
          <div>
            <h1 style="font-size: 48px; margin-bottom: 20px;">🐣</h1>
            <h2>로그인 성공!</h2>
            <p style="color: #a8a29e;">메추리 모바일 앱으로 안전하게 리다이렉트 중입니다...</p>
          </div>
        </body>
      </html>
    `;
    return res.send(redirectScript);

  } catch (error) {
    console.error('❌ Kakao OAuth Error:', error.response?.data || error.message);
    return res.status(500).send(`Kakao Login Failed: ${error.message}`);
  }
});

// --- Kakao Mobile REST API Sync ---
router.post('/kakao/mobile', async (req, res) => {
  try {
    const { id, email, nickname } = req.body;

    if (!id || !email || !nickname) {
      return res.status(400).json({ error: 'id, email, and nickname are required.' });
    }

    let user = await User.findOne({ where: { email } });
    if (!user) {
      const dummyPassword = await bcrypt.hash(`kakao_oauth_dummy_${id}`, 10);
      user = await User.create({
        email,
        password: dummyPassword,
        nickname,
        avoidTags: ''
      });
      console.log(`✅ Created new Kakao user: ${nickname}`);
    } else {
      console.log(`✅ Logged in existing Kakao user: ${nickname}`);
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });

    return res.json({
      message: 'Kakao login successful! 🐣',
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avoidTags: user.avoidTags
      }
    });
  } catch (error) {
    console.error('❌ Kakao Mobile Auth Error:', error.message);
    return res.status(500).json({ error: 'Failed to process Kakao login.' });
  }
});

module.exports = { router, authMiddleware };
