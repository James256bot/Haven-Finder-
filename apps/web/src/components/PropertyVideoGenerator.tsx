import { useState, useRef } from 'react';

export function PropertyVideoGenerator({ listing }: { listing: any }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const images = [
    listing.main_image_url,
    ...(listing.image_urls || [])
  ].filter(Boolean).slice(0, 3);

  async function generateVideo() {
    if (images.length === 0) return alert('No photos to generate video from.');
    setIsGenerating(true);

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    canvas.width = 1080;
    canvas.height = 1920;

    // 1. Preload images
    const loadedImages = await Promise.all(
      images.map(src => new Promise<HTMLImageElement>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; 
        img.onload = () => resolve(img);
        img.onerror = () => resolve(new Image());
        
        // Route external images through our proxy to bypass CORS
        const API = (import.meta.env.VITE_API as string) || 'https://havenfinderapi-production.up.railway.app';
        const proxiedSrc = src.startsWith('http')
          ? `${API}/img?url=${encodeURIComponent(src)}`
          : src;
          
        img.src = proxiedSrc;
      }))
    );

    // 2. Setup Recorder
    const stream = canvas.captureStream(30); 
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `havenfinder-${listing.slug}.webm`;
      a.click();
      setIsGenerating(false);
    };

    recorder.start();

    // 3. Real-time Animation Loop
    let frame = 0;
    const fps = 30;
    const duration = 5 * fps; // 5 seconds total
    const intervalMs = 1000 / fps;

    const timer = setInterval(() => {
      const progress = frame / duration;

      // Background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Image Slideshow (change every ~1.6s)
      const imgIndex = Math.min(Math.floor(progress * images.length), loadedImages.length - 1);
      const img = loadedImages[imgIndex];
      
      if (img && img.width > 0) {
        // Ken Burns effect (slow zoom)
        const zoom = 1 + (progress * 0.1); // Zoom in 10% over the video
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height) * zoom;
        const x = (canvas.width / 2) - (img.width / 2) * scale;
        const y = (canvas.height / 2) - (img.height / 2) * scale;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      }

      // Gradient Overlay
      const gradient = ctx.createLinearGradient(0, canvas.height * 0.4, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.9)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, canvas.height * 0.4, canvas.width, canvas.height * 0.6);

      // Text: Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 64px sans-serif';
      ctx.textAlign = 'center';
      
      const words = listing.title.split(' ');
      let line = '';
      let yPos = canvas.height - 400;
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        if (ctx.measureText(testLine).width > 900 && n > 0) {
          ctx.fillText(line, canvas.width / 2, yPos);
          line = words[n] + ' ';
          yPos += 80;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, canvas.width / 2, yPos);

      // Text: Price
      ctx.fillStyle = '#10b981'; 
      ctx.font = 'bold 96px sans-serif';
      ctx.fillText(`${listing.currency} ${Number(listing.price_amount).toLocaleString()}`, canvas.width / 2, canvas.height - 250);

      // Text: Location
      ctx.fillStyle = '#cbd5e1'; 
      ctx.font = '48px sans-serif';
      ctx.fillText(`${listing.city || ''}, ${listing.country || ''}`, canvas.width / 2, canvas.height - 180);

      // Footer branding
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText('HavenFinder', canvas.width / 2, canvas.height - 80);

      frame++;
      if (frame > duration) {
        clearInterval(timer);
        recorder.stop();
      }
    }, intervalMs);
  }

  return (
    <div className="mt-4">
      <canvas ref={canvasRef} className="hidden" />
      <button
        onClick={generateVideo}
        disabled={isGenerating}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors disabled:opacity-50"
      >
        {isGenerating ? (
          <span className="animate-pulse">Recording Video...</span>
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
              <line x1="7" y1="2" x2="7" y2="22" />
              <line x1="17" y1="2" x2="17" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="2" y1="7" x2="7" y2="7" />
              <line x1="2" y1="17" x2="7" y2="17" />
              <line x1="17" y1="17" x2="22" y2="17" />
              <line x1="17" y1="7" x2="22" y2="7" />
            </svg>
            Create Video for WhatsApp
          </>
        )}
      </button>
    </div>
  );
}
