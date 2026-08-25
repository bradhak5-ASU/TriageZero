import { useEffect, useState } from 'react';
import { fetchHealth } from './services/api';

export default function App() {
  const [status, setStatus] = useState('Loading...');

  useEffect(() => {
    fetchHealth()
      .then((data) => setStatus(data.status))
      .catch(() => setStatus('Backend unreachable'));
  }, []);

  return (
    <main>
      <h1>TriageZero</h1>
      <p>Backend status: {status}</p>
    </main>
  );
}
