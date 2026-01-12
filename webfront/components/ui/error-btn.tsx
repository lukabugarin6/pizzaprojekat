'use client';

import { useState } from 'react';

export function ErrorBtn() {
  const [error, setError] = useState(null);

  const handleClick = () => {
    console.log('123');
    try {
      throw new Error('Exception');
    } catch (reason: any) {
      setError(reason);
    }
  };

  if (error) {
    return <div>something went wrong</div>;
  }

  return (
    <button type="button" onClick={handleClick} style={{ background: 'red' }}>
      Click me
    </button>
  );
}
