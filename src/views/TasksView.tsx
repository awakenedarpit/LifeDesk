import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Task, TaskCategory, TaskPriority, TaskStatus, ParticipationType } from '../types';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

type FilterTab = 'all' | 'today' | 'upcoming' | 'completed' | 'overdue';

export const TasksView: React.FC = () => {
  const { tasks, updateTask, deleteTask, toggleTaskStatus, openModal } = useApp();

  const [activeTab, setActiveTab] = useState<FilterTab>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'deadline' | 'priority' | 'name'>('deadline');

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  const categories: TaskCategory[] = [
    'College', 'Practical', 'Assignment', 'Exam', 'Project', 'Hackathon',
    'Presentation', 'Personal', 'Other',
  ];

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const tDeadlineDate = t.deadline ? t.deadline.split('T')[0] : '';
      const isPast = new Date(t.deadline).getTime() < now.getTime();
      if (activeTab === 'today') {
        if (tDeadlineDate !== todayStr) return false;
      } else if (activeTab === 'upcoming') {
        if (t.status === 'Completed' || isPast) return false;
      } else if (activeTab === 'completed') {
        if (t.status !== 'Completed') return false;
      } else if (activeTab === 'overdue') {
        if (t.status === 'Completed' || !isPast) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesDesc = t.description?.toLowerCase().includes(q);
        const matchesTags = t.tags?.some((tag) => tag.toLowerCase().includes(q));
        if (!matchesName && !matchesDesc && !matchesTags) return false;
      }
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
      if (selectedPriority !== 'all' && t.priority !== selectedPriority) return false;
      return true;
    }).sort((a, b) => {
      if (sortBy === 'deadline') return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      if (sortBy === 'priority') {
        const pMap = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
        return pMap[a.priority] - pMap[b.priority];
      }
      return a.name.localeCompare(b.name);
    });
  }, [tasks, activeTab, searchQuery, selectedCategory, selectedPriority, sortBy, todayStr, now]);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    const normalizedTask: Task = {
      ...editingTask,
      participationType: editingTask.participationType || 'Individual',
      teamName: editingTask.participationType === 'Team' ? (editingTask.teamName || '').trim() : '',
    };
    updateTask(normalizedTask.id, normalizedTask);
    setEditingTask(null);
  };

  const formatTaskTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col w-full gap-3 sm:gap-4 lg:gap-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-headline-lg-mobile sm:font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-on-surface font-bold tracking-tight">Task Management</h1>
          <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant">Keep track of practicals, submissions, and academic milestones.</p>
        </div>
        <button onClick={() => openModal('task')} className="h-10 px-4 bg-primary text-on-primary rounded-xl font-label-md text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm hover:bg-primary-container active:scale-95 transition-all self-stretch sm:self-auto justify-center">
          <span className="material-symbols-outlined text-[18px]">add_task</span><span>New Task</span>
        </button>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-surface-container scrollbar-none">
        {([
          { id: 'all', label: `All (${tasks.length})` },
          { id: 'today', label: 'Today' },
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'completed', label: `Completed (${tasks.filter((t) => t.status === 'Completed').length})` },
          { id: 'overdue', label: 'Overdue' },
        ] as { id: FilterTab; label: string }[]).map((tab) => {
          const isActive = activeTab === tab.id;
          return <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors select-none ${isActive ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}>{tab.label}</button>;
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5 bg-surface-container-lowest p-3 rounded-2xl border border-surface-container">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">search</span>
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search tasks, tags, notes..." className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface-container-low text-sm outline-none text-on-surface focus:bg-surface-container transition-colors" />
        </div>
        <div className="grid grid-cols-3 sm:flex gap-2">
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="h-10 px-2.5 rounded-xl bg-surface-container-low text-xs font-semibold text-on-surface outline-none border border-surface-container">
            <option value="all">Categories</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value)} className="h-10 px-2.5 rounded-xl bg-surface-container-low text-xs font-semibold text-on-surface outline-none border border-surface-container">
            <option value="all">Priorities</option><option value="Urgent">Urgent</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="h-10 px-2.5 rounded-xl bg-surface-container-low text-xs font-semibold text-on-surface outline-none border border-surface-container">
            <option value="deadline">Deadline</option><option value="priority">Priority</option><option value="name">Name</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {filteredTasks.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl p-8 text-center border border-surface-container">
            <span className="material-symbols-outlined text-4xl text-primary mb-2">task</span>
            <p className="font-title-sm text-on-surface font-bold">No tasks match your criteria</p>
            <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant mt-1">Create a new task or adjust your search filters above.</p>
            <button onClick={() => openModal('task')} className="mt-4 px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold shadow-xs">+ Create Task</button>
          </div>
        ) : filteredTasks.map((task) => {
          const isCompleted = task.status === 'Completed';
          return <div key={task.id} className={`bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 shadow-sm border border-surface-container flex items-start gap-3 transition-all ${isCompleted ? 'opacity-65' : ''}`}>
            <button aria-label="Toggle task status" className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${isCompleted ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-transparent hover:text-primary'}`} onClick={() => toggleTaskStatus(task.id)} type="button"><span className="material-symbols-outlined text-[18px]">check</span></button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`font-label-xs text-[10px] px-2 py-0.5 rounded-full font-bold ${task.priority === 'Urgent' ? 'bg-error-container text-on-error-container' : task.priority === 'High' ? 'bg-primary-fixed text-on-primary-fixed-variant' : 'bg-secondary-fixed text-on-secondary-fixed-variant'}`}>{task.priority}</span>
                <span className="font-label-xs text-[10px] bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-full font-medium">{task.category}</span>
                <span className={`font-label-xs text-[10px] px-2 py-0.5 rounded-full font-bold ${task.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : task.status === 'In Progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' : 'bg-surface-container text-on-surface-variant'}`}>{task.status}</span>
                {task.participationType === 'Team' && <span className="font-label-xs text-[10px] px-2 py-0.5 rounded-full font-bold bg-primary/10 text-primary">Team{task.teamName ? ` • ${task.teamName}` : ''}</span>}
                <span className="font-label-xs text-xs text-on-surface-variant font-medium ml-auto flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">schedule</span>{formatTaskTime(task.deadline)}</span>
              </div>
              <h3 className={`font-body-md text-sm sm:text-base text-on-surface font-semibold mt-1 ${isCompleted ? 'line-through text-on-surface-variant' : ''}`}>{task.name}</h3>
              {task.description && <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant mt-0.5">{task.description}</p>}
              {task.notes && <div className="mt-2 text-xs text-on-surface-variant bg-surface-container-low p-2 rounded-xl flex items-center gap-1.5 border border-surface-container/60"><span className="material-symbols-outlined text-[15px] text-primary flex-shrink-0">note</span><span className="truncate">{task.notes}</span></div>}
              {task.tags && task.tags.length > 0 && <div className="flex gap-1.5 mt-2 flex-wrap">{task.tags.map((tag) => <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md bg-surface-container-low text-on-surface-variant font-medium border border-surface-container/40">#{tag}</span>)}</div>}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button aria-label="Edit task" className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-xl transition-colors" onClick={() => setEditingTask(task)} type="button"><span className="material-symbols-outlined text-[18px]">edit</span></button>
              <button aria-label="Delete task" className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded-xl transition-colors" onClick={() => setTaskToDelete(task.id)} type="button"><span className="material-symbols-outlined text-[18px]">delete</span></button>
            </div>
          </div>;
        })}
      </div>

      {editingTask && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-surface-container-lowest border border-surface-container-high w-full max-w-md rounded-2xl p-5 shadow-2xl flex flex-col gap-3.5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <h3 className="font-headline-md text-base sm:text-lg text-on-surface font-bold">Edit Task</h3>
              <button className="w-8 h-8 rounded-full text-on-surface-variant hover:text-on-surface flex items-center justify-center" onClick={() => setEditingTask(null)} type="button"><span className="material-symbols-outlined text-[20px]">close</span></button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col gap-3">
              <div>
                <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">Task Name *</label>
                <input required type="text" value={editingTask.name} onChange={(e) => setEditingTask({ ...editingTask, name: e.target.value })} className="w-full h-11 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none" />
              </div>

              <div>
                <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">Description</label>
                <input type="text" value={editingTask.description} onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })} className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none" />
              </div>

              <div>
                <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">Participation</label>
                <select
                  value={editingTask.participationType || 'Individual'}
                  onChange={(e) => {
                    const participationType = e.target.value as ParticipationType;
                    setEditingTask({
                      ...editingTask,
                      participationType,
                      teamName: participationType === 'Team' ? (editingTask.teamName || '') : '',
                    });
                  }}
                  className="w-full h-10 px-2.5 bg-surface-container-low rounded-xl text-on-surface text-xs font-semibold outline-none border border-surface-container"
                >
                  <option value="Individual">Individual</option>
                  <option value="Team">Team</option>
                </select>
              </div>

              {editingTask.participationType === 'Team' && (
                <div>
                  <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">Team Name</label>
                  <input
                    type="text"
                    value={editingTask.teamName || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, teamName: e.target.value })}
                    placeholder="e.g. Neural Nexus"
                    className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none border border-surface-container"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">Category</label>
                  <select value={editingTask.category} onChange={(e) => setEditingTask({ ...editingTask, category: e.target.value as TaskCategory })} className="w-full h-10 px-2.5 bg-surface-container-low rounded-xl text-on-surface text-xs font-semibold outline-none">
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">Priority</label>
                  <select value={editingTask.priority} onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as TaskPriority })} className="w-full h-10 px-2.5 bg-surface-container-low rounded-xl text-on-surface text-xs font-semibold outline-none">
                    <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">Status</label>
                  <select value={editingTask.status} onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value as TaskStatus })} className="w-full h-10 px-2.5 bg-surface-container-low rounded-xl text-on-surface text-xs font-semibold outline-none">
                    <option value="Not Started">Not Started</option><option value="In Progress">In Progress</option><option value="Completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">Deadline</label>
                  <input type="datetime-local" value={editingTask.deadline ? editingTask.deadline.slice(0, 16) : ''} onChange={(e) => setEditingTask({ ...editingTask, deadline: new Date(e.target.value).toISOString() })} className="w-full h-10 px-2 bg-surface-container-low rounded-xl text-on-surface text-xs outline-none" />
                </div>
              </div>

              <div>
                <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">Notes</label>
                <input type="text" value={editingTask.notes || ''} onChange={(e) => setEditingTask({ ...editingTask, notes: e.target.value })} className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none" />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditingTask(null)} className="flex-1 h-10 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold">Cancel</button>
                <button type="submit" className="flex-1 h-10 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={taskToDelete !== null}
        title="Delete Task?"
        message="Are you sure you want to permanently delete this task? This action cannot be reversed."
        onCancel={() => setTaskToDelete(null)}
        onConfirm={() => {
          if (taskToDelete) {
            deleteTask(taskToDelete);
            setTaskToDelete(null);
          }
        }}
      />
    </div>
  );
};
