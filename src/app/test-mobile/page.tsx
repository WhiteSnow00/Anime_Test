"use client";

import { SimpleMobilePlayer } from '@/components/simple-mobile-player';
import { useState } from 'react';

export default function TestMobilePage() {
  const [server, setServer] = useState<'helvid' | 'hydax'>('helvid');
  
  return (
    <div className="min-h-screen bg-background p-4">
      <h1 className="text-2xl font-bold mb-4">Mobile Player Test</h1>
      
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setServer('helvid')}
          className={`px-4 py-2 rounded ${server === 'helvid' ? 'bg-primary text-white' : 'bg-gray-200'}`}
        >
          Helvid
        </button>
        <button
          onClick={() => setServer('hydax')}
          className={`px-4 py-2 rounded ${server === 'hydax' ? 'bg-primary text-white' : 'bg-gray-200'}`}
        >
          Hydax
        </button>
      </div>
      
      <SimpleMobilePlayer
        videoId="01"
        server={server}
        episodeTitle="Test Episode 1"
      />
      
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <h2 className="font-bold mb-2">Debug Info:</h2>
        <p>Current Server: {server}</p>
        <p>Video ID: 01</p>
        <p>Check console for loading logs</p>
      </div>
    </div>
  );
}
