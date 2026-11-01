import { useEffect, useState } from 'react';

export default function DebugPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Make sure this matches your backend URL
  const API_URL = 'http://localhost:5218/api/properties';

  useEffect(() => {
    console.log("Component mounted. Fetching data...");

    fetch(API_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("Data received:", data);
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch failed:", err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ padding: '20px' }}><h2>Loading data...</h2></div>;

  if (error) return <div style={{ padding: '20px', color: 'red' }}><h2>Error loading data:</h2><p>{error}</p></div>;

  if (!data || data.length === 0) return <div style={{ padding: '20px' }}><h2>No properties found in database.</h2></div>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>Success! Data Loaded:</h2>
      <pre style={{ background: '#f4f4f4', padding: '10px' }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
