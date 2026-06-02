import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api.js';
import { type User, useAuthStore } from '../stores/authStore.js';

interface LoginResponse {
  token: string;
  user: User;
}

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage('');

    try {
      if (isRegister) {
        await apiRequest<User>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, username, password }),
        });
        setIsRegister(false);
        setMessage('注册成功，请登录');
        return;
      }

      const data = await apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      login(data.token, data.user);
      navigate('/');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-96 rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold">项目记忆</h1>
        {message && <div className="mb-4 rounded bg-blue-50 p-3 text-blue-700">{message}</div>}
        <form onSubmit={handleSubmit}>
          {isRegister && (
            <input className="mb-4 w-full rounded border p-3" placeholder="用户名" value={username} onChange={(event) => setUsername(event.target.value)} required />
          )}
          <input className="mb-4 w-full rounded border p-3" type="email" placeholder="邮箱" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <input className="mb-4 w-full rounded border p-3" type="password" placeholder="密码" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <button className="w-full rounded bg-blue-500 p-3 text-white hover:bg-blue-600" type="submit">
            {isRegister ? '注册' : '登录'}
          </button>
        </form>
        <p className="mt-4 text-center text-gray-600">
          {isRegister ? '已有账号？' : '没有账号？'}
          <button className="ml-1 text-blue-500" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? '登录' : '注册'}
          </button>
        </p>
      </div>
    </div>
  );
}
