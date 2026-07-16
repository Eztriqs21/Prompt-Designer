import { useState, useEffect } from 'react';

interface GenerationLoaderProps {
  /** Path to the branded loading image (drop the asset into /public). */
  imageSrc?: string;
  /** ms before the status text switches to "Almost done". */
  almostDoneAfter?: number;
}

export default function GenerationLoader({
  imageSrc = '/generation-loader.svg',
  almostDoneAfter = 5000,
}: GenerationLoaderProps) {
  const [almost, setAlmost] = useState(false);
  const [imgOk, setImgOk] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setAlmost(true), almostDoneAfter);
    return () => clearTimeout(t);
  }, [almostDoneAfter]);

  return (
    <div className="flex items-center gap-3">
      {imgOk ? (
        <img
          src={imageSrc}
          alt=""
          onError={() => setImgOk(false)}
          className="w-10 h-10 rounded-md object-contain animate-pulse-subtle"
        />
      ) : (
        <div className="w-10 h-10 rounded-md bg-primary-dark border border-secondary-borderGray flex items-center justify-center animate-pulse-subtle">
          <span className="font-mono text-accent-orange text-sm">{`</>`}</span>
        </div>
      )}
      <span className="text-body text-secondary-midGray" aria-live="polite">
        {almost ? 'Almost done' : 'Thinking'}
        <span className="ml-1 opacity-60 animate-pulse-subtle">…</span>
      </span>
    </div>
  );
}
