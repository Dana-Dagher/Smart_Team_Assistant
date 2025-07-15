// src/App.js
import React, { useState } from 'react';
import LoginPage from './components/LoginPage';
import DashboardPage from './components/DashboardPage';
import './App.css'; // Optional global styles

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); // To store { username, role }

  const handleLoginSuccess = (userData) => {
    setIsLoggedIn(true);
    setCurrentUser(userData);
    console.log('Logged in as:', userData.username, 'with role:', userData.role);
    // You'd typically redirect or render the dashboard here
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    console.log('Logged out');
  };


  return (
    <div className="App">
      {!isLoggedIn ? (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      ) : (
        <DashboardPage currentUser={currentUser} onLogout={handleLogout} />
      )}
    </div>
  );
}


export default App;