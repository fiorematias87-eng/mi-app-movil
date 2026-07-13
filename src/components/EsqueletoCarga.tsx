import React from 'react';

export default function EsqueletoCarga() {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
      <div className="w-full max-w-md bg-neutral-900/90 rounded-2xl border border-neutral-800 p-4 animate-pulse shadow-2xl">
        <div className="h-8 bg-neutral-800 rounded-md mb-4 w-1/2" />

        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-24 bg-neutral-800 rounded-md" />
              <div className="h-3 bg-neutral-800 rounded w-3/4" />
              <div className="h-3 bg-neutral-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
