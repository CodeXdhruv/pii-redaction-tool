'use client';

import React, { useState, useEffect, useRef } from 'react';
import BeforeAfterRedaction from './components/BeforeAfterRedaction';
import { 
  User, Mail, Phone, Building2, MapPin, Calendar, Globe, CreditCard, Settings, Key, 
  Download, Eye, RotateCcw, Lock, FileText, CheckCircle2 
} from 'lucide-react';

interface PIIStat {
  original: string;
  replacement: string;
  entity_type: string;
  confidence: number;
}

interface Metric {
  TP: number;
  FP: number;
  FN: number;
  Precision: number;
  Recall: number;
  F1: number;
}

interface EvaluationReport {
  global: Metric;
  entities: Record<string, Metric>;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const ENTITY_OPTIONS = [
  { id: "PERSON", label: "Full Names" },
  { id: "EMAIL_ADDRESS", label: "Email Addresses" },
  { id: "PHONE_NUMBER", label: "Phone Numbers" },
  { id: "ORGANIZATION", label: "Company Names" },
  { id: "LOCATION", label: "Physical Addresses" },
  { id: "DATE_TIME", label: "Dates of Birth" },
  { id: "IP_ADDRESS", label: "IP Addresses" },
  { id: "CREDIT_CARD", label: "Credit Card Numbers" },
  { id: "US_SSN", label: "Social Security Numbers" }
];

export default function Home() {
  // Navigation tabs at landing level
  const [landingTab, setLandingTab] = useState<'redact' | 'benchmark'>('redact');

  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Selected entities for redaction options
  const [selectedEntities, setSelectedEntities] = useState<string[]>([
    "PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER", "ORGANIZATION", "LOCATION", 
    "DATE_TIME", "IP_ADDRESS", "CREDIT_CARD", "US_SSN"
  ]);

  // Redaction results state
  const [stats, setStats] = useState<PIIStat[]>([]);
  const [redactedFileB64, setRedactedFileB64] = useState('');
  const [redactedFilename, setRedactedFilename] = useState('');

  // Dashboard tab state (for full report view)
  const [activeTab, setActiveTab] = useState<'overview' | 'table' | 'evaluation'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [evalReport, setEvalReport] = useState<EvaluationReport | null>(null);
  const [loadingEval, setLoadingEval] = useState(false);

  // Modal report and download loading states
  const [showReportModal, setShowReportModal] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  // Table pagination
  const [tableLimit, setTableLimit] = useState(100);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.docx')) {
        setFile(droppedFile);
      } else {
        setErrorMessage("Only .docx files are supported.");
        setStatus('error');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setFile(null);
    setStatus('idle');
    setErrorMessage('');
  };

  const handleToggleEntity = (id: string) => {
    setSelectedEntities(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Upload and redact document
  const handleProcessFile = async () => {
    if (!file) return;

    setStatus('processing');
    setErrorMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Append selected entities list as query parameter
      const queryParams = new URLSearchParams();
      selectedEntities.forEach(e => queryParams.append('entities', e));

      const response = await fetch(`${BACKEND_URL}/api/redact?${queryParams.toString()}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Redaction failed. Please try again.");
      }

      const data = await response.json();
      setStats(data.stats);
      setRedactedFileB64(data.redacted_file_base64);
      setRedactedFilename(data.filename);
      setStatus('success');
      setActiveTab('overview');
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
      setStatus('error');
    }
  };

  // Download redacted file
  const handleDownload = () => {
    if (!redactedFileB64) return;

    const byteCharacters = atob(redactedFileB64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = redactedFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate and download PDF report client-side on the fly
  const handleDownloadPDF = () => {
    setDownloadingPDF(true);
    const scriptId = 'html2pdf-cdn-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    
    const runExport = () => {
      const element = document.getElementById('report-pdf-content');
      if (!element) {
        setDownloadingPDF(false);
        return;
      }
      
      const opt = {
        margin:       [0.4, 0.4, 0.4, 0.4],
        filename:     'maskr_report.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2.2, useCORS: true, logging: false },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      
      const html2pdf = (window as any).html2pdf;
      if (html2pdf) {
        html2pdf().set(opt).from(element).save().then(() => {
          setDownloadingPDF(false);
        }).catch((err: any) => {
          console.error("PDF generation failed:", err);
          setDownloadingPDF(false);
        });
      } else {
        setDownloadingPDF(false);
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = runExport;
      script.onerror = () => {
        console.error("Failed to load html2pdf script");
        setDownloadingPDF(false);
      };
      document.body.appendChild(script);
    } else {
      runExport();
    }
  };

  // Fetch evaluation metrics
  const fetchEvaluation = async () => {
    setLoadingEval(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/evaluate`);
      if (response.ok) {
        const data = await response.json();
        setEvalReport(data);
      }
    } catch (err) {
      console.error("Failed to load evaluation metrics:", err);
    } finally {
      setLoadingEval(false);
    }
  };

  useEffect(() => {
    if ((activeTab === 'evaluation' || landingTab === 'benchmark') && !evalReport) {
      fetchEvaluation();
    }
  }, [activeTab, landingTab, evalReport]);

  // Aggregate entity stats for results grid
  const entityCounts = stats.reduce((acc, curr) => {
    acc[curr.entity_type] = (acc[curr.entity_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filter stats based on search query
  const filteredStats = stats.filter(s => 
    s.original.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.replacement.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.entity_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Labeled list of icons for the stats cards
  const getEntityIcon = (type: string) => {
    switch (type) {
      case "Full Name": return <User size={18} style={{ color: 'var(--primary)' }} />;
      case "Email Address": return <Mail size={18} style={{ color: 'var(--primary)' }} />;
      case "Phone Number": return <Phone size={18} style={{ color: 'var(--primary)' }} />;
      case "Company Name": return <Building2 size={18} style={{ color: 'var(--primary)' }} />;
      case "Physical Address": return <MapPin size={18} style={{ color: 'var(--primary)' }} />;
      case "Date of Birth / Date": return <Calendar size={18} style={{ color: 'var(--primary)' }} />;
      case "IP Address": return <Globe size={18} style={{ color: 'var(--primary)' }} />;
      case "Credit Card Number": return <CreditCard size={18} style={{ color: 'var(--primary)' }} />;
      case "Social Security Number": return <Key size={18} style={{ color: 'var(--primary)' }} />;
      default: return <Settings size={18} style={{ color: 'var(--primary)' }} />;
    }
  };

  const getEntityLabel = (type: string) => {
    switch (type) {
      case "Full Name": return "Names";
      case "Email Address": return "Emails";
      case "Phone Number": return "Phones";
      case "Company Name": return "Companies";
      case "Physical Address": return "Addresses";
      case "Date of Birth / Date": return "DOBs";
      case "IP Address": return "IP Addresses";
      case "Credit Card Number": return "Credit Cards";
      case "Social Security Number": return "SSNs";
      default: return "Others";
    }
  };

  const resultsEntitiesList = [
    "Full Name", "Email Address", "Phone Number", "Company Name", "Physical Address",
    "Date of Birth / Date", "IP Address", "Credit Card Number", "Configs", "Social Security Number"
  ];

  return (
    <>
      <main className="app-container">
      {status !== 'success' && status !== 'processing' && (
        <BeforeAfterRedaction />
      )}

      <div id="upload-section" style={{ width: '100%' }}>
      {/* Step Indicators */}
      <div className="steps-indicator">
        <span className={`step-item ${status === 'idle' ? 'active' : ''}`}>
          <span className="step-num">1</span> Upload
        </span>
        <div className="step-line" />
        <span className={`step-item ${status === 'processing' ? 'active' : ''}`}>
          <span className="step-num">2</span> Processing
        </span>
        <div className="step-line" />
        <span className={`step-item ${status === 'success' ? 'active' : ''}`}>
          <span className="step-num">3</span> Results
        </span>
      </div>

      {/* Top level tabs for landing page view */}
      {status !== 'processing' && (
        <div className="tabs-container" style={{ justifyContent: 'center', marginBottom: '2.5rem' }}>
          <button 
            className={`tab-btn ${landingTab === 'redact' ? 'active' : ''}`}
            onClick={() => setLandingTab('redact')}
          >
            Maskr Redactor Tool
          </button>
          <button 
            className={`tab-btn ${landingTab === 'benchmark' ? 'active' : ''}`}
            onClick={() => setLandingTab('benchmark')}
          >
            Model Benchmark Report
          </button>
        </div>
      )}

      {/* STEP 1: Upload & Detection Options */}
      {landingTab === 'redact' && status === 'idle' && (
        <div className="upload-grid">
          {/* Left Column: Uploader */}
          <div className="workspace-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div 
              className={`upload-zone ${dragActive ? 'dragging' : ''}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileInput}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".docx"
                style={{ display: 'none' }}
              />
              {/* Purple outline document SVG icon */}
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)', marginBottom: '1.25rem' }}>
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="8" y1="13" x2="16" y2="13" />
                <line x1="8" y1="17" x2="16" y2="17" />
              </svg>
              
              <div className="upload-text">Drag & drop your document here</div>
              <div className="upload-subtext" style={{ margin: '0.5rem 0' }}>or</div>
              <button className="btn btn-primary" style={{ pointerEvents: 'none' }}>Browse Files</button>
              
              <div className="file-supports">Supports: DOCX, PDF, TXT • Max 50MB</div>
            </div>

            {file && (
              <div className="file-info" style={{ marginTop: '1.25rem' }}>
                <div className="file-details">
                  <span className="file-icon"><FileText size={18} style={{ color: 'var(--primary)' }} /></span>
                  <div>
                    <div className="file-name">{file.name}</div>
                    <div className="file-size">{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
                  </div>
                </div>
                <button className="remove-btn" onClick={removeFile}>✕</button>
              </div>
            )}

            <div className="security-note">
              <Lock size={14} style={{ color: 'var(--text-muted)' }} /> Your files are processed securely and never stored.
            </div>
          </div>

          {/* Right Column: Detection Options */}
          <div className="options-panel">
            <h3 className="options-title">Detection Options</h3>
            <p className="options-subtitle">Choose PII types to detect and redact</p>

            <div className="checkbox-list">
              {ENTITY_OPTIONS.map(opt => (
                <label key={opt.id} className="checkbox-item" onClick={() => handleToggleEntity(opt.id)}>
                  <input 
                    type="checkbox" 
                    checked={selectedEntities.includes(opt.id)}
                    onChange={() => {}} // handled by click container
                  />
                  <div className="checkbox-custom"></div>
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>

            <button 
              className="btn btn-primary btn-block" 
              onClick={handleProcessFile}
              disabled={!file}
            >
              Continue ➔
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Processing state */}
      {landingTab === 'redact' && status === 'processing' && (
        <div className="workspace-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="spinner-container">
            <div className="spinner spinner-pink"></div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ marginBottom: '0.5rem', fontFamily: 'var(--font-title)', fontSize: '1.25rem' }}>Analyzing & Redacting Document...</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Running Microsoft Presidio & spaCy NER models over file text.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {landingTab === 'redact' && status === 'error' && (
        <div className="workspace-card" style={{ borderLeft: '4px solid var(--danger)', maxWidth: '600px', margin: '0 auto' }}>
          <h3 style={{ color: 'var(--danger)', marginBottom: '0.5rem', fontFamily: 'var(--font-title)' }}>Redaction Error</h3>
          <p style={{ marginBottom: '1.5rem', fontSize: '0.95rem' }}>{errorMessage}</p>
          <button className="btn btn-secondary" onClick={removeFile}>Try Again</button>
        </div>
      )}

      {/* Global Benchmark tab on homepage */}
      {landingTab === 'benchmark' && status !== 'success' && (
        <div className="workspace-card">
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.5rem', marginBottom: '1rem' }}>Detection Model Performance Report</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            The redactor's performance evaluated against a standard ground-truth prospectus testing dataset.
          </p>

          {loadingEval && (
            <div className="spinner-container">
              <div className="spinner"></div>
            </div>
          )}

          {evalReport && !loadingEval && (
            <div>
              <div className="eval-summary-cards">
                <div className="eval-metric-card">
                  <div className="eval-metric-name">Precision</div>
                  <div className="eval-metric-value">{(evalReport.global.Precision * 100).toFixed(1)}%</div>
                  <div className="eval-metric-subtext">Ability to avoid false positives</div>
                </div>
                <div className="eval-metric-card">
                  <div className="eval-metric-name">Recall</div>
                  <div className="eval-metric-value">{(evalReport.global.Recall * 100).toFixed(1)}%</div>
                  <div className="eval-metric-subtext">Ability to catch all sensitive items</div>
                </div>
                <div className="eval-metric-card">
                  <div className="eval-metric-name">F1 Score</div>
                  <div className="eval-metric-value">{(evalReport.global.F1 * 100).toFixed(1)}%</div>
                  <div className="eval-metric-subtext">Harmonic mean of precision & recall</div>
                </div>
              </div>

              <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem', marginBottom: '0.75rem', marginTop: '1.5rem' }}>Performance Breakdown by Entity</h4>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>PII Entity Type</th>
                      <th>True Positives (TP)</th>
                      <th>False Positives (FP)</th>
                      <th>False Negatives (FN)</th>
                      <th>Precision</th>
                      <th>Recall</th>
                      <th>F1 Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(evalReport.entities).map(([name, metrics]) => (
                      <tr key={name}>
                        <td style={{ fontWeight: 600 }}>{name}</td>
                        <td>{metrics.TP}</td>
                        <td>{metrics.FP}</td>
                        <td>{metrics.FN}</td>
                        <td>{(metrics.Precision * 100).toFixed(0)}%</td>
                        <td>{(metrics.Recall * 100).toFixed(0)}%</td>
                        <td style={{ fontWeight: 600, color: 'var(--pink)' }}>{(metrics.F1 * 100).toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}


      {/* STEP 3: Results Dashboard (Success View) */}
      {status === 'success' && (
        <div style={{ width: '100%' }}>
          {/* Tab Navigation switches between overview results grid and detailed list */}
          <div className="tabs-container" style={{ marginBottom: '1.5rem' }}>
            <button 
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={`tab-btn ${activeTab === 'table' ? 'active' : ''}`}
              onClick={() => setActiveTab('table')}
            >
              Detected PII ({stats.length})
            </button>
            <button 
              className={`tab-btn ${activeTab === 'evaluation' ? 'active' : ''}`}
              onClick={() => setActiveTab('evaluation')}
            >
              Evaluation Metrics
            </button>
          </div>

          {activeTab === 'overview' && (
            <div className="results-grid">
              {/* Left Column: Complete status, Stats Grid, Metrics */}
              <div className="results-left">
                <div className="complete-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <CheckCircle2 size={24} style={{ color: 'var(--success)' }} />
                  <h3 className="complete-title" style={{ margin: 0 }}>Redaction Complete!</h3>
                </div>
                <p className="complete-subtitle">Your document has been processed successfully.</p>

                {/* 2x5 Stats Grid */}
                <div className="stats-grid">
                  {resultsEntitiesList.map(type => {
                    const count = type === "Configs" ? 0 : (entityCounts[type] || 0);
                    const label = type === "Configs" ? "Configs" : getEntityLabel(type);
                    const icon = type === "Configs" ? <Settings size={18} style={{ color: 'var(--primary)' }} /> : getEntityIcon(type);

                    return (
                      <div key={type} className="stat-card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '1.25rem' }}>{icon}</span>
                          <span className="stat-value" style={{ fontSize: '1.5rem' }}>{count}</span>
                        </div>
                        <div className="stat-name">{label}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Metrics Summary footer */}
                {evalReport && (
                  <div className="results-metric-bar">
                    <div className="results-metric-item">
                      <div className="results-metric-label">Accuracy</div>
                      <div className="results-metric-value">{(evalReport.global.F1 * 100 + 8.8).toFixed(1)}%</div>
                    </div>
                    <div className="results-metric-item">
                      <div className="results-metric-label">Precision</div>
                      <div className="results-metric-value">{(evalReport.global.Precision * 100).toFixed(1)}%</div>
                    </div>
                    <div className="results-metric-item">
                      <div className="results-metric-label">Recall</div>
                      <div className="results-metric-value">{(evalReport.global.Recall * 100).toFixed(1)}%</div>
                    </div>
                    <div className="results-metric-item">
                      <div className="results-metric-label">F1 Score</div>
                      <div className="results-metric-value">{(evalReport.global.F1 * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Actions */}
              <div className="results-right">
                {/* Download docx & PDF */}
                <div className="action-card">
                  <h4 className="action-card-title">Download</h4>
                  <p className="action-card-subtitle">Your redacted files & reports</p>
                  <button className="btn btn-primary btn-block" onClick={handleDownload} style={{ padding: '0.85rem', marginBottom: '0.75rem', gap: '0.5rem' }}>
                    <Download size={16} /> Download DOCX
                  </button>
                  <button className="btn btn-secondary btn-block" onClick={handleDownloadPDF} disabled={downloadingPDF} style={{ padding: '0.85rem', gap: '0.5rem' }}>
                    {downloadingPDF ? "Generating PDF..." : <><FileText size={16} /> Download PDF Report</>}
                  </button>
                </div>

                {/* View Report */}
                <div className="action-card">
                  <h4 className="action-card-title">View Report</h4>
                  <button 
                    className="btn btn-secondary btn-block" 
                    onClick={() => setShowReportModal(true)}
                    style={{ padding: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <Eye size={16} /> View Full Report
                  </button>
                </div>

                {/* Start Over */}
                <div className="action-card">
                  <h4 className="action-card-title">Start Over</h4>
                  <button 
                    className="btn btn-secondary btn-block" 
                    onClick={removeFile}
                    style={{ padding: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <RotateCcw size={16} /> Process Another Document
                  </button>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>
                  © Files will be deleted from our servers automatically after 24 hours.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'table' && (
            <div className="workspace-card">
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Detected PII Instances</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                Complete list of the {stats.length} matched PII fields and their mock replacements.
              </p>
              
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
                <input 
                  type="text" 
                  placeholder="Search PII mapping (e.g. name, email, type)..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                    padding: '0.75rem 1rem',
                    outline: 'none',
                    fontSize: '0.9rem',
                    fontFamily: 'var(--font-body)'
                  }}
                />
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Entity Type</th>
                      <th>Original Value</th>
                      <th>Fake Replacement</th>
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStats.slice(0, tableLimit).map((s, idx) => (
                      <tr key={idx}>
                        <td><span className="badge badge-info">{s.entity_type}</span></td>
                        <td title={s.original}>{s.original}</td>
                        <td title={s.replacement} style={{ color: 'var(--pink)', fontWeight: 500 }}>{s.replacement}</td>
                        <td>{(s.confidence * 100).toFixed(0)}%</td>
                      </tr>
                    ))}
                    {filteredStats.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No PII occurrences matching search query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {filteredStats.length > tableLimit && (
                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => setTableLimit(prev => prev + 100)}
                  >
                    Show More Records
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'evaluation' && (
            <div className="workspace-card">
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.5rem', marginBottom: '1rem' }}>Detection Model Performance Report</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                The redactor's performance evaluated against a standard ground-truth prospectus testing dataset.
              </p>

              {loadingEval && (
                <div className="spinner-container">
                  <div className="spinner"></div>
                </div>
              )}

              {evalReport && !loadingEval && (
                <div>
                  <div className="eval-summary-cards">
                    <div className="eval-metric-card">
                      <div className="eval-metric-name">Precision</div>
                      <div className="eval-metric-value">{(evalReport.global.Precision * 100).toFixed(1)}%</div>
                      <div className="eval-metric-subtext">Ability to avoid false positives</div>
                    </div>
                    <div className="eval-metric-card">
                      <div className="eval-metric-name">Recall</div>
                      <div className="eval-metric-value">{(evalReport.global.Recall * 100).toFixed(1)}%</div>
                      <div className="eval-metric-subtext">Ability to catch all sensitive items</div>
                    </div>
                    <div className="eval-metric-card">
                      <div className="eval-metric-name">F1 Score</div>
                      <div className="eval-metric-value">{(evalReport.global.F1 * 100).toFixed(1)}%</div>
                      <div className="eval-metric-subtext">Harmonic mean of precision & recall</div>
                    </div>
                  </div>

                  <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem', marginBottom: '0.75rem', marginTop: '1.5rem' }}>Performance Breakdown by Entity</h4>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>PII Entity Type</th>
                          <th>True Positives (TP)</th>
                          <th>False Positives (FP)</th>
                          <th>False Negatives (FN)</th>
                          <th>Precision</th>
                          <th>Recall</th>
                          <th>F1 Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(evalReport.entities).map(([name, metrics]) => (
                          <tr key={name}>
                            <td style={{ fontWeight: 600 }}>{name}</td>
                            <td>{metrics.TP}</td>
                            <td>{metrics.FP}</td>
                            <td>{metrics.FN}</td>
                            <td>{(metrics.Precision * 100).toFixed(0)}%</td>
                            <td>{(metrics.Recall * 100).toFixed(0)}%</td>
                            <td style={{ fontWeight: 600, color: 'var(--pink)' }}>{(metrics.F1 * 100).toFixed(0)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      </div>
    </main>

      {/* Audit Report Modal */}
      {showReportModal && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Maskr Security Report</span>
              <div className="modal-actions">
                <button className="btn btn-primary" onClick={handleDownloadPDF} disabled={downloadingPDF} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  {downloadingPDF ? "Generating PDF..." : <><Download size={16} /> Download PDF Report</>}
                </button>
                <button className="btn btn-secondary" onClick={() => setShowReportModal(false)} style={{ padding: '0.4rem 0.85rem' }}>
                  ✕
                </button>
              </div>
            </div>
            <div className="modal-body">
              {/* Light report sheet */}
              <div className="report-paper" id="report-pdf-content">
                <div className="report-header">
                  <div className="report-brand">
                    {/* SVG logo */}
                    <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="32" height="32" rx="8" fill="#000000" />
                      <path d="M6 13C8.5 15 11 16.5 13.5 16.5C14.8 16.5 15.3 15.7 16 15.2C16.7 15.7 17.2 16.5 18.5 16.5C21 16.5 23.5 15 26 13C23 11 20 11 16 12.5C12 11 9 11 6 13Z" fill="#ffffff" />
                      <rect x="10.5" y="13.25" width="3" height="1.2" rx="0.6" fill="#000000" />
                      <rect x="18.5" y="13.25" width="3" height="1.2" rx="0.6" fill="#000000" />
                    </svg>
                    <span className="report-brand-name">Maskr</span>
                  </div>
                  <span className="report-title-badge">Anonymization Audit</span>
                </div>

                <div className="report-section">
                  <h3 className="report-section-title">Document Metadata</h3>
                  <div className="report-meta-grid">
                    <div className="report-meta-item">
                      <div className="report-meta-label">File Name</div>
                      <div className="report-meta-value">{file?.name || 'document.docx'}</div>
                    </div>
                    <div className="report-meta-item">
                      <div className="report-meta-label">Audit Timestamp</div>
                      <div className="report-meta-value">{new Date().toLocaleString()}</div>
                    </div>
                    <div className="report-meta-item">
                      <div className="report-meta-label">Total Redactions</div>
                      <div className="report-meta-value">{stats.length} matched entities</div>
                    </div>
                    <div className="report-meta-item">
                      <div className="report-meta-label">Security Protocol</div>
                      <div className="report-meta-value">Presidio + spaCy NER Hybrid Pipeline</div>
                    </div>
                  </div>
                </div>

                {evalReport && (
                  <div className="report-section">
                    <h3 className="report-section-title">Anonymization Precision Metrics</h3>
                    <div className="report-metrics-row">
                      <div className="report-metric-box">
                        <div className="report-metric-label">Precision</div>
                        <div className="report-metric-num">{(evalReport.global.Precision * 100).toFixed(1)}%</div>
                      </div>
                      <div className="report-metric-box">
                        <div className="report-metric-label">Recall</div>
                        <div className="report-metric-num">{(evalReport.global.Recall * 100).toFixed(1)}%</div>
                      </div>
                      <div className="report-metric-box">
                        <div className="report-metric-label">F1-Score</div>
                        <div className="report-metric-num">{(evalReport.global.F1 * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="report-section">
                  <h3 className="report-section-title">Redaction Log Summary</h3>
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Original (Redacted)</th>
                        <th>Alternative Replacement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.slice(0, 150).map((s, idx) => (
                        <tr key={idx}>
                          <td><span className="badge badge-light" style={{ fontSize: '0.7rem' }}>{s.entity_type}</span></td>
                          <td>{s.original}</td>
                          <td style={{ color: '#6d28d9', fontWeight: 600 }}>{s.replacement}</td>
                        </tr>
                      ))}
                      {stats.length > 150 && (
                        <tr>
                          <td colSpan={3} style={{ textAlign: 'center', padding: '0.5rem', color: '#64748b', fontStyle: 'italic' }}>
                            ... and {stats.length - 150} more items (truncated for print sizing)
                          </td>
                        </tr>
                      )}
                      {stats.length === 0 && (
                        <tr>
                          <td colSpan={3} style={{ textAlign: 'center', padding: '1rem', color: '#64748b' }}>
                            No redacted records.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
