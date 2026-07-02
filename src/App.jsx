import { useEffect, useState } from 'react';
import TaskForm from './components/TaskForm';
import LoginPage from './components/LoginPage';
import ProfilePage from './components/ProfilePage';
import './App.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || 'Server error');
  }

  return data;
}

function App() {
  const CURRENT_USER_KEY = 'taskTrackerCurrentUser';
  const [user, setUser] = useState(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    if (!stored) return null;

    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to parse stored user', error);
      return null;
    }
  });
  const [page, setPage] = useState('dashboard');
  const [tasks, setTasks] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  function validatePassword(password) {
    const passwordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    return passwordRule.test(password);
  }

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTasks([]);
      localStorage.removeItem(CURRENT_USER_KEY);
      return;
    }

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));

    const fetchTasks = async () => {
      try {
        const fetchedTasks = await apiRequest(`/api/tasks?email=${encodeURIComponent(user.email)}`);
        setTasks(fetchedTasks);
      } catch (error) {
        console.error('Failed to load tasks', error);
        setTasks([]);
      }
    };

    const fetchLeaderboard = async () => {
      try {
        const leaderboardData = await apiRequest('/api/leaderboard');
        setLeaderboard(leaderboardData);
      } catch (error) {
        console.error('Failed to load leaderboard', error);
        setLeaderboard([]);
      }
    };

    fetchTasks();
    fetchLeaderboard();
  }, [user]);

  async function handleLogin({ email, password }) {
    try {
      const response = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setUser({ name: response.name, email: response.email });
      return undefined;
    } catch (error) {
      return error.message;
    }
  }

  async function handleSignup({ name, email, password }) {
    if (!validatePassword(password)) {
      return 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.';
    }

    try {
      const response = await apiRequest('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });

      setUser({ name: response.name, email: response.email });
      return undefined;
    } catch (error) {
      return error.message;
    }
  }

  async function handleChangePassword() {
    const newPassword = prompt('Enter your new password');
    if (!newPassword || !newPassword.trim()) return;
    if (!validatePassword(newPassword.trim())) {
      alert('Password must be at least 8 characters and include uppercase, lowercase, number, and special character.');
      return;
    }

    try {
      await apiRequest('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ email: user.email, newPassword: newPassword.trim() }),
      });
      alert('Password updated successfully.');
    } catch (error) {
      console.error('Failed to change password', error);
      alert(error.message || 'Unable to change password.');
    }
  }

  async function saveTaskToServer(updatedTask) {
    try {
      const savedTask = await apiRequest(`/api/tasks/${updatedTask.id}`, {
        method: 'PUT',
        body: JSON.stringify({ email: user.email, task: updatedTask }),
      });

      setTasks((currentTasks) =>
        currentTasks.map((item) => (item.id === savedTask.id ? savedTask : item))
      );
      const leaderboardData = await apiRequest('/api/leaderboard');
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Failed to update task', error);
    }
  }

  async function addTask(newTask) {
    const payload = {
      title: newTask.title,
      completed: false,
      completedAt: null,
      subtasks: newTask.subtasks.map((text, index) => ({
        id: Date.now() + index + 1,
        text,
        done: false,
      })),
    };

    try {
      const savedTask = await apiRequest('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ email: user.email, task: payload }),
      });
      setTasks((currentTasks) => [...currentTasks, savedTask]);
    } catch (error) {
      console.error('Failed to add task', error);
      alert(error.message || 'Unable to add task.');
    }
  }

  function completeTask(id) {
    const updatedTasks = tasks.map((task) => {
      if (task.id !== id) return task;

      const updatedTask = {
        ...task,
        completed: true,
        completedAt: Date.now(),
      };

      saveTaskToServer(updatedTask);
      return updatedTask;
    });

    setTasks(updatedTasks);
  }

  function toggleSubtask(taskId, subtaskId) {
    const updatedTasks = tasks.map((task) => {
      if (task.id !== taskId) return task;

      const updatedSubtasks = task.subtasks.map((subtask) => {
        if (subtask.id !== subtaskId) return subtask;
        return { ...subtask, done: !subtask.done };
      });

      const allDone = updatedSubtasks.length > 0 && updatedSubtasks.every((subtask) => subtask.done);
      const updatedTask = {
        ...task,
        subtasks: updatedSubtasks,
        completed: allDone,
        completedAt: allDone ? Date.now() : task.completed ? null : task.completedAt,
      };

      saveTaskToServer(updatedTask);
      return updatedTask;
    });

    setTasks(updatedTasks);
  }

  const activeTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);

  const completedHistory = (() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      const dateKey = date.toISOString().slice(0, 10);
      const count = completedTasks.filter(task => {
        if (!task.completedAt) return false;
        return new Date(task.completedAt).toISOString().slice(0, 10) === dateKey;
      }).length;

      return {
        label: date.toLocaleDateString(undefined, { weekday: 'short' }),
        count,
      };
    });
  })();

  const maxCompleted = Math.max(...completedHistory.map(day => day.count), 1);

  if (!user) {
    return <LoginPage onLogin={handleLogin} onSignup={handleSignup} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Task Tracker</h1>
        <button className="profile-button" onClick={() => setPage('profile')}>
          Profile
        </button>
      </header>

      <div className="top-center-form">
        <TaskForm onAddTask={addTask} />
      </div>

      {page === 'profile' ? (
        <ProfilePage
          user={user}
          onLogout={() => {
            setUser(null);
            setTasks([]);
            setPage('dashboard');
          }}
          onChangePassword={handleChangePassword}
        />
      ) : (
        <div className="dashboard">
        <div className="dashboard-grid">
          <section className="dashboard-card task-card">
            <h2>Tasks</h2>
            {activeTasks.length === 0 ? (
              <p className="empty-state">No active tasks. Add one above.</p>
            ) : (
              <ul className="task-list">
                {activeTasks.map(task => (
                  <li key={task.id} className="task-item">
                    <label>
                      <input
                        type="checkbox"
                        onChange={() => completeTask(task.id)}
                      />
                      <span>{task.title}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="dashboard-card completed-card">
            <h2>Completed</h2>
            {completedTasks.length === 0 ? (
              <p className="empty-state">No completed tasks yet.</p>
            ) : (
              <ul className="completed-list">
                {completedTasks.map(task => (
                  <li key={task.id} className="completed-item">
                    <span className="completed-check">✔</span>
                    <span>{task.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="dashboard-card leaderboard-card">
            <h2>Leaderboard</h2>
            {leaderboard.length === 0 ? (
              <p className="empty-state">No leaderboard data yet.</p>
            ) : (
              <div className="leaderboard-list">
                {leaderboard.slice(0, 5).map((entry) => (
                  <div
                    key={entry.email}
                    className={`leaderboard-row ${entry.email === user.email ? 'leaderboard-current' : ''}`}
                  >
                    <span className="leaderboard-rank">#{entry.rank}</span>
                    <span className="leaderboard-name">{entry.name}</span>
                    <span className="leaderboard-score">{entry.completed} completed</span>
                  </div>
                ))}
              </div>
            )}
            {leaderboard.some((entry) => entry.email === user.email) && (
              <div className="leaderboard-footer">
                Your rank: {leaderboard.find((entry) => entry.email === user.email)?.rank} / {leaderboard.length}
              </div>
            )}
          </section>

          <section className="dashboard-card consistency-card">
            <h2>Consistency</h2>
            <div className="consistency-graph">
              {completedHistory.map(day => (
                <div key={day.label} className="graph-bar">
                  <div
                    className="graph-bar-inner"
                    style={{ height: `${(day.count / maxCompleted) * 100}%` }}
                  />
                  <span className="graph-value">{day.count}</span>
                  <span className="graph-label">{day.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="dashboard-card details-card">
            <h2>Task Details</h2>
            {activeTasks.length === 0 ? (
              <p className="empty-state">No active task details available.</p>
            ) : (
              activeTasks.map(task => (
                <div key={task.id} className="details-task-block">
                  <h3>{task.title}</h3>
                  {task.subtasks.length === 0 ? (
                    <p className="empty-state">No subtasks defined.</p>
                  ) : (
                    <ul className="subtask-list">
                      {task.subtasks.map(subtask => (
                        <li key={subtask.id} className="subtask-item">
                          <label>
                            <input
                              type="checkbox"
                              checked={subtask.done}
                              onChange={() => toggleSubtask(task.id, subtask.id)}
                            />
                            <span className={subtask.done ? 'subtask-completed' : ''}>
                              {subtask.text}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))
            )}
          </section>
        </div>
      </div>
      )}
    </div>
  );
}

export default App;