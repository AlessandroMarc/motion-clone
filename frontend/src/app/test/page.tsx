'use client';

import { useState, useEffect } from 'react';

export default function TestPage() {
  const [result, setResult] = useState<string>('Testing...');

  useEffect(() => {
    const testAPI = () => {
      console.log('Testing API connection...');

      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/health');
      xhr.setRequestHeader('Content-Type', 'application/json');

      xhr.onload = () => {
        console.log('Response status:', xhr.status);
        console.log('Response headers:', xhr.getAllResponseHeaders());

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            console.log('Response data:', data);
            setResult(`Success: ${JSON.stringify(data, null, 2)}`);
          } catch (e) {
            console.error('Error parsing JSON:', e);
            setResult(`Success but invalid JSON: ${xhr.responseText}`);
          }
        } else {
          setResult(`HTTP Error: ${xhr.status} - ${xhr.statusText}`);
        }
      };

      xhr.onerror = () => {
        console.error('XHR error');
        setResult('XHR Error: Network error');
      };

      xhr.ontimeout = () => {
        console.error('XHR timeout');
        setResult('XHR Error: Timeout');
      };

      xhr.timeout = 5000;
      xhr.send();
    };

    testAPI();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">API Test Page</h1>
      <pre className="bg-gray-100 p-4 rounded overflow-auto">{result}</pre>
    </div>
  );
}
