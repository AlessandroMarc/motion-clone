'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function Home() {
  const [apiMessage, setApiMessage] = useState<string>('');

  useEffect(() => {
    // Test API connection
    fetch('/api/health')
      .then(response => response.json())
      .then(data => setApiMessage(data.message))
      .catch(error => setApiMessage('API connection failed'));
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
      <main className="flex flex-col items-center gap-8 text-center">
        <h1 className="text-4xl font-bold">Welcome to Next.js!</h1>
        <p className="text-lg">
          Edit{' '}
          <code className="bg-gray-800 px-2 py-1 rounded">
            src/app/page.tsx
          </code>{' '}
          and save to reload.
        </p>
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-lg">
            <strong>API Status:</strong> {apiMessage}
          </p>
        </div>
        <a
          className="text-blue-400 hover:text-blue-300 underline"
          href="https://nextjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn Next.js
        </a>
      </main>
    </div>
  );
}
