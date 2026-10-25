const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
  createLoginCode,
  redeemLoginCode,
  parseLoginState,
  isValidChallenge,
  buildAppReturnUrl
} = require('../auth/loginHandoff');

const JWT_SECRET = process.env.JWT_SECRET;
const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
const KAKAO_REDIRECT_URI = process.env.KAKAO_REDIRECT_URI || 'http://localhost:5000/api/auth/kakao/callback';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required.');
}

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
  const { host: returnHost, challenge } = parseLoginState(state);

  if (!code) {
    return res.status(400).send('Authorization code is missing.');
  }
  if (!isValidChallenge(challenge)) {
    return res.status(400).send('Login must be started from the Mechuri app.');
  }
  if (!KAKAO_REST_API_KEY) {
    return res.status(500).send('KAKAO_REST_API_KEY is not configured on the server.');
  }

  try {
    // 1. Exchange Auth Code for Access Token
    console.log('📡 Exchanging Kakao authorization code for access token...');
    const tokenResponse = await axios.post('https://kauth.kakao.com/oauth/token', null, {
      params: {
        grant_type: 'authorization_code',
        client_id: KAKAO_REST_API_KEY,
        redirect_uri: KAKAO_REDIRECT_URI,
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

    // 5. 토큰은 URL에 싣지 않고, 1회용 코드만 딥링크로 앱에 넘긴다 (앱이 /kakao/exchange로 토큰을 받음)
    const userData = {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avoidTags: user.avoidTags
    };
    const loginCode = createLoginCode({ token: jwtToken, user: userData }, challenge);
    const appUrl = buildAppReturnUrl(loginCode, returnHost);
    // 스크립트 안에 넣는 값은 JSON으로 만들고 '<'를 이스케이프해서 </script> 주입을 막는다
    const appUrlJs = JSON.stringify(appUrl).replace(/</g, '\\u003c');

    const redirectScript = `
      <html>
        <head>
          <meta name="referrer" content="no-referrer">
          <title>Kakao Authentication Successful</title>
          <script>
            window.location.replace(${appUrlJs});
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
    res.set('Cache-Control', 'no-store');
    return res.send(redirectScript);

  } catch (error) {
    console.error('❌ Kakao OAuth Error:', error.response?.data || error.message);
    return res.status(500).send(`Kakao Login Failed: ${error.message}`);
  }
});

// --- Kakao login code exchange ---
// 카카오 콜백이 딥링크로 넘긴 1회용 코드를 토큰으로 바꾼다.
// 코드는 60초 안에 한 번만 시도할 수 있고, 로그인을 시작한 앱의 verifier가 있어야 한다.
router.post('/kakao/exchange', (req, res) => {
  const result = redeemLoginCode(req.body?.code, req.body?.verifier);
  if (!result) {
    return res.status(400).json({ error: 'Invalid or expired login code.' });
  }
  res.set('Cache-Control', 'no-store');
  return res.json(result);
});

// --- Kakao Mobile REST API Sync ---
// 카카오 검증 없이 이메일만으로 토큰을 내주는 개발용 단축 로그인. 운영에서는 남의 계정으로 로그인할 수 있으므로 막는다.
router.post('/kakao/mobile', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found.' });
  }
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
