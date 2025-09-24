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

  // Load tasks for this case
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await API.get(`/tasks/case/${id}`); // ✅ no double /api
        if (mounted) setTasks(data || []);
      } catch (e) {
        alert("Failed to load tasks");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  // Create a new task block/table
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
      const { data } = await API.post("/tasks", newTask); // ✅ fixed
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
      await API.put(`/tasks/${taskId}`, { [field]: value }); // ✅ fixed
    } catch {
      alert("Failed to update task");
    }
  };

  // Delete a task block
  const deleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await API.delete(`/tasks/${taskId}`); // ✅ fixed
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    } catch {
      alert("Failed to delete task");
    }
  };

  return (
    <div className="task-table-container">
      <header className="task-header">
        <h2>Task Workflow</h2>
        <div>
          <button
            className="btn secondary"
            onClick={() => navigate(`/cases/${id}/view`)}
          >
            ← Back to Case
          </button>
          <button
            className="btn primary"
            onClick={addTask}
            style={{ marginLeft: "10px" }}
          >
            <FiPlus /> Add Task
          </button>
        </div>
      </header>

      {loading && <p className="no-results">Loading…</p>}
      {!loading && tasks.length === 0 && (
        <p className="no-results">No tasks added yet. Click "Add Task".</p>
      )}

      {!loading &&
        tasks.map((task, idx) => (
          <div key={task._id} className="task-block">
            <div className="task-block-header">
              <h3>
                Task #{idx + 1} – {task.taskName || "Untitled"}
              </h3>
              <button
                className="btn danger small"
                onClick={() => deleteTask(task._id)}
                title="Delete this task"
              >
                <FiTrash2 /> Delete
              </button>
            </div>

            <table className="task-table">
              <thead>
                <tr>
                  <th>Sr No</th>
                  <th>Stage</th>
                  <th>Task Name</th>
                  <th>Case Owner</th>
                  <th>Status</th>
                  <th>Start Date</th>
                  <th>Planned End Date</th>
                  <th>Duration</th>
                  <th>Actual End Date</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{idx + 1}</td>
                  <td>
                    <input
                      value={task.stage || ""}
                      onChange={(e) =>
                        handleChange(task._id, "stage", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={task.taskName || ""}
                      onChange={(e) =>
                        handleChange(task._id, "taskName", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={task.caseOwner || ""}
                      onChange={(e) =>
                        handleChange(task._id, "caseOwner", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <select
                      value={task.taskStatus || "Pending"}
                      onChange={(e) =>
                        handleChange(task._id, "taskStatus", e.target.value)
                      }
                    >
                      <option>Pending</option>
                      <option>In Progress</option>
                      <option>Completed</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="date"
                      value={toYMD(task.startDate)}
                      onChange={(e) =>
                        handleChange(task._id, "startDate", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={toYMD(task.plannedEndDate)}
                      onChange={(e) =>
                        handleChange(task._id, "plannedEndDate", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={task.duration || ""}
                      onChange={(e) =>
                        handleChange(task._id, "duration", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={toYMD(task.actualEndDate)}
                      onChange={(e) =>
                        handleChange(task._id, "actualEndDate", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <textarea
                      value={task.notes || ""}
                      onChange={(e) =>
                        handleChange(task._id, "notes", e.target.value)
                      }
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}
