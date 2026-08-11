import React, { useState, useEffect, useMemo } from 'react';
import './a.css';

const TypewriterHero = () => {
  const [text, setText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(100);

  // Your finalized sequence!
  const phrases = useMemo(() => [
    "Automated Security Alerts.",
    "Precision Speed Telemetry.",
    "Advanced Person Recognition."
  ], []);

  useEffect(() => {
    const handleTyping = () => {
      const currentPhraseIndex = loopNum % phrases.length;
      const fullText = phrases[currentPhraseIndex];

      setText(
        isDeleting
          ? fullText.substring(0, text.length - 1)
          : fullText.substring(0, text.length + 1)
      );

      setTypingSpeed(isDeleting ? 50 : 100);

      if (!isDeleting && text === fullText) {
        setTimeout(() => setIsDeleting(true), 2000);
      } else if (isDeleting && text === '') {
        setIsDeleting(false);
        setLoopNum(loopNum + 1);
      }
    };

    const timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [text, isDeleting, loopNum, typingSpeed, phrases]);

  return (
    <div className="hero-container">
      <h1 className="hero-title">
        <span className="static-text">Smarter Security.</span>
        <br />
        <span className="dynamic-text">{text}</span>
        <span className="blinking-cursor">|</span>
      </h1>
      <p className="hero-subtitle">
        Advanced AI that tracks vehicle speeds and identifies unknown persons on your property in real-time.
      </p>
      <button className="hero-cta-button">Upload Surveillance Footage</button>
    </div>
  );
};

export default TypewriterHero;