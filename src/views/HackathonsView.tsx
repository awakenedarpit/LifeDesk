import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Hackathon, MilestoneStage, MilestoneStatus } from '../types';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

export const HackathonsView: React.FC = () => {
  const { hackathons, addHackathon, updateHackathon, deleteHackathon } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHackathon, setEditingHackathon] = useState<Hackathon | null>(null);
  const [hackToDelete, setHackToDelete] = useState<string | null>(null);

  // New hackathon form state
  const [name, setName] = useState('');
  const [trackName, setTrackName] = useState('');
  const [deliverable, setDeliverable] = useState('');
  const [currentStage, setCurrentStage] = useState('Prototype in 5d');
  const [bannerImage, setBannerImage] = useState(
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=80'
  );
  const [notes, setNotes] = useState('');

  const defaultStages: MilestoneStage[] = [
    'Registration',
    'Idea Submission',
    'PPT Submission',
    'Screening Quiz',
    'Prototype',
    'Final Submission',
    'Final Pitch',
  ];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !trackName) return;

    addHackathon({
      name,
      trackName,
      organizer: 'National Tech Consortium',
      registrationDeadline: new Date(Date.now() + 86400000 * 14).toISOString(),
      status: 'In Progress',
      deliverable: deliverable || 'Prototype submission',
      currentStage: currentStage || 'Sprint active',
      bannerImage,
      notes,
      milestones: defaultStages.map((stage, idx) => ({
        id: `ms-${Date.now()}-${idx}`,
        hackathonId: `hack-${Date.now()}`,
        stage,
        title: stage,
        date: new Date(Date.now() + 86400000 * (idx * 3 + 2)).toISOString().split('T')[0],
        status: idx === 0 ? 'Completed' : idx === 1 ? 'Current' : 'Pending',
      })),
    });

    setName('');
    setTrackName('');
    setDeliverable('');
    setShowAddModal(false);
  };

  const handleCycleMilestoneStatus = (hackId: string, milestoneId: string) => {
    const hack = hackathons.find((h) => h.id === hackId);
    if (!hack) return;

    const nextMilestones = hack.milestones.map((m) => {
      if (m.id === milestoneId) {
        const nextStatus: MilestoneStatus =
          m.status === 'Pending'
            ? 'Current'
            : m.status === 'Current'
            ? 'Completed'
            : 'Pending';
        return { ...m, status: nextStatus };
      }
      return m;
    });

    updateHackathon(hackId, { milestones: nextMilestones });
  };

  return (
    <div className="flex flex-col w-full gap-3 sm:gap-4 lg:gap-5">
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-headline-lg-mobile sm:font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-on-surface font-bold tracking-tight">
            Hackathons &amp; Sprints
          </h1>
          <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant">
            Track multi-stage deliverables from registration to the final pitch.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="h-10 px-4 bg-primary text-on-primary rounded-xl font-label-md text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm hover:bg-primary-container active:scale-95 transition-all self-stretch sm:self-auto justify-center"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>New Sprint</span>
        </button>
      </div>

      {/* Sprints List */}
      <div className="flex flex-col gap-4">
        {hackathons.map((hack) => {
          const completedCount = hack.milestones.filter((m) => m.status === 'Completed').length;
          const progressPercent = Math.round((completedCount / hack.milestones.length) * 100);

          return (
            <div
              key={hack.id}
              className="bg-surface-container-lowest rounded-2xl border border-surface-container shadow-sm p-4 sm:p-5 flex flex-col gap-4"
            >
              {/* Top Banner & Metadata */}
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <img
                  src={hack.bannerImage}
                  alt={hack.name}
                  className="w-full sm:w-28 h-28 rounded-xl object-cover ring-1 ring-surface-container flex-shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-label-xs text-xs text-primary font-bold uppercase tracking-wider">
                      {hack.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingHackathon(hack)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                        title="Edit Hackathon"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        onClick={() => setHackToDelete(hack.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors"
                        title="Delete Hackathon"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>

                  <h3 className="font-headline-md text-base sm:text-lg text-on-surface font-bold mt-0.5 truncate">
                    {hack.trackName}
                  </h3>
                  <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant mt-1">
                    {hack.deliverable}
                  </p>

                  {/* Progress Bar */}
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-surface-container overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary-container transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className="font-label-xs text-xs font-bold text-on-surface whitespace-nowrap">
                      {progressPercent}% Complete
                    </span>
                  </div>
                </div>
              </div>

              {/* 7-Stage Milestone Progression (Responsive horizontal scroll on mobile) */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-surface-container">
                <span className="font-label-xs text-[11px] text-on-surface-variant font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-primary">flag</span>
                  7-Stage Milestone Pipeline (Tap to cycle status: Pending → Current → Completed)
                </span>

                <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-none">
                  {hack.milestones.map((ms, idx) => {
                    const isDone = ms.status === 'Completed';
                    const isCurr = ms.status === 'Current';

                    return (
                      <div
                        key={ms.id}
                        onClick={() => handleCycleMilestoneStatus(hack.id, ms.id)}
                        className={`min-w-[130px] p-2.5 rounded-xl border flex flex-col justify-between cursor-pointer select-none transition-all active:scale-95 ${
                          isDone
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                            : isCurr
                            ? 'bg-primary-fixed/30 border-primary text-on-surface ring-1 ring-primary'
                            : 'bg-surface-container-low border-surface-container text-on-surface-variant hover:bg-surface-container'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono font-bold">
                            #{idx + 1}
                          </span>
                          <span className="material-symbols-outlined text-[16px]">
                            {isDone ? 'check_circle' : isCurr ? 'timelapse' : 'radio_button_unchecked'}
                          </span>
                        </div>
                        <span className="text-xs font-bold truncate block">
                          {ms.stage}
                        </span>
                        <span className="text-[10px] uppercase font-bold mt-1 opacity-80">
                          {ms.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Sprint Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-surface-container-lowest border border-surface-container-high w-full max-w-md rounded-2xl p-5 shadow-2xl flex flex-col gap-3.5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <h3 className="font-headline-md text-base sm:text-lg text-on-surface font-bold">
                New Hackathon Sprint
              </h3>
              <button
                className="w-8 h-8 rounded-full text-on-surface-variant hover:text-on-surface flex items-center justify-center"
                onClick={() => setShowAddModal(false)}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <div>
                <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">
                  Hackathon Name *
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Smart India Hackathon, EthIndia"
                  className="w-full h-11 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">
                  Track / Problem Statement *
                </label>
                <input
                  required
                  type="text"
                  value={trackName}
                  onChange={(e) => setTrackName(e.target.value)}
                  placeholder="e.g. AI for Smart Agriculture"
                  className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none"
                />
              </div>

              <div>
                <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">
                  Immediate Deliverable
                </label>
                <input
                  type="text"
                  value={deliverable}
                  onChange={(e) => setDeliverable(e.target.value)}
                  placeholder="e.g. PPT presentation &amp; architecture diagram"
                  className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none"
                />
              </div>

              <div>
                <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">
                  Current Stage Timeline
                </label>
                <input
                  type="text"
                  value={currentStage}
                  onChange={(e) => setCurrentStage(e.target.value)}
                  placeholder="e.g. Idea Submission in 3 days"
                  className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none"
                />
              </div>

              <div>
                <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">
                  Banner Image URL
                </label>
                <input
                  type="url"
                  value={bannerImage}
                  onChange={(e) => setBannerImage(e.target.value)}
                  className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 h-10 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm"
                >
                  Create Sprint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Sprint Modal */}
      {editingHackathon && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-surface-container-lowest border border-surface-container-high w-full max-w-md rounded-2xl p-5 shadow-2xl flex flex-col gap-3.5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <h3 className="font-headline-md text-base sm:text-lg text-on-surface font-bold">
                Edit Sprint
              </h3>
              <button
                className="w-8 h-8 rounded-full text-on-surface-variant hover:text-on-surface flex items-center justify-center"
                onClick={() => setEditingHackathon(null)}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateHackathon(editingHackathon.id, editingHackathon);
                setEditingHackathon(null);
              }}
              className="flex flex-col gap-3"
            >
              <div>
                <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">
                  Hackathon Name
                </label>
                <input
                  required
                  type="text"
                  value={editingHackathon.name}
                  onChange={(e) => setEditingHackathon({ ...editingHackathon, name: e.target.value })}
                  className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none"
                />
              </div>

              <div>
                <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">
                  Track / Problem
                </label>
                <input
                  required
                  type="text"
                  value={editingHackathon.trackName}
                  onChange={(e) => setEditingHackathon({ ...editingHackathon, trackName: e.target.value })}
                  className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none"
                />
              </div>

              <div>
                <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">
                  Deliverable
                </label>
                <input
                  type="text"
                  value={editingHackathon.deliverable}
                  onChange={(e) => setEditingHackathon({ ...editingHackathon, deliverable: e.target.value })}
                  className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none"
                />
              </div>

              <div>
                <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">
                  Current Stage
                </label>
                <input
                  type="text"
                  value={editingHackathon.currentStage}
                  onChange={(e) => setEditingHackathon({ ...editingHackathon, currentStage: e.target.value })}
                  className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingHackathon(null)}
                  className="flex-1 h-10 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={hackToDelete !== null}
        title="Delete Hackathon Sprint?"
        message="Are you sure you want to remove this hackathon track and all linked milestones?"
        onCancel={() => setHackToDelete(null)}
        onConfirm={() => {
          if (hackToDelete) {
            deleteHackathon(hackToDelete);
            setHackToDelete(null);
          }
        }}
      />
    </div>
  );
};
