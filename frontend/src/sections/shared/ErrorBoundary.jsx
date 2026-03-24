// ErrorFallback.jsx
import React from 'react';

const ErrorFallback = ({ error, resetErrorBoundary }) => {
  // Call resetErrorBoundary() to reset the error state and retry rendering
  return (
    <div role="alert" style={{ padding: '20px', border: '1px solid red' }}>
      <h2>Something went wrong:</h2>
      <pre style={{ color: 'red' }}>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
};

export default ErrorFallback;
