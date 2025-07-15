// src/components/LoginPage.js
import React, { useState } from 'react';
import './LoginPage.css';

function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('teamMember'); // Default to team member, will be updated by backend response
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // New state for loading indicator

  const handleSubmit = async (e) => { // Made handleSubmit async
    e.preventDefault();
    setError(''); // Clear previous errors
    setLoading(true); // Start loading

    // Basic Client-Side Validation
    if (!username || !password) {
      setError('Please enter both username and password.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:5000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json(); // Parse the JSON response

      if (response.ok && data.success) { // Check both HTTP status (2xx) and Flask's 'success' flag
        console.log('Login successful:', data.user);
        // Pass the actual user data from the backend to the parent component
        onLoginSuccess(data.user);
      } else {
        // Handle login failure based on backend message
        setError(data.message || 'Login failed. Please check your credentials.');
        console.error('Login failed:', data.message);
      }
    } catch (err) {
      // Handle network errors or other unexpected issues
      setError('Network error. Please try again later.');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false); // Stop loading regardless of outcome
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Smart Team Assistant Login</h2>

        {error && <p className="error-message">{error}</p>}

        <div className="form-group">
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading} // Disable inputs while loading
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading} // Disable inputs while loading
          />
        </div>
        {}
        {}
        {}

        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
    </div>
  );
}

export default LoginPage;