import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../../services/api";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import "../../styles/tasks.css";

function toYMD(val) {
  if (!val) return "";
  const d = typeof val === "string" ? new Date(val) : val;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function CaseTasks() {
  const { id } = useParams(); // Case ID (Mongo _id)
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leadInfo, setLeadInfo] = useState({ leadId: "", name: "" });
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, taskId: null, taskName: "" });

  // Load lead information and tasks for this case
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // First, get case details to fetch lead information
        const caseResponse = await API.get(`/cases/${id}`);
        const caseData = caseResponse.data;
        
        if (mounted) {
          setLeadInfo({
            leadId: caseData.leadId || caseData._id || id,
            name: caseData.clientName || caseData.customerName || caseData.name || "Unknown Lead"
          });
        }

        // Then load tasks for this case
        const tasksResponse = await API.get(`/tasks/case/${id}`);
        if (mounted) setTasks(tasksResponse.data || []);
      } catch (e) {
        console.error("Failed to load case information:", e);
        alert("Failed to load case information or tasks");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  // Create a new task row
  const addTask = async () => {
    try {
      const newTask = {
        case: id,
        taskName: "New Task",
        stage: "",
        caseOwner: "",
        taskStatus: "Pending",
        startDate: new Date(),
        plannedEndDate: "",
        duration: "",
        actualEndDate: "",
        notes: "",
      };
      const { data } = await API.post("/tasks", newTask);
      setTasks((prev) => [...prev, data]);
    } catch {
      alert("Failed to add task");
    }
  };

  // Update a single field of a task
  const handleChange = async (taskId, field, value) => {
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, [field]: value } : t))
    );
    try {
      await API.put(`/tasks/${taskId}`, { [field]: value });
    } catch {
      alert("Failed to update task");
    }
  };

  // Show delete confirmation
  const showDeleteConfirm = (taskId, taskName) => {
    setDeleteConfirm({
      show: true,
      taskId: taskId,
      taskName: taskName || "Untitled Task"
    });
  };

  // Cancel delete
  const cancelDelete = () => {
    setDeleteConfirm({ show: false, taskId: null, taskName: "" });
  };

  // Confirm and delete task
  const confirmDelete = async () => {
    if (!deleteConfirm.taskId) return;
    
    try {
      await API.delete(`/tasks/${deleteConfirm.taskId}`);
      setTasks((prev) => prev.filter((t) => t._id !== deleteConfirm.taskId));
      setDeleteConfirm({ show: false, taskId: null, taskName: "" });
    } catch {
      alert("Failed to delete task");
      setDeleteConfirm({ show: false, taskId: null, taskName: "" });
    }
  };

  return (
    <div className="task-table-container">
      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="modal-overlay">
          <div className="delete-confirm-modal">
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete the task "<strong>{deleteConfirm.taskName}</strong>"?</p>
            <p className="warning-text">This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn secondary" onClick={cancelDelete}>
                Cancel
              </button>
              <button className="btn danger" onClick={confirmDelete}>
                <FiTrash2 /> Delete Task
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="task-header">
        <h2>Task Workflow</h2>
        <div className="header-actions">
          <button
            className="btn secondary"
            onClick={() => navigate(`/cases/${id}/view`)}
          >
            ← Back to Case
          </button>
          <button
            className="btn primary"
            onClick={addTask}
          >
            <FiPlus /> Add Task
          </button>
        </div>
      </header>

      {loading && <p className="no-results">Loading…</p>}
      
      {/* Always show lead info header */}
      {!loading && (
        <div className="tasks-header-info">
          <p><strong>Lead ID:</strong> {leadInfo.leadId}</p>
          <p><strong>Name:</strong> {leadInfo.name}</p>
        </div>
      )}

      {!loading && (
        <div className="task-block">
          <table className="task-table">
            <thead>
              <tr>
                <th className="sr-no-header">Sr No</th>
                <th className="stage-header">Stage</th>
                <th className="task-name-header">Task Name</th>
                <th className="case-owner-header">Case Owner</th>
                <th className="status-header">Status</th>
                <th className="date-header">Start Date</th>
                <th className="date-header">Planned End Date</th>
                <th className="duration-header">Duration</th>
                <th className="date-header">Actual End Date</th>
                <th className="notes-header">Notes</th>
                <th className="action-header">Action</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan="11" className="empty-table-message">
                    No tasks added yet. Click "Add Task" to create your first task.
                  </td>
                </tr>
              ) : (
                tasks.map((task, idx) => (
                  <tr key={task._id} className="task-row">
                    <td className="sr-no">{idx + 1}</td>
                    <td className="stage-cell">
                      <input
                        value={task.stage || ""}
                        onChange={(e) =>
                          handleChange(task._id, "stage", e.target.value)
                        }
                        placeholder="Enter stage"
                      />
                    </td>
                    <td className="task-name-cell">
                      <input
                        value={task.taskName || ""}
                        onChange={(e) =>
                          handleChange(task._id, "taskName", e.target.value)
                        }
                        placeholder="Enter task name"
                      />
                    </td>
                    <td className="case-owner-cell">
                      <input
                        value={task.caseOwner || ""}
                        onChange={(e) =>
                          handleChange(task._id, "caseOwner", e.target.value)
                        }
                        placeholder="Enter case owner"
                      />
                    </td>
                    <td className="status-cell">
                      <select
                        value={task.taskStatus || "Pending"}
                        onChange={(e) =>
                          handleChange(task._id, "taskStatus", e.target.value)
                        }
                        className="status-select"
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>
                    <td className="date-cell">
                      <input
                        type="date"
                        value={toYMD(task.startDate)}
                        onChange={(e) =>
                          handleChange(task._id, "startDate", e.target.value)
                        }
                      />
                    </td>
                    <td className="date-cell">
                      <input
                        type="date"
                        value={toYMD(task.plannedEndDate)}
                        onChange={(e) =>
                          handleChange(task._id, "plannedEndDate", e.target.value)
                        }
                      />
                    </td>
                    <td className="duration-cell">
                      <input
                        value={task.duration || ""}
                        onChange={(e) =>
                          handleChange(task._id, "duration", e.target.value)
                        }
                        placeholder="e.g., 5 days"
                      />
                    </td>
                    <td className="date-cell">
                      <input
                        type="date"
                        value={toYMD(task.actualEndDate)}
                        onChange={(e) =>
                          handleChange(task._id, "actualEndDate", e.target.value)
                        }
                      />
                    </td>
                    <td className="notes-cell">
                      <textarea
                        value={task.notes || ""}
                        onChange={(e) =>
                          handleChange(task._id, "notes", e.target.value)
                        }
                        placeholder="Enter notes"
                        rows="2"
                        className="notes-textarea"
                      />
                    </td>
                    <td className="action-cell">
                      <button
                        className="btn danger small"
                        onClick={() => showDeleteConfirm(task._id, task.taskName)}
                        title="Delete this task"
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}