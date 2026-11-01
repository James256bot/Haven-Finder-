import { useEffect, useState } from 'react';

export default function DebugPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Bypass the api.ts wrapper and Vite proxy. 
    // We use the exact URL that worked in your terminal.
    const exactUrl = 'https://havenfinderapi-production.up.railway.app/listings';

    console.log("Fetching from:", exactUrl);

    fetch(exactUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((json) => {
        // The server returns { success: true, data: { listings: [...] } }
        setData(json.data.listings);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch failed:", err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ padding: '20px' }}><h2>Loading data...</h2></div>;
  if (error) return <div style={{ padding: '20px', color: 'red' }}><h2>Error loading data:</h2><p>{error}</p><p style={{fontSize: '12px'}}>Check your browser console (F12) for CORS errors.</p></div>;
  if (!data || data.length === 0) return <div style={{ padding: '20px' }}><h2>No properties found.</h2></div>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>Success! Data Loaded</h2>
      <p>Loaded {data.length} properties.</p>
      <ul>
        {data.slice(0, 5).map((item: any) => (
          <li key={item.id}>{item.title} - {item.city}</li>
        ))}
      </ul>
    </div>
  );
}
