'use client';

import { useEffect, useState } from 'react';
// socket.io-client precisa ser instalado: npm install socket.io-client
// import { io, Socket } from 'socket.io-client';

interface AuctionLiveUpdatesProps {
  auctionId: number;
  onBidUpdate?: (data: any) => void;
  onAuctionUpdate?: (data: any) => void;
}

export function AuctionLiveUpdates({ auctionId, onBidUpdate, onAuctionUpdate }: AuctionLiveUpdatesProps) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Polling fallback: verificar atualizações a cada 5 segundos
    // TODO: Instalar socket.io-client para WebSocket em tempo real
    // npm install socket.io-client
    const pollInterval = setInterval(async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
        const response = await fetch(`${API_BASE_URL}/api/v1/auctions/${auctionId}`);
        if (response.ok) {
          const data = await response.json();
          if (onAuctionUpdate) {
            onAuctionUpdate(data);
          }
        }
      } catch (err) {
        // Ignorar erros de polling
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [auctionId, onBidUpdate, onAuctionUpdate]);

  return (
    <div className="fixed bottom-4 right-4">
      {connected ? (
        <div className="bg-green-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span className="text-sm font-semibold">Ao Vivo</span>
        </div>
      ) : (
        <div className="bg-gray-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2">
          <div className="w-2 h-2 bg-white rounded-full"></div>
          <span className="text-sm font-semibold">Desconectado</span>
        </div>
      )}
    </div>
  );
}
