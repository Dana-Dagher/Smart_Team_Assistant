// src/components/AddTaskModal.js
import React, { useState, useEffect } from 'react';
import './AddTaskModal.css'; // We'll create this CSS file next

function AddTaskModal({ isOpen, onClose, onAddTaskSuccess, users }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [assignedTo, setAssignedTo] = useState(''); // Stores user.id
  const [assignmentExplanation, setAssignmentExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset form fields when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setDeadline('');
      setAssignedTo(''); // Reset to no selection
      setAssignmentExplanation('');
      setError('');
    }
  }, [isOpen]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!title || !deadline) {
      setError('Title and Deadline are required.');
      setLoading(false);
      return;
    }

    const newTaskData = {
      title,
      description,
      deadline,
      status: 'Pending', // New tasks start as Pending
      assigned_to_id: assignedTo ? parseInt(assignedTo) : null, // Convert to int or null
      assignment_explanation: assignmentExplanation,
    };

    try {
      const response = await fetch('http://127.0.0.1:5000/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTaskData),
      });

      const data = await response.json();

      if (response.ok && response.status === 201) { // 201 Created is the success status
        console.log('Task added successfully:', data.task);
        onAddTaskSuccess(data.task); // Pass the new task data back to DashboardPage
        onClose(); // Close the modal
      } else {
        setError(data.error || 'Failed to add task.');
        console.error('Failed to add task:', data);
      }
    } catch (err) {
      setError('Network error. Could not connect to the server.');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null; // Don't render if not open

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Add New Task</h2>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>Description (Optional):</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            ></textarea>
          </div>
          <div className="form-group">
            <label>Deadline:</label>
            <input
              type="text" // Using text for simplicity based on "June 15" format
              placeholder="e.g., July 15"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>Assigned To (Optional):</label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              disabled={loading}
            >
              <option value="">Unassigned</option>
              {users.map(user => (
                // Ensure only team members are in the dropdown for assignment
                user.role === 'teamMember' && (
                    <option key={user.id} value={user.id}>
                        {user.username}
                    </option>
                )
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Assignment Explanation (Optional):</label>
            <textarea
              value={assignmentExplanation}
              onChange={(e) => setAssignmentExplanation(e.target.value)}
              disabled={loading}
              placeholder="e.g., Assigned based on their skills in X."
            ></textarea>
          </div>
          <div className="modal-actions">
            <button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Task'}
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

export default AddTaskModal;