'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Zap, Lock, ChevronsLeftRight } from 'lucide-react';

interface BeforeAfterRedactionProps {
  className?: string;
}

export default function BeforeAfterRedaction({ className = "" }: BeforeAfterRedactionProps) {
  const [sliderVal, setSliderVal] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Entrance animations state
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!mediaQuery.matches) {
      // Trigger animations after mount
      const timer = setTimeout(() => {
        setAnimate(true);
        // Animate slider from 40% to 50%
        let start = 40;
        const interval = setInterval(() => {
          if (start >= 50) {
            clearInterval(interval);
          } else {
            start += 1;
            setSliderVal(start);
          }
        }, 30);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSliderVal(50);
    }
  }, []);

  // Handle drag/movement on the main container card
  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderVal(Math.round(percentage));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleMove(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleMove(e.clientX);
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isDragging]);

  // Keyboard navigation when focused
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSliderVal(prev => Math.max(0, prev - (e.shiftKey ? 10 : 5)));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSliderVal(prev => Math.min(100, prev + (e.shiftKey ? 10 : 5)));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSliderVal(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSliderVal(100);
    }
  };

  return (
    <section className={`before-after-section ${className}`}>
      {/* Header */}
      <div className={`section-header-wrap ${animate ? 'fade-up-active' : ''}`}>
        <h2 className="before-after-title">
          See the Difference <br />
          <span className="accent-gradient">Before</span> & After Redaction
        </h2>
        <p className="before-after-desc">
          Automatically detect and replace personally identifiable information while keeping your document intact.
        </p>
      </div>

      {/* Feature Badges */}
      <div className={`feature-badges-row ${animate ? 'badges-stagger-active' : ''}`}>
        <div className="feature-pill">
          <ShieldCheck className="feature-pill-icon" size={16} />
          <span>Smart PII Detection</span>
        </div>
        <div className="feature-pill">
          <Zap className="feature-pill-icon" size={16} />
          <span>Fast & Accurate</span>
        </div>
        <div className="feature-pill">
          <Lock className="feature-pill-icon" size={16} />
          <span>Privacy First</span>
        </div>
      </div>

      {/* Main Slider Container Card */}
      <div 
        className={`comparison-card-container ${isDragging ? 'dragging' : ''}`}
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onTouchStart={() => setIsDragging(true)}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => setIsDragging(false)}
      >
        {/* Original Side Document (Sits fully underneath) */}
        <div 
          className="document-layer original-layer"
          style={{ clipPath: `inset(0 ${100 - sliderVal}% 0 0)` }}
        >
          <div className="layer-tag-pill original-pill">ORIGINAL</div>
          
          <div className="doc-watermark">CONFIDENTIAL</div>
          
          <div className="doc-paper-preview">
            <div className="doc-paper-header">
              <span className="doc-paper-logo">📄 AUDIT LOG</span>
              <span className="doc-paper-status">RESTRICTED</span>
            </div>
            
            <div className="doc-paper-body">
              <p className="doc-paper-para">
                We have conducted a deep transaction check for the entity profiles listed inside the lead underwriter registry. Below is the primary contact metadata verified for identity resolution.
              </p>
              
              <div className="doc-paper-grid">
                <div className="doc-paper-item">
                  <div className="doc-paper-label">LEAD CLIENT</div>
                  <div className="doc-paper-value original-highlight">John Smith</div>
                </div>
                <div className="doc-paper-item">
                  <div className="doc-paper-label">EMAIL ADDRESS</div>
                  <div className="doc-paper-value original-highlight">john@gmail.com</div>
                </div>
                <div className="doc-paper-item">
                  <div className="doc-paper-label">PHONE NUMBER</div>
                  <div className="doc-paper-value original-highlight">+91 9876543210</div>
                </div>
                <div className="doc-paper-item">
                  <div className="doc-paper-label">LOCATION RESIDENCE</div>
                  <div className="doc-paper-value original-highlight">Mumbai, Maharashtra</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Redacted Side Document (Sits on top, clipped on the left) */}
        <div 
          className="document-layer redacted-layer"
          style={{ clipPath: `inset(0 0 0 ${sliderVal}%)` }}
        >
          <div className="layer-tag-pill redacted-pill">REDACTED</div>
          
          <div className="doc-watermark">ANONYMIZED</div>

          <div className="doc-paper-preview">
            <div className="doc-paper-header">
              <span className="doc-paper-logo">📄 AUDIT LOG</span>
              <span className="doc-paper-status">RESTRICTED</span>
            </div>
            
            <div className="doc-paper-body">
              <p className="doc-paper-para">
                We have conducted a deep transaction check for the entity profiles listed inside the lead underwriter registry. Below is the primary contact metadata verified for identity resolution.
              </p>
              
              <div className="doc-paper-grid">
                <div className="doc-paper-item">
                  <div className="doc-paper-label">LEAD CLIENT</div>
                  <div className="doc-paper-value redacted-highlight">Michael Carter</div>
                </div>
                <div className="doc-paper-item">
                  <div className="doc-paper-label">EMAIL ADDRESS</div>
                  <div className="doc-paper-value redacted-highlight">michael@example.com</div>
                </div>
                <div className="doc-paper-item">
                  <div className="doc-paper-label">PHONE NUMBER</div>
                  <div className="doc-paper-value redacted-highlight">+91 9123456789</div>
                </div>
                <div className="doc-paper-item">
                  <div className="doc-paper-label">LOCATION RESIDENCE</div>
                  <div className="doc-paper-value redacted-highlight">42 Example Road, Pune, Maharashtra</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vertical Divider / Slider Handle */}
        <div 
          className="comparison-divider-line"
          style={{ left: `${sliderVal}%` }}
        >
          <div 
            className="comparison-slider-handle"
            role="slider"
            tabIndex={0}
            aria-label="Before and after redaction comparison"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={sliderVal}
            onKeyDown={handleKeyDown}
          >
            <ChevronsLeftRight className="handle-chevron-icon" size={16} />
          </div>
        </div>
      </div>

      {/* Secondary bottom slider sync track */}
      <div className="secondary-slider-container">
        <div className="slider-track-label">Original</div>
        <div className="slider-input-wrapper">
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={sliderVal} 
            onChange={(e) => setSliderVal(parseInt(e.target.value))}
            className="sync-range-slider"
            style={{
              background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${sliderVal}%, #202024 ${sliderVal}%, #202024 100%)`
            }}
          />
        </div>
        <div className="slider-track-label">Redacted</div>
      </div>
      <div className="secondary-slider-caption">Original / Redacted</div>
    </section>
  );
}
