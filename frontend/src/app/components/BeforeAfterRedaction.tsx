'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Zap, Lock, ChevronsLeftRight, ChevronDown } from 'lucide-react';

interface BeforeAfterRedactionProps {
  className?: string;
}

export default function BeforeAfterRedaction({ className = "" }: BeforeAfterRedactionProps) {
  const [sliderVal, setSliderVal] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!mediaQuery.matches) {
      const timer = setTimeout(() => {
        setAnimate(true);
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
    <section className={`hero-split-container ${className}`}>
      {/* Left Column: Catchy copy and badges */}
      <div className={`hero-left-col ${animate ? 'fade-up-active' : ''}`}>
        <div className="hero-badge">
          <span className="hero-badge-dot"></span>
          🛡️ Enterprise-Grade Document Redaction
        </div>
        <h1 className="hero-split-title">
          Anonymize Sensitive Files Instantly
        </h1>
        <h2 className="hero-split-subtitle">
          See the Difference <span className="accent-gradient">Before</span> & After
        </h2>
        <p className="hero-split-desc">
          Protect privacy with intelligent context-aware redaction. Maskr automatically replaces names, emails, phones, and addresses from legal or financial documents with realistic alternatives while preserving 100% of formatting, columns, and styles.
        </p>

        {/* Feature Badges stacked/row */}
        <div className="hero-badges-grid">
          <div className="hero-feature-pill">
            <ShieldCheck className="feature-pill-icon" size={16} />
            <span>Smart PII Detection</span>
          </div>
          <div className="hero-feature-pill">
            <Zap className="feature-pill-icon" size={16} />
            <span>Fast & Accurate (NER)</span>
          </div>
          <div className="hero-feature-pill">
            <Lock className="feature-pill-icon" size={16} />
            <span>Privacy First (Secured)</span>
          </div>
        </div>
      </div>

      {/* Right Column: Comparison Card Slider */}
      <div className="hero-right-col">
        <div 
          className={`comparison-card-container compact-slider ${isDragging ? 'dragging' : ''}`}
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onTouchStart={() => setIsDragging(true)}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => setIsDragging(false)}
        >
          {/* Original Side Document */}
          <div 
            className="document-layer original-layer"
            style={{ clipPath: `inset(0 ${100 - sliderVal}% 0 0)` }}
          >
            <div className="layer-tag-pill original-pill">ORIGINAL</div>
            <div className="doc-watermark">CONFIDENTIAL</div>
            
            <div className="doc-paper-preview compact-preview">
              <div className="doc-paper-header">
                <span className="doc-paper-logo">📄 AUDIT LOG</span>
                <span className="doc-paper-status">RESTRICTED</span>
              </div>
              
              <div className="doc-paper-body">
                <div className="doc-paper-grid compact-grid">
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
                    <div className="doc-paper-value original-highlight">Mumbai, MH</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Redacted Side Document */}
          <div 
            className="document-layer redacted-layer"
            style={{ clipPath: `inset(0 0 0 ${sliderVal}%)` }}
          >
            <div className="layer-tag-pill redacted-pill">REDACTED</div>
            <div className="doc-watermark">ANONYMIZED</div>

            <div className="doc-paper-preview compact-preview">
              <div className="doc-paper-header">
                <span className="doc-paper-logo">📄 AUDIT LOG</span>
                <span className="doc-paper-status">RESTRICTED</span>
              </div>
              
              <div className="doc-paper-body">
                <div className="doc-paper-grid compact-grid">
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
                    <div className="doc-paper-value redacted-highlight">Pune, MH</div>
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
              className="comparison-slider-handle compact-handle"
              role="slider"
              tabIndex={0}
              aria-label="Before and after redaction comparison"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={sliderVal}
              onKeyDown={handleKeyDown}
            >
              <ChevronsLeftRight className="handle-chevron-icon" size={14} />
            </div>
          </div>
        </div>

        {/* Sync Slider */}
        <div className="secondary-slider-container compact-track" style={{ margin: '0.75rem auto 0 auto' }}>
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
      </div>

      {/* Scroll Down Indicator */}
      <div className="scroll-down-wrapper" onClick={() => {
        const el = document.getElementById('upload-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }}>
        <span className="scroll-text">Start Redacting</span>
        <ChevronDown className="scroll-arrow-icon" size={20} />
      </div>
    </section>
  );
}
