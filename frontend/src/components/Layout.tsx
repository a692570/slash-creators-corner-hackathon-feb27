import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Receipt, PlusCircle, FileSearch } from 'lucide-react';

export function Layout() {
  const location = useLocation();
  
  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      {/* Sidebar */}
      <aside className="w-60 border-r border-[#262626] flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-[#262626]">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold">
            <span>🔪</span>
            <span>Slash</span>
          </Link>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-3">
          <ul className="space-y-1">
            <li>
              <Link
                to="/"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive('/') && location.pathname === '/'
                    ? 'bg-[#1a1a1a] text-white'
                    : 'text-[#888] hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span className="font-medium">Dashboard</span>
              </Link>
            </li>
            <li>
              <Link
                to="/add-bill"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive('/add-bill')
                    ? 'bg-[#1a1a1a] text-white'
                    : 'text-[#888] hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                <PlusCircle className="w-5 h-5" />
                <span className="font-medium">Add Bill</span>
              </Link>
            </li>
            <li>
              <Link
                to="/scan"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive('/scan')
                    ? 'bg-[#1a1a1a] text-white'
                    : 'text-[#888] hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                <FileSearch className="w-5 h-5" />
                <span className="font-medium">Scan Statement</span>
              </Link>
            </li>
            <li>
              <Link
                to="/bills"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive('/bills')
                    ? 'bg-[#1a1a1a] text-white'
                    : 'text-[#888] hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                <Receipt className="w-5 h-5" />
                <span className="font-medium">Bills</span>
              </Link>
            </li>
          </ul>
        </nav>
        
        {/* Footer */}
        <div className="p-4 border-t border-[#262626]">
          <p className="text-xs text-[#666]">Slash v0.1.0</p>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
