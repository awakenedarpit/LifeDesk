import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Hackathon,
  HackathonMilestone,
  MilestoneStage,
  MilestoneStatus,
  ProblemStatementStatus,
} from '../types';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

const PROBLEM_STATEMENT_OPTIONS: ProblemStatementStatus[] = [
  'Not Announced',
  'To Be Announced Today',
  'Selected',
  'To Be Announced on Event Day',
];

const today = () => new Date().toISOString().split('T')[0];

// Older hackathons do not have dedicated DB columns for the new fields yet.
// Store the new metadata inside the existing notes column so it survives Supabase reloads.
const META_PREFIX = '__LIFEDESK_HACKATHON_META__';

type HackMeta = {
  problemStatementStatus: ProblemStatementStatus;
  problemStatement: string;
  eventDate: string;
  userNotes: string;
};

function readMeta(notes?: string): HackMeta {
  if (!notes?.startsWith(META_PREFIX)) {
    return {
      problemStatementStatus: 'Not Announced',
      problemStatement: '',
      eventDate: '',
      userNotes: notes || '',
    };
  }
  try {
    const parsed = JSON.parse(notes.slice(META_PREFIX.length)) as Partial<HackMeta>;
    return {
      problemStatementStatus: parsed.problemStatementStatus || 'Not Announced',
      problemStatement: parsed.problemStatement || '',
      eventDate: parsed.eventDate || '',
      userNotes: parsed.userNotes || '',
    };
  } catch {
    return {
      problemStatementStatus: 'Not Announced',
      problemStatement: '',
      eventDate: '',
      userNotes: notes || '',
    };
  }
}

function writeMeta(meta: HackMeta) {
  return META_PREFIX + JSON.stringify(meta);
}

function displayDate(value?: string) {
  if (!value) return 'Date not set';
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

export const HackathonsView: React.FC = () => {
  const {
    hackathons,
    addHackathon,
    updateHackathon,
    deleteHackathon,
    toggleMilestoneStatus,
    addMilestone,
    updateMilestone,
    deleteMilestone,
  } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHackathon, setEditingHackathon] = useState<Hackathon | null>(null);
  const [hackToDelete, setHackToDelete] = useState<string | null>(null);
  const [addMilestoneHackathonId, setAddMilestoneHackathonId] = useState<string | null>(null);
  const [editingMilestoneData, setEditingMilestoneData] = useState<{ hackathonId: string; milestone: HackathonMilestone } | null>(null);
  const [newMilestoneStage, setNewMilestoneStage] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState(today());

  const [name, setName] = useState('');
  const [trackName, setTrackName] = useState('');
  const [deliverable, setDeliverable] = useState('');
  const [currentStage, setCurrentStage] = useState('Prototype in 5d');
  const [bannerImage, setBannerImage] = useState('https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=80');
  const [problemStatementStatus, setProblemStatementStatus] = useState<ProblemStatementStatus>('Not Announced');
  const [problemStatement, setProblemStatement] = useState('');
  const [eventDate, setEventDate] = useState(today());
  const [participationType, setParticipationType] = useState<'Individual' | 'Team'>('Individual');
  const [teamName, setTeamName] = useState('');
  const [selectedMilestoneStages, setSelectedMilestoneStages] = useState<MilestoneStage[]>([]);
  const [milestoneDates, setMilestoneDates] = useState<Record<string, string>>({});

  const milestoneOptions: MilestoneStage[] = [
    'Registration',
    'Idea Submission',
    'PPT Submission',
    'Screening Quiz',
    'Prototype',
    'Final Submission',
    'Final Pitch',
  ];

  const toggleMilestoneSelection = (stage: MilestoneStage) => {
    setSelectedMilestoneStages((current) => {
      if (current.includes(stage)) {
        setMilestoneDates((dates) => {
          const next = { ...dates };
          delete next[stage];
          return next;
        });
        return current.filter((item) => item !== stage);
      }

      setMilestoneDates((dates) => ({ ...dates, [stage]: dates[stage] || eventDate }));
      return [...current, stage];
    });
  };

  const resetCreateForm = () => {
    setName('');
    setTrackName('');
    setDeliverable('');
    setCurrentStage('Prototype in 5d');
    setProblemStatementStatus('Not Announced');
    setProblemStatement('');
    setEventDate(today());
    setParticipationType('Individual');
    setTeamName('');
    setSelectedMilestoneStages([]);
    setMilestoneDates({});
    setBannerImage('https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=80');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !eventDate) return;
    if (problemStatementStatus === 'Selected' && !problemStatement.trim()) return;

    const hackId = `hack-${Date.now()}`;
    const metadata = writeMeta({
      problemStatementStatus,
      problemStatement: problemStatement.trim(),
      eventDate,
      userNotes: '',
    });

    await addHackathon({
      name,
      trackName,
      organizer: 'National Tech Consortium',
      registrationDeadline: `${eventDate}T23:59:00.000Z`,
      status: 'In Progress',
      deliverable: deliverable || 'Prototype submission',
      currentStage: currentStage || 'Sprint active',
      bannerImage,
      notes: metadata,
      problemStatementStatus,
      problemStatement: problemStatement.trim(),
      eventDate,
      participationType,
      teamName: participationType === 'Team' ? teamName.trim() : '',
      milestones: selectedMilestoneStages.map((stage, idx) => ({
        id: `ms-${Date.now()}-${idx}`,
        hackathonId: hackId,
        stage,
        title: stage,
        date: milestoneDates[stage] || eventDate,
        status: 'Pending',
      })),
    });

    resetCreateForm();
    setShowAddModal(false);
  };

  const decoratedHackathons = useMemo(() => hackathons.map((hack) => ({ hack, meta: readMeta(hack.notes) })), [hackathons]);

  const statusClass = (status: ProblemStatementStatus) => {
    if (status === 'Selected') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    if (status === 'To Be Announced Today') return 'bg-primary/10 text-primary border-primary/30';
    if (status === 'To Be Announced on Event Day') return 'bg-secondary-fixed text-on-secondary-fixed-variant border-secondary/30';
    return 'bg-surface-container-high text-on-surface-variant border-surface-container';
  };

  const saveEditedHackathon = async () => {
    if (!editingHackathon) return;
    const meta = readMeta(editingHackathon.notes);
    const selectedStatus = editingHackathon.problemStatementStatus || meta.problemStatementStatus;
    const selectedStatement = editingHackathon.problemStatement ?? meta.problemStatement;
    const selectedEventDate = editingHackathon.eventDate || meta.eventDate;
    if (selectedStatus === 'Selected' && !selectedStatement.trim()) return;

    await updateHackathon(editingHackathon.id, {
      ...editingHackathon,
      notes: writeMeta({
        problemStatementStatus: selectedStatus,
        problemStatement: selectedStatement.trim(),
        eventDate: selectedEventDate,
        userNotes: meta.userNotes,
      }),
      registrationDeadline: selectedEventDate ? `${selectedEventDate}T23:59:00.000Z` : editingHackathon.registrationDeadline,
    });
    setEditingHackathon(null);
  };

  return (
    <div className="flex flex-col w-full gap-3 sm:gap-4 lg:gap-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-headline-lg-mobile sm:font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-on-surface font-bold tracking-tight">Hackathons &amp; Sprints</h1>
          <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant">Track events, problem statements, milestones and final submissions.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="h-10 px-4 bg-primary text-on-primary rounded-xl font-label-md text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm hover:bg-primary-container active:scale-95 transition-all">
          <span className="material-symbols-outlined text-[18px]">add</span> New Sprint
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {decoratedHackathons.map(({ hack, meta }) => {
          const psStatus = hack.problemStatementStatus || meta.problemStatementStatus;
          const psText = hack.problemStatement ?? meta.problemStatement;
          const hackEventDate = hack.eventDate || meta.eventDate;
          const completedCount = hack.milestones.filter((m) => m.status === 'Completed').length;
          const progressPercent = hack.milestones.length ? Math.round((completedCount / hack.milestones.length) * 100) : 0;

          return (
            <div key={hack.id} className="bg-surface-container-lowest rounded-2xl border border-surface-container shadow-sm p-4 sm:p-5 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <img src={hack.bannerImage} alt={hack.name} className="w-full sm:w-28 h-28 rounded-xl object-cover ring-1 ring-surface-container flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-label-xs text-xs text-primary font-bold uppercase tracking-wider">{hack.name}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditingHackathon({ ...hack, problemStatementStatus: psStatus, problemStatement: psText, eventDate: hackEventDate })} className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container" title="Edit Hackathon"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                      <button onClick={() => setHackToDelete(hack.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container/20" title="Delete Hackathon"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                    </div>
                  </div>
                  <h3 className="font-headline-md text-base sm:text-lg text-on-surface font-bold mt-0.5 truncate">{hack.trackName || 'Hackathon Sprint'}</h3>
                  <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant mt-1">{hack.deliverable}</p>

                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusClass(psStatus)}`}>{psStatus}</span>
                    {hackEventDate && <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">event</span>{displayDate(hackEventDate)}</span>}
                  </div>

                  {psStatus === 'Selected' && psText && (
                    <div className="mt-2 p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-on-surface"><span className="font-bold">Problem Statement:</span> {psText}</div>
                  )}

                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-surface-container overflow-hidden"><div className="h-full bg-gradient-to-r from-primary to-primary-container transition-all" style={{ width: `${progressPercent}%` }} /></div>
                    <span className="font-label-xs text-xs font-bold text-on-surface whitespace-nowrap">{progressPercent}%</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 pt-2 border-t border-surface-container">
                <div className="flex items-center justify-between">
                  <span className="font-label-xs text-[11px] text-on-surface-variant font-bold uppercase tracking-wider flex items-center gap-1.5"><span className="material-symbols-outlined text-[15px] text-primary">flag</span> Milestone Pipeline</span>
                  <button type="button" onClick={() => { setAddMilestoneHackathonId(hack.id); setNewMilestoneStage(''); setNewMilestoneDate(hackEventDate || today()); }} className="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5"><span className="material-symbols-outlined text-[14px]">add</span>Add Milestone</button>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-none">
                  {hack.milestones.map((ms, idx) => {
                    const isDone = ms.status === 'Completed';
                    const isCurr = ms.status === 'Current';
                    return (
                      <div key={ms.id} className={`min-w-[140px] p-2.5 rounded-xl border flex flex-col justify-between transition-all ${isDone ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-300' : isCurr ? 'bg-primary-fixed/30 border-primary text-on-surface ring-1 ring-primary' : 'bg-surface-container-low border-surface-container text-on-surface-variant'}`}>
                        <div className="flex items-center justify-between mb-1"><span className="text-[10px] font-mono font-bold">#{idx + 1}</span><div className="flex items-center gap-1"><button type="button" onClick={() => setEditingMilestoneData({ hackathonId: hack.id, milestone: ms })} className="w-5 h-5 rounded flex items-center justify-center hover:bg-surface-container" title="Edit milestone"><span className="material-symbols-outlined text-[13px]">edit</span></button><button type="button" onClick={() => toggleMilestoneStatus(hack.id, ms.id)} className="material-symbols-outlined text-[16px]" title="Cycle status">{isDone ? 'check_circle' : isCurr ? 'timelapse' : 'radio_button_unchecked'}</button></div></div>
                        <span onClick={() => toggleMilestoneStatus(hack.id, ms.id)} className="text-xs font-bold truncate block cursor-pointer">{ms.stage}</span>
                        <span className="text-[10px] uppercase font-bold mt-1 opacity-80">{ms.status} • {ms.date}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-surface-container-lowest border border-surface-container-high w-full max-w-md rounded-2xl p-5 shadow-2xl flex flex-col gap-3.5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container"><h3 className="font-headline-md text-base sm:text-lg text-on-surface font-bold">New Hackathon Sprint</h3><button className="w-8 h-8 rounded-full text-on-surface-variant flex items-center justify-center" onClick={() => setShowAddModal(false)}><span className="material-symbols-outlined text-[20px]">close</span></button></div>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
  <div className="grid grid-cols-2 gap-2">
    <div>
      <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">Participation</label>
      <select value={participationType} onChange={(e) => setParticipationType(e.target.value as 'Individual' | 'Team')} className="w-full h-10 px-2.5 bg-surface-container-low rounded-lg text-on-surface text-body-md outline-none focus:bg-surface-container-high transition-colors font-medium">
        <option value="Individual">Individual</option>
        <option value="Team">Team</option>
      </select>
    </div>
    {participationType === 'Team' && <div>
      <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">Team Name</label>
      <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Neural Nexus" className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-on-surface text-body-md outline-none focus:bg-surface-container-high transition-colors" />
    </div>}
  </div>
  
              <div><label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">Hackathon Name *</label><input required type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Smart India Hackathon" className="w-full h-11 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none" autoFocus /></div>
              <div><label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">Track / Category</label><input type="text" value={trackName} onChange={(e) => setTrackName(e.target.value)} placeholder="e.g. AI / Web3 / Open Innovation" className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none" /></div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container flex flex-col gap-2">
                <div><label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">Problem Statement Status *</label><select value={problemStatementStatus} onChange={(e) => setProblemStatementStatus(e.target.value as ProblemStatementStatus)} className="w-full h-10 px-2 bg-surface-container-lowest rounded-xl text-on-surface text-xs font-semibold outline-none">{PROBLEM_STATEMENT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                {problemStatementStatus === 'Selected' && <div><label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">Selected Problem Statement *</label><textarea required value={problemStatement} onChange={(e) => setProblemStatement(e.target.value)} placeholder="Enter the selected problem statement" className="w-full min-h-20 p-3 bg-surface-container-lowest rounded-xl text-on-surface text-xs outline-none resize-none" /></div>}
              </div>

              <div><label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">Hackathon / Event Date *</label><input required type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none" /><p className="text-[10px] text-on-surface-variant mt-1">This is the default date used when you select a timeline.</p></div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container flex flex-col gap-2.5">
                <div>
                  <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block">Milestone Timelines</label>
                  <p className="text-[10px] text-on-surface-variant mt-1">Select only the timelines you want. Nothing is created automatically.</p>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {milestoneOptions.map((stage) => {
                    const selected = selectedMilestoneStages.includes(stage);
                    return (
                      <div key={stage} className="flex items-center gap-2">
                        <button type="button" onClick={() => toggleMilestoneSelection(stage)} className={`flex-1 h-9 px-3 rounded-lg border text-left text-xs font-semibold transition-all ${selected ? 'border-primary bg-primary/10 text-primary' : 'border-surface-container bg-surface-container-lowest text-on-surface-variant hover:border-primary/40'}`}>
                          <span className="material-symbols-outlined align-middle text-[15px] mr-1">{selected ? 'check_box' : 'check_box_outline_blank'}</span>{stage}
                        </button>
                        {selected && <input aria-label={`${stage} date`} required type="date" value={milestoneDates[stage] || eventDate} onChange={(e) => setMilestoneDates((dates) => ({ ...dates, [stage]: e.target.value }))} className="h-9 w-[132px] px-2 bg-surface-container-lowest border border-surface-container rounded-lg text-on-surface text-[11px] outline-none" />}
                      </div>
                    );
                  })}
                </div>
                <span className="text-[10px] text-on-surface-variant">{selectedMilestoneStages.length} timeline{selectedMilestoneStages.length === 1 ? '' : 's'} selected</span>
              </div>
              <div><label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">Immediate Deliverable</label><input type="text" value={deliverable} onChange={(e) => setDeliverable(e.target.value)} placeholder="e.g. PPT / Prototype / Final Pitch" className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none" /></div>
              <div><label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">Current Stage Timeline</label><input type="text" value={currentStage} onChange={(e) => setCurrentStage(e.target.value)} placeholder="e.g. Idea Submission in 3 days" className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none" /></div>
              <div><label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">Banner Image URL</label><input type="url" value={bannerImage} onChange={(e) => setBannerImage(e.target.value)} className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none" /></div>
              <div className="flex gap-2 pt-2"><button type="button" onClick={() => setShowAddModal(false)} className="flex-1 h-10 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold">Cancel</button><button type="submit" className="flex-1 h-10 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm">Create Sprint</button></div>
            </form>
          </div>
        </div>
      )}

      {editingHackathon && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-surface-container-lowest border border-surface-container-high w-full max-w-md rounded-2xl p-5 shadow-2xl flex flex-col gap-3.5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container"><h3 className="font-headline-md text-base sm:text-lg text-on-surface font-bold">Edit Hackathon</h3><button className="w-8 h-8 rounded-full text-on-surface-variant flex items-center justify-center" onClick={() => setEditingHackathon(null)}><span className="material-symbols-outlined text-[20px]">close</span></button></div>
            <div className="flex flex-col gap-3">
              <div><label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">Hackathon Name</label><input required type="text" value={editingHackathon.name} onChange={(e) => setEditingHackathon({ ...editingHackathon, name: e.target.value })} className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none" /></div>
              <div><label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">Track / Category</label><input type="text" value={editingHackathon.trackName || ''} onChange={(e) => setEditingHackathon({ ...editingHackathon, trackName: e.target.value })} className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none" /></div>
              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container flex flex-col gap-2"><label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">Problem Statement Status</label><select value={editingHackathon.problemStatementStatus || 'Not Announced'} onChange={(e) => setEditingHackathon({ ...editingHackathon, problemStatementStatus: e.target.value as ProblemStatementStatus })} className="w-full h-10 px-2 bg-surface-container-lowest rounded-xl text-on-surface text-xs font-semibold outline-none">{PROBLEM_STATEMENT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select>{editingHackathon.problemStatementStatus === 'Selected' && <textarea required value={editingHackathon.problemStatement || ''} onChange={(e) => setEditingHackathon({ ...editingHackathon, problemStatement: e.target.value })} placeholder="Enter selected problem statement" className="w-full min-h-20 p-3 bg-surface-container-lowest rounded-xl text-on-surface text-xs outline-none resize-none" />}</div>
              <div><label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">Hackathon / Event Date</label><input type="date" value={editingHackathon.eventDate || ''} onChange={(e) => setEditingHackathon({ ...editingHackathon, eventDate: e.target.value })} className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none" /></div>
              <div><label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">Deliverable</label><input type="text" value={editingHackathon.deliverable || ''} onChange={(e) => setEditingHackathon({ ...editingHackathon, deliverable: e.target.value })} className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none" /></div>
              <div><label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">Current Stage</label><input type="text" value={editingHackathon.currentStage} onChange={(e) => setEditingHackathon({ ...editingHackathon, currentStage: e.target.value })} className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none" /></div>
              <div className="flex gap-2 pt-2"><button type="button" onClick={() => setEditingHackathon(null)} className="flex-1 h-10 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold">Cancel</button><button type="button" onClick={saveEditedHackathon} className="flex-1 h-10 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm">Save Changes</button></div>
            </div>
          </div>
        </div>
      )}

      {addMilestoneHackathonId && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-xs flex items-center justify-center p-3"><div className="bg-surface-container-lowest border border-surface-container-high w-full max-w-sm rounded-2xl p-5 shadow-2xl"><h3 className="font-headline-md text-base text-on-surface font-bold mb-3">Add Hackathon Milestone</h3><form onSubmit={async (e) => { e.preventDefault(); if (!newMilestoneStage) return; await addMilestone(addMilestoneHackathonId, { stage: newMilestoneStage as MilestoneStage, title: newMilestoneStage, date: newMilestoneDate, status: 'Pending' }); setAddMilestoneHackathonId(null); }} className="flex flex-col gap-3"><input required value={newMilestoneStage} onChange={(e) => setNewMilestoneStage(e.target.value)} placeholder="Milestone name / stage" className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none" /><input required type="date" value={newMilestoneDate} onChange={(e) => setNewMilestoneDate(e.target.value)} className="w-full h-10 px-2 bg-surface-container-low rounded-xl text-on-surface text-xs outline-none" /><div className="flex gap-2"><button type="button" onClick={() => setAddMilestoneHackathonId(null)} className="flex-1 h-10 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold">Cancel</button><button type="submit" className="flex-1 h-10 rounded-xl bg-primary text-on-primary text-xs font-bold">Add</button></div></form></div></div>
      )}

      {editingMilestoneData && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-xs flex items-center justify-center p-3"><div className="bg-surface-container-lowest border border-surface-container-high w-full max-w-sm rounded-2xl p-5 shadow-2xl"><h3 className="font-headline-md text-base text-on-surface font-bold mb-3">Edit Milestone</h3><form onSubmit={async (e) => { e.preventDefault(); await updateMilestone(editingMilestoneData.hackathonId, editingMilestoneData.milestone.id, editingMilestoneData.milestone); setEditingMilestoneData(null); }} className="flex flex-col gap-3"><input required value={editingMilestoneData.milestone.stage} onChange={(e) => setEditingMilestoneData({ ...editingMilestoneData, milestone: { ...editingMilestoneData.milestone, stage: e.target.value as MilestoneStage, title: e.target.value } })} className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none" /><select value={editingMilestoneData.milestone.status} onChange={(e) => setEditingMilestoneData({ ...editingMilestoneData, milestone: { ...editingMilestoneData.milestone, status: e.target.value as MilestoneStatus } })} className="w-full h-10 px-2 bg-surface-container-low rounded-xl text-on-surface text-xs"><option>Pending</option><option>Current</option><option>Completed</option><option>Missed</option></select><input type="date" value={editingMilestoneData.milestone.date} onChange={(e) => setEditingMilestoneData({ ...editingMilestoneData, milestone: { ...editingMilestoneData.milestone, date: e.target.value } })} className="w-full h-10 px-2 bg-surface-container-low rounded-xl text-on-surface text-xs" /><input value={editingMilestoneData.milestone.notes || ''} onChange={(e) => setEditingMilestoneData({ ...editingMilestoneData, milestone: { ...editingMilestoneData.milestone, notes: e.target.value } })} placeholder="Notes" className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-xs outline-none" /><div className="flex gap-2"><button type="button" onClick={async () => { await deleteMilestone(editingMilestoneData.hackathonId, editingMilestoneData.milestone.id); setEditingMilestoneData(null); }} className="h-10 px-3 rounded-xl bg-error-container text-on-error-container text-xs font-bold">Delete</button><button type="button" onClick={() => setEditingMilestoneData(null)} className="flex-1 h-10 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold">Cancel</button><button type="submit" className="flex-1 h-10 rounded-xl bg-primary text-on-primary text-xs font-bold">Save</button></div></form></div></div>
      )}

      <DeleteConfirmModal isOpen={hackToDelete !== null} title="Delete Hackathon Sprint?" message="Are you sure you want to remove this hackathon track and all linked milestones?" onCancel={() => setHackToDelete(null)} onConfirm={() => { if (hackToDelete) { deleteHackathon(hackToDelete); setHackToDelete(null); } }} />
    </div>
  );
};