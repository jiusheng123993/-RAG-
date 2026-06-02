import { Activity, FolderOpen, Home, LogOut } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.js';

export default function Layout() {
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const navItems = [
    { path: '/', icon: Home, label: '仪表盘' },
    { path: '/projects', icon: FolderOpen, label: '项目' },
    { path: '/diagnostics', icon: Activity, label: '诊断' },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="relative w-64 bg-white shadow-md">
        <div className="border-b p-4">
          <h1 className="text-xl font-bold text-gray-800">项目记忆</h1>
          <p className="text-sm text-gray-500">{user?.username}</p>
        </div>
        <nav className="p-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`mb-2 flex items-center gap-3 rounded-lg px-4 py-3 ${
                location.pathname === item.path ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 w-64 border-t p-4">
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-gray-600 hover:bg-gray-100">
            <LogOut size={20} />
            退出登录
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
