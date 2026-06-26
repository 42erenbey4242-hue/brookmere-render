
import { Server } from '../types';

interface Props {
  servers: Server[];
  selectedServerId: string | null;
  onSelectServer: (id: string) => void;
  isAdmin: boolean;
  onCreateServer: () => void;
}

export default function ServerSidebar({ servers, selectedServerId, onSelectServer, isAdmin, onCreateServer }: Props) {
  return (
    <div className="w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 gap-2 shrink-0 overflow-y-auto">
      {/* Brookmere Home */}
      <div className="relative group">
        <button
          className="w-12 h-12 rounded-full bg-[#5865f2] hover:rounded-2xl flex items-center justify-center transition-all duration-200 shadow-lg"
          title="Brookmere"
        >
          <span className="text-white text-xl font-bold">B</span>
        </button>
      </div>

      {/* Divider */}
      <div className="w-8 h-0.5 bg-[#35373c] rounded-full my-1" />

      {/* Server list */}
      {servers.map(server => (
        <div key={server.id} className="relative group">
          <button
            onClick={() => onSelectServer(server.id)}
            className={`w-12 h-12 rounded-full hover:rounded-2xl flex items-center justify-center transition-all duration-200 shadow-md overflow-hidden ${
              selectedServerId === server.id
                ? 'rounded-2xl ring-2 ring-white'
                : 'bg-[#313338]'
            }`}
            title={server.name}
          >
            {server.icon ? (
              <img src={server.icon} alt={server.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-sm font-bold text-center leading-tight px-1">
                {server.name.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase()}
              </span>
            )}
          </button>

          {/* Active indicator */}
          {selectedServerId === server.id && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-8 bg-white rounded-r-full" />
          )}

          {/* Tooltip */}
          <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-[#111214] text-white text-xs font-semibold px-3 py-2 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
            {server.name}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#111214]" />
          </div>
        </div>
      ))}

      {/* Add server button (admin only) */}
      {isAdmin && (
        <div className="relative group mt-1">
          <button
            onClick={onCreateServer}
            className="w-12 h-12 rounded-full bg-[#313338] hover:rounded-2xl hover:bg-[#23a55a] flex items-center justify-center transition-all duration-200 text-[#23a55a] hover:text-white"
            title="Sunucu Oluştur"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-[#111214] text-white text-xs font-semibold px-3 py-2 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
            Sunucu Oluştur
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#111214]" />
          </div>
        </div>
      )}
    </div>
  );
}
