import { Activity, FolderOpen, Home, LogOut, Sparkles } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.js';

export default function Layout() {
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const navItems = [
    { path: '/', icon: Home, label: '仪表盘', hint: '运行概览' },
    { path: '/projects', icon: FolderOpen, label: '项目', hint: '记忆空间' },
    { path: '/diagnostics', icon: Activity, label: '诊断', hint: '服务状态' },
  ];

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_12%_8%,rgba(255,255,255,0.96),transparent_28rem),linear-gradient(135deg,#fbf7ef_0%,#f3eadf_46%,#edf2ef_100%)] text-stone-900">
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="absolute left-[-8rem] top-[-8rem] h-96 w-96 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="absolute right-[-6rem] top-24 h-80 w-80 rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-1/3 h-96 w-96 rounded-full bg-stone-200/45 blur-3xl" />
      </div>
      <div className="relative flex min-h-screen p-4 lg:p-6">
        <aside className="premium-card relative hidden w-72 shrink-0 overflow-hidden p-5 lg:block">
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
          <div className="flex items-center gap-3 rounded-3xl border border-white/70 bg-white/60 p-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-950 text-white shadow-lg shadow-stone-900/15">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-[-0.03em] text-stone-950">项目记忆</h1>
              <p className="text-xs text-stone-500">Local Memory Console</p>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-amber-100/80 bg-amber-50/55 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-800/70">Signed in</p>
            <p className="mt-2 truncate text-sm font-medium text-stone-800">{user?.username ?? '本地用户'}</p>
          </div>

          <nav className="mt-6 space-y-2">
            {navItems.map((item) => {
              const active = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center gap-3 rounded-3xl px-4 py-3 ${
                    active
                      ? 'bg-stone-950 text-white shadow-[0_18px_50px_rgba(28,25,23,0.18)]'
                      : 'text-stone-600 hover:-translate-y-0.5 hover:bg-white/72 hover:text-stone-950'
                  }`}
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${active ? 'bg-white/14' : 'bg-stone-100/80 group-hover:bg-amber-50'}`}>
                    <item.icon size={18} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className={`block text-xs ${active ? 'text-white/58' : 'text-stone-400'}`}>{item.hint}</span>
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="absolute inset-x-5 bottom-5">
            <button onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-3xl border border-stone-200/75 bg-white/68 px-4 py-3 text-sm font-semibold text-stone-600 hover:-translate-y-0.5 hover:bg-white hover:text-stone-950">
              <LogOut size={18} />
              退出登录
            </button>
          </div>
        </aside>

        <main className="relative flex-1 overflow-auto px-2 py-4 lg:px-8 lg:py-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex items-center justify-between lg:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-950 text-white">
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="font-semibold text-stone-950">项目记忆</p>
                  <p className="text-xs text-stone-500">{user?.username ?? '本地用户'}</p>
                </div>
              </div>
              <button onClick={logout} className="soft-button-secondary px-4 py-2">
                <LogOut size={16} />
                退出
              </button>
            </div>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
