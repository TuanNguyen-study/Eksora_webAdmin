import React, { useState, useEffect } from 'react';

function EmailGenerator({ booking, onClose }) {
  const [emailType, setEmailType] = useState('confirmation');
  const [showHtml, setShowHtml] = useState(false);

  // Hooks phải được gọi trước mọi early return
  useEffect(() => {
    // Component logic here
  }, []);

  if (!booking) return null;

  return (
    <div>
      <p>EmailGenerator component</p>
    </div>
  );
}

export default EmailGenerator;