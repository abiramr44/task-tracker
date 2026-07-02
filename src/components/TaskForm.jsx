import { useState } from 'react';

function TaskForm({ onAddTask }) {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [subtaskInput, setSubtaskInput] = useState('');
  const [subtasks, setSubtasks] = useState([]);

  function handleOpen() {
    setShowModal(true);
  }

  function handleClose() {
    setShowModal(false);
    setTitle('');
    setSubtaskInput('');
    setSubtasks([]);
  }

  function addSubtask() {
    if (!subtaskInput.trim()) return;
    setSubtasks([...subtasks, subtaskInput.trim()]);
    setSubtaskInput('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onAddTask({ title: title.trim(), subtasks });
    handleClose();
  }

  return (
    <>
      <button type="button" className="form-button" onClick={handleOpen}>
        Add Task
      </button>

      {showModal && (
        <div className="modal-overlay" onClick={handleClose}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>New Task</h3>
            <form onSubmit={handleSubmit} className="modal-form">
              <label>
                Task Name
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter task name"
                />
              </label>

              <label className="breakdown-label">
                Task Breakdown
                <div className="breakdown-input-row">
                  <input
                    type="text"
                    value={subtaskInput}
                    onChange={(e) => setSubtaskInput(e.target.value)}
                    placeholder="New sub-task"
                  />
                  <button type="button" className="add-subtask-button" onClick={addSubtask}>
                    +
                  </button>
                </div>
              </label>

              {subtasks.length > 0 && (
                <ul className="breakdown-list">
                  {subtasks.map((subtask, index) => (
                    <li key={index}>{subtask}</li>
                  ))}
                </ul>
              )}

              <div className="modal-actions">
                <button type="button" className="modal-cancel" onClick={handleClose}>
                  Cancel
                </button>
                <button type="submit" className="modal-save">
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default TaskForm;