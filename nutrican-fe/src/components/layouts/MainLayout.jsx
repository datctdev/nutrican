import { Outlet } from 'react-router-dom';
import Header from './Header';
import useWebSocket from '../../hooks/useWebSocket';

export default function MainLayout() {
  useWebSocket();

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <Header />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
