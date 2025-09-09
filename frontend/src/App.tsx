import React, { useState, useEffect } from 'react';
import logo from './logo.svg';
import './App.css';

function App() {
  const [apiMessage, setApiMessage] = useState<string>('');

  useEffect(() => {
    // Test API connection
    fetch('/api/health')
      .then(response => response.json())
      .then(data => setApiMessage(data.message))
      .catch(error => setApiMessage('API connection failed'));
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <p>
          <strong>API Status:</strong> {apiMessage}
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
