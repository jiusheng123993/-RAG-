import { ArrowRight, Sparkles } from 'lucide-react';
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_15%_10%,rgba(255,255,255,0.95),transparent_28rem),linear-gradient(135deg,#fbf7ef_0%,#f3eadf_46%,#edf2ef_100%)] p-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-[-8rem] h-96 w-96 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="absolute bottom-[-8rem] right-[-8rem] h-96 w-96 rounded-full bg-emerald-100/60 blur-3xl" />
      </div>

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2.5rem] border border-white/75 bg-white/50 shadow-[0_30px_100px_rgba(94,72,43,0.16)] backdrop-blur-2xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden min-h-[34rem] flex-col justify-between bg-stone-950 p-10 text-white lg:flex">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
              <Sparkles size={22} />
            </div>
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.34em] text-amber-200/70">Local Memory Console</p>
            <h1 className="mt-4 text-5xl font-semibold tracking-[-0.06em]">让项目记忆在本地长期生长。</h1>
          </div>
          <p className="max-w-sm text-sm leading-6 text-white/56">连接 Trae Agent、项目 handoff、知识导入和本地 MCP 工具，把每次研发上下文沉淀为可接手资产。</p>
        </section>

        <section className="p-8 lg:p-10">
          <div className="mb-8">
            <p className="page-kicker">Welcome Back</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-stone-950">{isRegister ? '创建本地账号' : '登录项目记忆'}</h2>
            <p className="mt-3 text-sm text-stone-500">进入你的本地项目记忆管理台。</p>
          </div>
          {message && <div className="mb-5 rounded-3xl border border-amber-100 bg-amber-50/80 p-4 text-sm font-medium text-amber-800">{message}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-stone-700">用户名</span>
                <input className="soft-input" placeholder="用户名" value={username} onChange={(event) => setUsername(event.target.value)} required />
              </label>
            )}
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">邮箱</span>
              <input className="soft-input" type="email" placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">密码</span>
              <input className="soft-input" type="password" placeholder="输入密码" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </label>
            <button className="soft-button w-full py-3.5" type="submit">
              {isRegister ? '注册' : '登录'}
              <ArrowRight size={18} />
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-stone-500">
            {isRegister ? '已有账号？' : '没有账号？'}
            <button className="ml-1 font-semibold text-stone-950 hover:text-amber-700" onClick={() => setIsRegister(!isRegister)}>
              {isRegister ? '登录' : '注册'}
            </button>
          </p>
        </section>
      </div>
    </div>
  );
}
