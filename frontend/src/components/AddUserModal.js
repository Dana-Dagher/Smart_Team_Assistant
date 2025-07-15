// src/components/AddUserModal.js
import React, { useState } from 'react';
import './AddUserModal.css'; // We'll create this CSS file next

function AddUserModal({ isOpen, onClose, onAddUserSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('teamMember'); // Default to teamMember
    const [skills, setSkills] = useState('');
    const [pastProjects, setPastProjects] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null; // Don't render if not open

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('http://127.0.0.1:5000/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    password,
                    role,
                    skills,
                    past_projects: pastProjects // Ensure this matches backend expected key
                }),
            });

            const data = await response.json();

            if (response.ok) {
                alert('User added successfully!');
                onAddUserSuccess(data); // Pass the new user data up to parent component
                // Reset form fields
                setUsername('');
                setPassword('');
                setRole('teamMember');
                setSkills('');
                setPastProjects('');
                onClose(); // Close the modal
            } else {
                setError(data.error || 'Failed to add user.');
                console.error('Error adding user:', data);
            }
        } catch (err) {
            setError('Network error: Could not connect to the server.');
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Add New User</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="username">Username:</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
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
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="role">Role:</label>
                        <select
                            id="role"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            required
                        >
                            <option value="teamMember">Team Member</option>
                            <option value="teamLead">Team Lead</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="skills">Skills (comma-separated):</label>
                        <textarea
                            id="skills"
                            value={skills}
                            onChange={(e) => setSkills(e.target.value)}
                            rows="3"
                            placeholder="e.g., React, Python, UI/UX Design"
                        ></textarea>
                    </div>
                    <div className="form-group">
                        <label htmlFor="pastProjects">Past Projects (comma-separated):</label>
                        <textarea
                            id="pastProjects"
                            value={pastProjects}
                            onChange={(e) => setPastProjects(e.target.value)}
                            rows="3"
                            placeholder="e.g., E-commerce App, CRM System Backend"
                        ></textarea>
                    </div>
                    {error && <p className="error-message">{error}</p>}
                    <div className="form-actions">
                        <button type="submit" disabled={loading}>
                            {loading ? 'Adding User...' : 'Add User'}
                        </button>
                        <button type="button" onClick={onClose} disabled={loading} className="cancel-button">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddUserModal;