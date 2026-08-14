'use client';

import React, { useState, useEffect, useRef } from 'react';

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

export default function Home() {
  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Redaction results state
  const [stats, setStats] = useState<PIIStat[]>([]);
  const [redactedFileB64, setRedactedFileB64] = useState('');
  const [redactedFilename, setRedactedFilename] = useState('');

  // Navigation tabs at landing level
  const [landingTab, setLandingTab] = useState<'redact' | 'benchmark'>('redact');

  // Dashboard tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'table' | 'evaluation'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [evalReport, setEvalReport] = useState<EvaluationReport | null>(null);
  const [loadingEval, setLoadingEval] = useState(false);

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

  // Upload and redact document
  const handleProcessFile = async () => {
    if (!file) return;

    setStatus('processing');
    setErrorMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${BACKEND_URL}/api/redact`, {
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

  // Aggregate entity stats for overview
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

  return (
    <main className="app-container">
      <section className="hero">
        <h1>Intelligent PII Redaction</h1>
        <p>
          Securely redact and anonymize personal identifiers from regulatory documents (such as Draft Red Herring Prospectuses) instantly. Replaces sensitive fields with context-aware, realistic alternatives while maintaining document structure and formatting.
        </p>
      </section>

      {status !== 'success' && status !== 'processing' && (
        <div className="tabs-container" style={{ justifyContent: 'center', marginBottom: '2.5rem' }}>
          <button 
            className={`tab-btn ${landingTab === 'redact' ? 'active' : ''}`}
            onClick={() => setLandingTab('redact')}
          >
            PII Redactor Tool
          </button>
          <button 
            className={`tab-btn ${landingTab === 'benchmark' ? 'active' : ''}`}
            onClick={() => setLandingTab('benchmark')}
          >
            Model Benchmark Report
          </button>
        </div>
      )}

      {landingTab === 'redact' && status === 'idle' && (
        <div className="workspace-card">
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
            <div className="upload-icon">📄</div>
            <div className="upload-text">Drag and drop your DOCX file here</div>
            <div className="upload-subtext">or click to browse from your device</div>
          </div>

          {file && (
            <div className="file-info">
              <div className="file-details">
                <span className="file-icon">📝</span>
                <div>
                  <div className="file-name">{file.name}</div>
                  <div className="file-size">{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
                </div>
              </div>
              <button className="remove-btn" onClick={removeFile}>✕</button>
            </div>
          )}

          {file && (
            <button 
              className="btn btn-primary btn-block" 
              style={{ marginTop: '1.5rem' }}
              onClick={handleProcessFile}
            >
              Analyze & Redact PII
            </button>
          )}
        </div>
      )}

      {status === 'processing' && (
        <div className="workspace-card">
          <div className="spinner-container">
            <div className="spinner spinner-pink"></div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ marginBottom: '0.5rem', fontFamily: 'var(--font-title)' }}>Analyzing & Redacting Document...</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Running Microsoft Presidio & spaCy NER models over file text.
              </p>
            </div>
          </div>
        </div>
      )}

      {landingTab === 'redact' && status === 'error' && (
        <div className="workspace-card" style={{ borderLeft: '4px solid var(--danger)' }}>
          <h3 style={{ color: 'var(--danger)', marginBottom: '0.5rem', fontFamily: 'var(--font-title)' }}>Redaction Error</h3>
          <p style={{ marginBottom: '1.5rem', fontSize: '0.95rem' }}>{errorMessage}</p>
          <button className="btn btn-secondary" onClick={removeFile}>Try Again</button>
        </div>
      )}

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

      {status === 'success' && (
        <div>
          {/* Header Action Bar */}
          <div className="workspace-card" style={{ padding: '1.5rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Processed Document</div>
              <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-title)', color: 'var(--text)' }}>{file?.name}</h3>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-primary" onClick={handleDownload}>
                ⬇️ Download Redacted DOCX
              </button>
              <button className="btn btn-secondary" onClick={removeFile}>
                Upload Another
              </button>
            </div>
          </div>

          {/* Results Workspace */}
          <div className="workspace-card">
            <div className="tabs-container">
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
              <div>
                <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.5rem', marginBottom: '1rem' }}>PII Detection Summary</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                  Successfully identified and replaced <strong>{stats.length}</strong> instances of sensitive personally identifiable information.
                </p>

                <div className="stats-grid">
                  {Object.entries(entityCounts).map(([type, count]) => (
                    <div key={type} className="stat-card">
                      <div className="stat-name">{type}</div>
                      <div className="stat-value">{count}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'table' && (
              <div>
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
              <div>
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
        </div>
      )}
    </main>
  );
}
