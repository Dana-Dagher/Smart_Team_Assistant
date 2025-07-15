// src/components/EditTaskModal.js
import React, { useState, useEffect } from 'react';
import './EditTaskModal.css'; // We'll create this CSS file next

function EditTaskModal({ isOpen, onClose, onEditTaskSuccess, taskToEdit, users }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [deadline, setDeadline] = useState('');
  const [assignedTo, setAssignedTo] = useState(''); // Stores user.id
  const [assignmentExplanation, setAssignmentExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Populate form fields when taskToEdit changes (i.e., when modal opens with a task)
  useEffect(() => {
    if (isOpen && taskToEdit) {
      setTitle(taskToEdit.title || '');
      setDescription(taskToEdit.description || '');
      setStatus(taskToEdit.status || 'Pending'); // Default status if not set
      setDeadline(taskToEdit.deadline || '');
      // Handle assigned_to_id correctly for dropdown
      setAssignedTo(taskToEdit.assigned_to_id ? String(taskToEdit.assigned_to_id) : '');
      setAssignmentExplanation(taskToEdit.assignment_explanation || '');
      setError(''); // Clear any previous errors
    }
  }, [isOpen, taskToEdit]);

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

    const updatedTaskData = {
      title,
      description,
      status,
      deadline,
      assigned_to_id: assignedTo ? parseInt(assignedTo) : null, // Convert to int or null
      assignment_explanation: assignmentExplanation,
    };

    try {
      const response = await fetch(`http://127.0.0.1:5000/tasks/${taskToEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTaskData),
      });

      const data = await response.json();

      if (response.ok) { // 200 OK is the success status for PUT
        console.log('Task updated successfully:', data.task);
        onEditTaskSuccess(data.task); // Pass the updated task data back to DashboardPage
        onClose(); // Close the modal
      } else {
        setError(data.error || 'Failed to update task.');
        console.error('Failed to update task:', data);
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
        <h2>Edit Task</h2>
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
            <label>Status:</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              required
              disabled={loading}
            >
              <option value="Pending">Pending</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Done">Done</option>
              <option value="Blocked">Blocked</option>
            </select>
          </div>
          <div className="form-group">
            <label>Deadline:</label>
            <input
              type="text"
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
              placeholder="e.g., AI assigned based on expertise."
            ></textarea>
          </div>
          <div className="modal-actions">
            <button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
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

export default EditTaskModal;