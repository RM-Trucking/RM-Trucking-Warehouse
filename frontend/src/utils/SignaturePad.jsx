import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';

const SignaturePad = () => {
  // Create a reference to the signature canvas to access its internal methods
  const sigCanvas = useRef(null);

  const handleClear = () => {
    sigCanvas.current.clear();
  };

  const handleSaveAndSend = async () => {
    if (sigCanvas.current.isEmpty()) {
      alert("Please provide a signature first.");
      return;
    }

    // 1. Get raw data from the canvas.
    // toData() returns an array of strokes, each stroke is an array of {x, y, time} points
    const rawData = sigCanvas.current.toData() || [];

    // 2. Transform into [ [{x, y}, ...], [...] ] — each stroke is already an array of points
    const formattedStrokes = rawData.map(stroke =>
      stroke.map(point => ({
        x: point.x,
        y: point.y
      }))
    );

    // 3. Stringify the array to match your exact backend requirement
    const signString = JSON.stringify(formattedStrokes);

    // 4. Construct the final payload
    const payload = {
      sign: signString
    };

    // Log to verify the output matches your required format precisely
    console.log("Data to send:", JSON.stringify(payload));

    // Example of sending to the backend:
    /*
    try {
      const response = await fetch('YOUR_API_ENDPOINT', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      // handle response...
    } catch (error) {
      console.error(error);
    }
    */
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <h3>Sign Below:</h3>
      
      {/* Signature Canvas Container */}
      <div style={{ border: '2px solid #ccc', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
        <SignatureCanvas
          ref={sigCanvas}
          penColor="black"
          canvasProps={{ 
            width: 500, 
            height: 300, 
            className: 'signature-canvas' 
          }}
        />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={handleClear} 
          style={{ padding: '8px 16px', cursor: 'pointer' }}
        >
          Clear
        </button>
        <button 
          onClick={handleSaveAndSend} 
          style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Save & Send to Backend
        </button>
      </div>
    </div>
  );
};

export default SignaturePad;