// src/components/DashboardPage.js
import React, { useState, useEffect, useCallback } from 'react';
import './DashboardPage.css';
import AddTaskModal from './AddTaskModal';
import EditTaskModal from './EditTaskModal';
import AddUserModal from './AddUserModal';

function DashboardPage({ currentUser, onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]); // All team members
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [taskError, setTaskError] = useState('');
  const [userError, setUserError] = useState('');
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [aiAssigningTaskId, setAiAssigningTaskId] = useState(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  // New state for filtering and sorting
  const [filterStatus, setFilterStatus] = useState('All'); // 'All', 'Not Started', 'In Progress', 'Completed', 'Blocked'
  const [filterAssigneeId, setFilterAssigneeId] = useState('All'); // 'All', '-1' for unassigned, or user.id
  const [sortTasksBy, setSortTasksBy] = useState('id'); // 'id', 'title', 'deadline'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'

  const isTeamLead = currentUser && currentUser.role === 'teamLead';
  const statusOptions = ['All', 'Pending', 'Ongoing', 'Done', 'Blocked'];


  // Function to fetch tasks from the backend (now with filters/sort)
  const fetchTasks = useCallback(async () => {
    setLoadingTasks(true);
    setTaskError('');
    try {
      let url = 'http://127.0.0.1:5000/tasks?';

      if (filterStatus !== 'All') {
        url += `status=${encodeURIComponent(filterStatus)}&`;
      }
      if (filterAssigneeId !== 'All') {
        url += `assigned_to_id=${encodeURIComponent(filterAssigneeId)}&`;
      }
      if (sortTasksBy) {
        url += `sort_by=${encodeURIComponent(sortTasksBy)}&`;
      }
      if (sortOrder) {
        url += `order=${encodeURIComponent(sortOrder)}&`;
      }

      // Remove trailing '&' if any
      if (url.endsWith('&')) {
        url = url.slice(0, -1);
      }

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setTasks(data);
      } else {
        setTaskError('Failed to load tasks.');
        console.error('Failed to fetch tasks:', data);
      }
    } catch (err) {
      setTaskError('Network error while fetching tasks.');
      console.error('Fetch error for tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  }, [filterStatus, filterAssigneeId, sortTasksBy, sortOrder]); // <-- Dependencies for re-fetching

  // Function to fetch users from the backend
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    setUserError('');
    try {
      const response = await fetch('http://127.0.0.1:5000/users');
      const data = await response.json();

      if (response.ok) {
        // Filter to include only team members for assignment purposes
        const teamMembers = data.filter(user => user.role === 'teamMember');
        setUsers(teamMembers);
      } else {
        setUserError('Failed to load users.');
        console.error('Failed to fetch users:', data);
      }
    } catch (err) {
      setUserError('Network error while fetching users.');
      console.error('Fetch error for users:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // Effect to fetch tasks and users when the component mounts or filters/sort change
  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, [fetchTasks, fetchUsers]); // fetchTasks is now dependent on filters/sort, so it re-runs when they change

  // Handler for successful task addition
  const handleAddTaskSuccess = (newTask) => {
    setTasks(prevTasks => [...prevTasks, newTask]);
    setIsAddTaskModalOpen(false);
  };

  // Handler for opening the Edit Task modal
  const handleEditClick = (task) => {
    setTaskToEdit(task);
    setIsEditTaskModalOpen(true);
  };

  // Handler for successful task update
  const handleEditTaskSuccess = (updatedTask) => {
    setTasks(prevTasks =>
      prevTasks.map(task => (task.id === updatedTask.id ? updatedTask : task))
    );
    setIsEditTaskModalOpen(false);
    setTaskToEdit(null);
  };

  // Handler for deleting a task
  const handleDeleteClick = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      try {
        const response = await fetch(`http://127.0.0.1:5000/tasks/${taskId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          console.log('Task deleted successfully');
          setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
        } else {
          const errorData = await response.json();
          setTaskError(errorData.error || 'Failed to delete task.');
          console.error('Failed to delete task:', errorData);
        }
      } catch (err) {
        setTaskError('Network error. Could not connect to the server.');
        console.error('Fetch error:', err);
      }
    }
  };

  // Handler for AI assignment
  const handleAssignWithAIClick = async (task) => {
    if (aiAssigningTaskId === task.id) return;
    setAiAssigningTaskId(task.id);
    setTaskError('');

    try {
      const response = await fetch('http://127.0.0.1:5000/assign_task_ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_id: task.id,
          task_title: task.title,
          task_description: task.description
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('AI Assignment successful:', data);
        setTasks(prevTasks =>
          prevTasks.map(t =>
            t.id === data.task_id ? {
                ...t,
                assigned_to: data.assigned_to,
                assigned_to_id: data.assigned_to_id,
                assignment_explanation: data.assignment_explanation
            } : t
          )
        );
      } else {
        setTaskError(data.error || 'Failed to get AI assignment.');
        console.error('AI Assignment failed:', data);
      }
    } catch (err) {
      setTaskError('Network error. Could not connect to AI assignment server.');
      console.error('AI Assignment fetch error:', err);
    } finally {
      setAiAssigningTaskId(null);
    }
  };

  // Handler for updating task status
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          current_user_id: currentUser.id,
          current_user_role: currentUser.role
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`Task ${taskId} status updated to ${newStatus}`);
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === taskId ? { ...task, status: newStatus } : task
          )
        );
      } else {
        setTaskError(data.error || 'Failed to update task status.');
        console.error('Status update failed:', data);
      }
    } catch (err) {
      setTaskError('Network error: Could not connect to the server to update status.');
      console.error('Status update fetch error:', err);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Smart Team Assistant</h1>
        <div className="user-info">
          <span>Welcome, {currentUser.username} ({currentUser.role})</span>
          <button onClick={onLogout} className="logout-button">Logout</button>
        </div>
      </header>

      <div className="dashboard-controls">
        {isTeamLead && (
          <>
            <button className="add-task-button" onClick={() => setIsAddTaskModalOpen(true)}>
                Add New Task
            </button>
            <button className="add-user-button" onClick={() => setIsAddUserModalOpen(true)}>
                Add New Team Member
            </button>
          </>
        )}

        {/* NEW: Filter Controls */}
        <div className="filter-controls">
          <label htmlFor="status-filter">Filter by Status:</label>
          <select
            id="status-filter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            {statusOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>

          <label htmlFor="assignee-filter">Filter by Assignee:</label>
          <select
            id="assignee-filter"
            value={filterAssigneeId}
            onChange={(e) => setFilterAssigneeId(e.target.value)}
          >
            <option value="All">All</option>
            <option value="-1">Unassigned</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>{user.username}</option>
            ))}
          </select>
        </div>

        {/* NEW: Sort Controls */}
        <div className="sort-controls">
          <span>Sort by:</span>
          <button
            className={`sort-button ${sortTasksBy === 'title' ? 'active' : ''}`}
            onClick={() => {
              setSortTasksBy('title');
              setSortOrder(prevOrder => (prevOrder === 'asc' && sortTasksBy === 'title' ? 'desc' : 'asc'));
            }}
          >
            Title {sortTasksBy === 'title' && (sortOrder === 'asc' ? '▲' : '▼')}
          </button>
          <button
            className={`sort-button ${sortTasksBy === 'deadline' ? 'active' : ''}`}
            onClick={() => {
              setSortTasksBy('deadline');
              setSortOrder(prevOrder => (prevOrder === 'asc' && sortTasksBy === 'deadline' ? 'desc' : 'asc'));
            }}
          >
            Deadline {sortTasksBy === 'deadline' && (sortOrder === 'asc' ? '▲' : '▼')}
          </button>
        </div>
      </div> {/* End dashboard-controls */}

      <div className="dashboard-content">
        <h2>Team Tasks</h2>
        {(loadingTasks || loadingUsers) && <p>Loading data...</p>}
        {(taskError || userError) && <p className="error-message">{taskError || userError}</p>}
        {!loadingTasks && !taskError && tasks.length === 0 && (
          <p>No tasks found. {isTeamLead && "Click 'Add New Task' to get started."}</p>
        )}
        {!loadingTasks && !taskError && tasks.length > 0 && (
          <table className="tasks-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Description</th>
                <th>Assigned To</th>
                <th>Status</th>
                <th>Deadline</th>
                <th>Explanation</th>
                <th>Actions</th>
              </tr>
            </thead>
            {/* <tbody>
              {tasks.map(task => {
                const canEditStatus = isTeamLead || (
                  currentUser.role === 'teamMember' && task.assigned_to_id === currentUser.id
                );
                // statusOptions defined outside map for efficiency

                return (
                  <tr key={task.id}>
                    <td>{task.title}</td>
                    <td>{task.description}</td>
                    <td>{task.assigned_to}</td>
                    <td>
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                        disabled={!canEditStatus}
                        className="status-dropdown"
                      >
                        {statusOptions.slice(1).map(option => ( // .slice(1) to exclude 'All' from task status options
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </td>
                    <td>{task.deadline}</td>
                    <td>{task.assignment_explanation}</td>
                    <td>
                      {isTeamLead && (
                        <>
                          <button
                              className="action-button edit-button"
                              onClick={() => handleEditClick(task)}
                          >
                              Edit
                          </button>
                          <button
                              className="action-button delete-button"
                              onClick={() => handleDeleteClick(task.id)}
                            >
                              Delete
                          </button>
                          <button
                              className="action-button ai-assign-button"
                              onClick={() => handleAssignWithAIClick(task)}
                              disabled={aiAssigningTaskId === task.id}
                          >
                              {aiAssigningTaskId === task.id ? 'Assigning...' : 'Assign with AI'}
                          </button>
                        </>
                      )}
                      {!isTeamLead && (
                          <button className="action-button">View</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody> }*/
            // src/components/DashboardPage.js

// ... (inside the tasks.map(task => { ... })) ...

<tbody>
  {tasks.map(task => {
    const canEditStatus = isTeamLead || (
      currentUser.role === 'teamMember' && task.assigned_to_id === currentUser.id
    );
    // statusOptions defined outside map for efficiency

    return (
      <tr key={task.id}>
        {/* ADDED data-label ATTRIBUTES TO EACH TD */}
        <td data-label="Task">{task.title}</td>
        <td data-label="Description">{task.description}</td>
        <td data-label="Assigned To">{task.assigned_to}</td>
        <td data-label="Status">
          <select
            value={task.status}
            onChange={(e) => handleStatusChange(task.id, e.target.value)}
            disabled={!canEditStatus}
            className="status-dropdown"
          >
            {statusOptions.slice(1).map(option => ( // .slice(1) to exclude 'All' from task status options
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </td>
        <td data-label="Deadline">{task.deadline}</td>
        <td data-label="Explanation">{task.assignment_explanation}</td>
        <td data-label="Actions">
          {isTeamLead && (
            <>
              <button
                  className="action-button edit-button"
                  onClick={() => handleEditClick(task)}
              >
                  Edit
              </button>
              <button
                  className="action-button delete-button"
                  onClick={() => handleDeleteClick(task.id)}
              >
                  Delete
              </button>
              <button
                  className="action-button ai-assign-button"
                  onClick={() => handleAssignWithAIClick(task)}
                  disabled={aiAssigningTaskId === task.id}
              >
                  {aiAssigningTaskId === task.id ? 'Assigning...' : 'Assign with AI'}
              </button>
            </>
          )}
          {!isTeamLead && (
              <button className="action-button">View</button>
          )}
        </td>
      </tr>
    );
  })}
</tbody>
}</table>
        )}
      </div>

      {/* Modals remain the same */}
      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        onAddTaskSuccess={handleAddTaskSuccess}
        users={users}
      />
      {taskToEdit && (
        <EditTaskModal
          isOpen={isEditTaskModalOpen}
          onClose={() => setIsEditTaskModalOpen(false)}
          onEditTaskSuccess={handleEditTaskSuccess}
          taskToEdit={taskToEdit}
          users={users}
        />
      )}
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onAddUserSuccess={(newUser) => {
          setIsAddUserModalOpen(false);
          // When a new user is added, refresh the users list
          fetchUsers(); // Crucial so new user appears in assignee filter
        }}
      />
    </div>
  );
}

export default DashboardPage;



