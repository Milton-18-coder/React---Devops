import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

const LOWERCASE_CHARS = 'abcdefghijklmnopqrstuvwxyz';
const LOWERCASE_FILTERED = 'abcdefghjkmnpqrstuvwxyz';

const UPPERCASE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const UPPERCASE_FILTERED = 'ABCDEFGHJKMNPQRSTUVWXY';

const NUMBER_CHARS = '0123456789';
const NUMBER_FILTERED = '23456789';

const SYMBOL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?/';

function App() {
  const [password, setPassword] = useState('');
  const [length, setLength] = useState(16);
  const [includeUpper, setIncludeUpper] = useState(true);
  const [includeLower, setIncludeLower] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [excludeSimilar, setExcludeSimilar] = useState(false);
  const [strictMode, setStrictMode] = useState(true);
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('passvault_history');
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  }, []);

  const saveHistory = (newHistory) => {
    setHistory(newHistory);
    try {
      localStorage.setItem('passvault_history', JSON.stringify(newHistory));
    } catch (e) {
      console.error('Failed to save history', e);
    }
  };

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 2500);
  };

  const generatePassword = useCallback(() => {
    let lowerPool = excludeSimilar ? LOWERCASE_FILTERED : LOWERCASE_CHARS;
    let upperPool = excludeSimilar ? UPPERCASE_FILTERED : UPPERCASE_CHARS;
    let numPool = excludeSimilar ? NUMBER_FILTERED : NUMBER_CHARS;
    let symPool = SYMBOL_CHARS;

    let activePools = [];
    if (includeLower) activePools.push({ chars: lowerPool, type: 'lower' });
    if (includeUpper) activePools.push({ chars: upperPool, type: 'upper' });
    if (includeNumbers) activePools.push({ chars: numPool, type: 'number' });
    if (includeSymbols) activePools.push({ chars: symPool, type: 'symbol' });

    if (activePools.length === 0) {
      setPassword('');
      return;
    }

    let generated = [];
    
    if (strictMode && length >= activePools.length) {
      activePools.forEach(pool => {
        const randomIndex = Math.floor(Math.random() * pool.chars.length);
        generated.push(pool.chars[randomIndex]);
      });
    }

    const unifiedPool = activePools.map(p => p.chars).join('');
    const remainingLength = length - generated.length;

    for (let i = 0; i < remainingLength; i++) {
      const randomIndex = Math.floor(Math.random() * unifiedPool.length);
      generated.push(unifiedPool[randomIndex]);
    }

    for (let i = generated.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [generated[i], generated[j]] = [generated[j], generated[i]];
    }

    const finalPass = generated.join('');
    setPassword(finalPass);

    const filteredHistory = history.filter(item => item !== finalPass);
    const updatedHistory = [finalPass, ...filteredHistory].slice(0, 5);
    saveHistory(updatedHistory);
  }, [length, includeUpper, includeLower, includeNumbers, includeSymbols, excludeSimilar, strictMode, history]);

  useEffect(() => {
    generatePassword();
  }, [length, includeUpper, includeLower, includeNumbers, includeSymbols, excludeSimilar, strictMode]);

  const handleRegenerate = () => {
    setIsRegenerating(true);
    generatePassword();
    setTimeout(() => setIsRegenerating(false), 500);
  };

  const copyToClipboard = (text, type = 'Main') => {
    if (!text) return;
    navigator.clipboard.writeText(text)
      .then(() => {
        if (type === 'Main') {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
        triggerToast(`Password copied to clipboard!`);
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
        triggerToast('Failed to copy to clipboard.');
      });
  };

  const clearHistory = () => {
    saveHistory([]);
    triggerToast('Password history cleared.');
  };

  const getEntropyDetails = () => {
    if (!password) return { entropy: 0, label: 'Empty', color: '#ff4d4d', percent: 0, timeToCrack: 'Instant' };

    let poolSize = 0;
    if (includeLower) poolSize += excludeSimilar ? LOWERCASE_FILTERED.length : LOWERCASE_CHARS.length;
    if (includeUpper) poolSize += excludeSimilar ? UPPERCASE_FILTERED.length : UPPERCASE_CHARS.length;
    if (includeNumbers) poolSize += excludeSimilar ? NUMBER_FILTERED.length : NUMBER_CHARS.length;
    if (includeSymbols) poolSize += SYMBOL_CHARS.length;

    if (poolSize === 0) return { entropy: 0, label: 'Empty', color: '#ff4d4d', percent: 0, timeToCrack: 'Instant' };

    const entropy = Math.round(password.length * Math.log2(poolSize));

    const totalGuessesNeeded = Math.pow(2, entropy - 1);
    const timeInSeconds = totalGuessesNeeded / 1e11;

    let timeToCrack = '';
    if (timeInSeconds < 1) {
      timeToCrack = 'Instant (under 1 second)';
    } else if (timeInSeconds < 60) {
      timeToCrack = `${Math.round(timeInSeconds)} seconds`;
    } else if (timeInSeconds < 3600) {
      timeToCrack = `${Math.round(timeInSeconds / 60)} minutes`;
    } else if (timeInSeconds < 86400) {
      timeToCrack = `${Math.round(timeInSeconds / 3600)} hours`;
    } else if (timeInSeconds < 31536000) {
      timeToCrack = `${Math.round(timeInSeconds / 86400)} days`;
    } else if (timeInSeconds < 3153600000) {
      timeToCrack = `${Math.round(timeInSeconds / 31536000)} years`;
    } else if (timeInSeconds < 3153600000000) {
      timeToCrack = `${Math.round(timeInSeconds / 31536000000)} centuries`;
    } else {
      timeToCrack = 'Millions of years';
    }

    let label = 'Weak';
    let color = '#ff4d6d';
    let percent = 20;

    if (entropy >= 28 && entropy < 45) {
      label = 'Fair';
      color = '#ff9f1c';
      percent = 40;
    } else if (entropy >= 45 && entropy < 60) {
      label = 'Good';
      color = '#ffd166';
      percent = 60;
    } else if (entropy >= 60 && entropy < 80) {
      label = 'Strong';
      color = '#06d6a0';
      percent = 80;
    } else if (entropy >= 80) {
      label = 'Very Secure';
      color = '#118ab2';
      percent = 100;
    }

    return { entropy, label, color, percent, timeToCrack };
  };

  const { entropy, label, color, percent, timeToCrack } = getEntropyDetails();

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="badge">PASSVAULT</div>
        <h1>PassVault</h1>
        <p className="subtitle">Create strong, customized passwords designed to withstand high-end security cracks.</p>
      </header>

      <main className="app-content">
        <section className="card display-card">
          <div className="password-wrapper">
            <span className={`password-text ${!password ? 'empty' : ''}`} style={{ fontSize: password.length > 24 ? '1.2rem' : '1.8rem' }}>
              {password || 'Select options below...'}
            </span>
          </div>

          <div className="actions-wrapper">
            <button 
              type="button" 
              className={`action-btn regenerate-btn ${isRegenerating ? 'spinning' : ''}`} 
              onClick={handleRegenerate}
              title="Regenerate Password"
              disabled={!includeLower && !includeUpper && !includeNumbers && !includeSymbols}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
              </svg>
            </button>

            <button 
              type="button" 
              className={`action-btn copy-btn ${copied ? 'copied' : ''}`}
              onClick={() => copyToClipboard(password)}
              title="Copy to Clipboard"
              disabled={!password}
            >
              {copied ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#00f5d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              )}
            </button>
          </div>
        </section>

        {password && (
          <section className="strength-summary-card">
            <div className="strength-text-info">
              <span>Security Level: <strong style={{ color }}>{label}</strong></span>
              <span className="entropy-val">{entropy} bits entropy</span>
            </div>
            <div className="progress-track">
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${percent}%`, 
                  background: color,
                  boxShadow: `0 0 12px ${color}`
                }}
              />
            </div>
          </section>
        )}

        <div className="settings-grid">
          <section className="card settings-card">
            <h2>Configure Settings</h2>
            
            <div className="setting-group slider-group">
              <div className="setting-label">
                <span>Password Length</span>
                <span className="length-badge">{length}</span>
              </div>
              <div className="slider-wrapper">
                <input 
                  type="range" 
                  min="4" 
                  max="64" 
                  value={length} 
                  onChange={(e) => setLength(parseInt(e.target.value))} 
                  className="length-slider"
                  style={{
                    background: `linear-gradient(to right, var(--neon-purple) 0%, var(--neon-cyan) ${((length - 4) / 60) * 100}%, var(--border) ${((length - 4) / 60) * 100}%, var(--border) 100%)`
                  }}
                />
              </div>
            </div>

            <div className="switches-grid">
              <label className="switch-container">
                <div className="switch-info">
                  <span className="switch-title">Uppercase (A-Z)</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={includeUpper} 
                  onChange={() => setIncludeUpper(!includeUpper)}
                />
                <span className="switch-slider"></span>
              </label>

              <label className="switch-container">
                <div className="switch-info">
                  <span className="switch-title">Lowercase (a-z)</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={includeLower} 
                  onChange={() => setIncludeLower(!includeLower)}
                />
                <span className="switch-slider"></span>
              </label>

              <label className="switch-container">
                <div className="switch-info">
                  <span className="switch-title">Numbers (0-9)</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={includeNumbers} 
                  onChange={() => setIncludeNumbers(!includeNumbers)}
                />
                <span className="switch-slider"></span>
              </label>

              <label className="switch-container">
                <div className="switch-info">
                  <span className="switch-title">Symbols (!@#$)</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={includeSymbols} 
                  onChange={() => setIncludeSymbols(!includeSymbols)}
                />
                <span className="switch-slider"></span>
              </label>

              <label className="switch-container">
                <div className="switch-info">
                  <span className="switch-title">Avoid Confusing (l, 1, o, 0)</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={excludeSimilar} 
                  onChange={() => setExcludeSimilar(!excludeSimilar)}
                />
                <span className="switch-slider"></span>
              </label>

              <label className="switch-container">
                <div className="switch-info">
                  <span className="switch-title">Strict Mode (One of each)</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={strictMode} 
                  onChange={() => setStrictMode(!strictMode)}
                />
                <span className="switch-slider"></span>
              </label>
            </div>
          </section>

          <div className="right-panel">
            {password && (
              <section className="card analytics-card">
                <h2>Strength Analytics</h2>
                <div className="analytics-details">
                  <div className="analytic-row">
                    <span className="label">Entropy Score</span>
                    <span className="value">{entropy} bits</span>
                  </div>
                  <div className="analytic-row">
                    <span className="label">Complexity Pool</span>
                    <span className="value">
                      { (includeLower ? (excludeSimilar ? LOWERCASE_FILTERED.length : LOWERCASE_CHARS.length) : 0) +
                        (includeUpper ? (excludeSimilar ? UPPERCASE_FILTERED.length : UPPERCASE_CHARS.length) : 0) +
                        (includeNumbers ? (excludeSimilar ? NUMBER_FILTERED.length : NUMBER_CHARS.length) : 0) +
                        (includeSymbols ? SYMBOL_CHARS.length : 0) } chars
                    </span>
                  </div>
                  <div className="analytic-row">
                    <span className="label">Time to crack (100B/s)</span>
                    <span className="value highlighted" style={{ color }}>{timeToCrack}</span>
                  </div>
                </div>
              </section>
            )}

            <section className="card history-card">
              <div className="history-header">
                <h2>Password History</h2>
                {history.length > 0 && (
                  <button type="button" className="clear-btn" onClick={clearHistory}>
                    Clear
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="empty-history">
                  <p>No password history recorded yet.</p>
                </div>
              ) : (
                <ul className="history-list">
                  {history.map((pw, index) => (
                    <li key={index} className="history-item">
                      <span className="history-pass">{pw}</span>
                      <button 
                        type="button" 
                        className="copy-item-btn" 
                        onClick={() => copyToClipboard(pw, 'History')}
                        title="Copy password"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </main>

      {toastMessage && (
        <div className="floating-toast">
          <span>{toastMessage}</span>
        </div>
      )}

      <footer className="app-footer">
        <p>PassVault | Secured Offline Browser-Based Generator</p>
      </footer>
    </div>
  );
}

export default App;
