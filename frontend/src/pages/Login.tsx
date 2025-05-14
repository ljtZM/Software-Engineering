import { useState } from 'react';
import axios from 'axios';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    const res = await axios.post('http://localhost:5000/api/login', {
      username,
      password
    });
    alert('登录成功，token: ' + res.data.access_token);
  };

  return (
    <div>
      <h2>登录</h2>
      <input placeholder="用户名" value={username} onChange={e => setUsername(e.target.value)} />
      <input placeholder="密码" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button onClick={handleLogin}>登录</button>
    </div>
  );
}
