const axios = require('axios');

async function testBackend() {
  try {
    const loginRes = await axios.post('http://127.0.0.1:5000/api/auth/login', {
      email: 'test@example.com', // Need a valid user
      password: 'password'
    });
    const token = loginRes.data.token;
    
    const statsRes = await axios.get('http://127.0.0.1:5000/api/analytics/dashboard/stats', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Backend Stats Response:', JSON.stringify(statsRes.data, null, 2));
  } catch (error) {
    console.error('Test Failed:', error.response ? error.response.data : error.message);
  }
}

// testBackend();
