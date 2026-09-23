import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CalendarEvent } from '../types';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

type CalendarMode = 'month' | 'week' | 'day';

export const CalendarView: React.FC = () => {
  const { events, deadlines, tasks, hackathons, addEvent, updateEvent, deleteEvent, openModal } = useApp();

  const [mode, setMode] = useState<CalendarMode>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(new Date().toISOString().split('T')[0]);

  // Quick event add
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState(selectedDateStr);
  const [newTime, setNewTime] = useState('14:00');
  const [newType, setNewType] = useState<CalendarEvent['type']>('event');

  // Deletion modal
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  // Month navigation
  const prevPeriod = () => {
    const next = new Date(currentDate);
    if (mode === 'month') next.setMonth(next.getMonth() - 1);
    else if (mode === 'week') next.setDate(next.getDate() - 7);
    else next.setDate(next.getDate() - 1);
    setCurrentDate(next);
  };

  const nextPeriod = () => {
    const next = new Date(currentDate);
    if (mode === 'month') next.setMonth(next.getMonth() + 1);
    else if (mode === 'week') next.setDate(next.getDate() + 7);
    else next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const todayPeriod = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(today.toISOString().split('T')[0]);
  };

  // Compile a single calendar source from persisted events + tasks + deadlines + hackathon milestones.
  // Tasks/deadlines are intentionally derived from their own source records so calendar
  // entries remain visible after a refresh and always follow date edits.
  const eventReferenceIds = new Set(events.map((e) => e.referenceId).filter(Boolean));

  const taskCalendarItems: CalendarEvent[] = tasks
    .filter((task) => !eventReferenceIds.has(task.id))
    .map((task) => {
      const [datePart, timePart] = (task.deadline || '').split('T');
      return {
        id: `calendar-task-${task.id}`,
        title: task.name,
        description: task.description,
        category: task.category,
        startDate: datePart || '',
        startTime: timePart ? timePart.substring(0, 5) : undefined,
        type: 'task',
        referenceId: task.id,
      };
    })
    .filter((item) => Boolean(item.startDate));

  const deadlineCalendarItems: CalendarEvent[] = deadlines
    .filter((deadline) => !eventReferenceIds.has(deadline.id))
    .map((deadline) => {
      const [datePart, timePart] = (deadline.dueDate || '').split('T');
      return {
        id: `calendar-deadline-${deadline.id}`,
        title: deadline.title,
        description: deadline.description,
        category: deadline.category,
        startDate: datePart || '',
        startTime: timePart ? timePart.substring(0, 5) : undefined,
        type: 'deadline',
        referenceId: deadline.id,
      };
    })
    .filter((item) => Boolean(item.startDate));

  const milestoneCalendarItems: CalendarEvent[] = hackathons.flatMap((hackathon) =>
    (hackathon.milestones || [])
      .filter((milestone) => Boolean(milestone.date))
      .map((milestone) => ({
        id: `calendar-milestone-${hackathon.id}-${milestone.id}`,
        title: milestone.title || milestone.stage,
        description: milestone.notes || `${hackathon.name} • ${milestone.stage}`,
        category: 'Hackathon',
        startDate: milestone.date.split('T')[0],
        startTime: milestone.time || undefined,
        type: 'hackathon' as const,
        referenceId: milestone.id,
      }))
  );

  const calendarSourceItems = [
    ...events,
    ...taskCalendarItems,
    ...deadlineCalendarItems,
    ...milestoneCalendarItems,
  ];

  const allCalendarItems: (CalendarEvent & { color: string })[] = calendarSourceItems.map((e) => ({
    ...e,
    color:
      e.type === 'deadline'
        ? 'bg-error-container text-on-error-container border-error-container'
        : e.type === 'task'
        ? 'bg-primary-fixed text-on-primary-fixed-variant border-primary-fixed'
        : e.type === 'hackathon'
        ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant border-tertiary-fixed'
        : 'bg-surface-container-high text-on-surface border-surface-container',
  }));

  // Month grid helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Selected date agenda items
  const selectedDayItems = allCalendarItems.filter((i) => i.startDate === selectedDateStr);

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    addEvent({
      title: newTitle,
      description: newDesc,
      category: 'Academic',
      startDate: newDate,
      startTime: newTime,
      type: newType,
    });
    setNewTitle('');
    setNewDesc('');
    setShowAddModal(false);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex flex-col w-full gap-3 sm:gap-4 lg:gap-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-headline-lg-mobile sm:font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-on-surface font-bold tracking-tight">
            Academic Calendar
          </h1>
          <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant">
            Coordinate coursework, exams, submissions, and hackathon schedules.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
          {/* Mode Switcher */}
          <div className="flex bg-surface-container-low p-1 rounded-xl border border-surface-container">
            {(['month', 'week', 'day'] as CalendarMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                  mode === m
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* New Event Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="h-9 px-3.5 bg-primary text-on-primary rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-primary-container active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[17px]">add</span>
            <span>Event</span>
          </button>
        </div>
      </div>

      {/* Navigation Toolbar */}
      <div className="flex items-center justify-between bg-surface-container-lowest p-3 rounded-2xl border border-surface-container">
        <div className="flex items-center gap-2">
          <h2 className="font-title-sm text-base sm:text-lg text-on-surface font-bold">
            {monthNames[month]} {year}
          </h2>
          <button
            onClick={todayPeriod}
            className="font-label-xs text-xs px-2.5 py-1 rounded-lg bg-surface-container-high text-primary font-bold hover:bg-surface-container transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={prevPeriod}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
            title="Previous"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <button
            onClick={nextPeriod}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
            title="Next"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* 1. MONTH VIEW */}
      {mode === 'month' && (
        <div className="bg-surface-container-lowest rounded-2xl border border-surface-container shadow-sm overflow-hidden">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 border-b border-surface-container text-center bg-surface-container-low/50">
            {daysOfWeek.map((d) => (
              <div key={d} className="py-2 text-[11px] sm:text-xs font-bold text-on-surface-variant uppercase">
                {d}
              </div>
            ))}
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr">
            {/* Empty slots before first day */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[64px] sm:min-h-[96px] p-1 sm:p-2 bg-surface-container-low/30 border-r border-b border-surface-container/60" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isSelected = selectedDateStr === dateStr;
              const isToday = new Date().toISOString().split('T')[0] === dateStr;
              const dayEvents = allCalendarItems.filter((item) => item.startDate === dateStr);

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDateStr(dateStr)}
                  className={`min-h-[64px] sm:min-h-[96px] p-1 sm:p-2 border-r border-b border-surface-container transition-colors cursor-pointer flex flex-col ${
                    isSelected
                      ? 'bg-primary-fixed/20 ring-1 ring-inset ring-primary'
                      : 'hover:bg-surface-container-low/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isToday
                          ? 'bg-primary text-on-primary'
                          : isSelected
                          ? 'font-bold text-primary'
                          : 'text-on-surface'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {/* Mobile Event Dots indicator (Compact Mobile representation) */}
                    <div className="flex sm:hidden gap-1">
                      {dayEvents.slice(0, 3).map((e, idx) => (
                        <span
                          key={idx}
                          className={`w-1.5 h-1.5 rounded-full ${
                            e.type === 'deadline'
                              ? 'bg-error'
                              : e.type === 'hackathon'
                              ? 'bg-tertiary'
                              : 'bg-primary'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Desktop Event Badges */}
                  <div className="hidden sm:flex flex-col gap-1 mt-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map((item) => (
                      <div
                        key={item.id}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-semibold truncate border ${item.color}`}
                        title={`${item.title} (${item.startTime || 'All day'})`}
                      >
                        {item.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[9px] text-on-surface-variant font-bold pl-1">
                        +{dayEvents.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. WEEK VIEW */}
      {mode === 'week' && (
        <div className="bg-surface-container-lowest rounded-2xl border border-surface-container shadow-sm p-3 overflow-x-auto">
          <div className="min-w-[600px] grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => {
              const startOfWeek = new Date(currentDate);
              startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + i);
              const dateStr = startOfWeek.toISOString().split('T')[0];
              const dayEvents = allCalendarItems.filter((item) => item.startDate === dateStr);
              const isToday = new Date().toISOString().split('T')[0] === dateStr;

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDateStr(dateStr)}
                  className={`p-2.5 rounded-xl border flex flex-col gap-2 min-h-[160px] cursor-pointer transition-all ${
                    selectedDateStr === dateStr
                      ? 'border-primary bg-primary/5'
                      : 'border-surface-container bg-surface-container-low'
                  }`}
                >
                  <div className="text-center pb-2 border-b border-surface-container">
                    <span className="text-[11px] font-bold text-on-surface-variant uppercase block">
                      {daysOfWeek[i]}
                    </span>
                    <span
                      className={`inline-flex w-7 h-7 rounded-full items-center justify-center text-xs font-bold mt-0.5 ${
                        isToday ? 'bg-primary text-on-primary' : 'text-on-surface'
                      }`}
                    >
                      {startOfWeek.getDate()}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 flex-1">
                    {dayEvents.map((item) => (
                      <div
                        key={item.id}
                        className={`p-1.5 rounded-lg text-xs font-semibold border ${item.color}`}
                      >
                        <span className="text-[9px] block opacity-85 font-mono">
                          {item.startTime || 'All day'}
                        </span>
                        <p className="font-bold truncate">{item.title}</p>
                      </div>
                    ))}
                    {dayEvents.length === 0 && (
                      <span className="text-[11px] text-on-surface-variant/60 text-center my-auto">
                        No events
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. DAY VIEW */}
      {mode === 'day' && (
        <div className="bg-surface-container-lowest rounded-2xl border border-surface-container shadow-sm p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between pb-3 border-b border-surface-container">
            <span className="font-title-sm text-base text-on-surface font-bold">
              Timeline for {new Date(selectedDateStr).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
            <span className="font-label-xs text-xs px-2.5 py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-bold">
              {selectedDayItems.length} Events
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {selectedDayItems.length === 0 ? (
              <div className="py-8 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl text-primary mb-1">event_available</span>
                <p className="font-semibold text-sm">No scheduled items for this date.</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-3 px-3.5 py-1.5 bg-primary text-on-primary rounded-xl text-xs font-bold"
                >
                  + Add Event
                </button>
              </div>
            ) : (
              selectedDayItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${item.color}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-black/10">
                      {item.startTime || '12:00'}
                    </span>
                    <div>
                      <h4 className="font-bold text-sm">{item.title}</h4>
                      {item.description && (
                        <p className="text-xs opacity-90">{item.description}</p>
                      )}
                    </div>
                  </div>
                  <span className="font-label-xs text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-black/10">
                    {item.type}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Selected Date Agenda Drawer (Appears below calendar, indispensable for mobile) */}
      <div className="bg-surface-container-lowest rounded-2xl border border-surface-container p-4 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">calendar_today</span>
            <h3 className="font-title-sm text-sm sm:text-base text-on-surface font-bold">
              Agenda for {new Date(selectedDateStr).toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' })}
            </h3>
          </div>
          <span className="font-label-xs text-xs text-on-surface-variant">
            {selectedDayItems.length} item{selectedDayItems.length === 1 ? '' : 's'}
          </span>
        </div>

        {selectedDayItems.length === 0 ? (
          <p className="text-xs sm:text-sm text-on-surface-variant py-2">
            No deadlines, tasks, or events scheduled for this day.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {selectedDayItems.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-surface-container-low border border-surface-container flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-surface-container-high text-primary flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {item.startTime ? item.startTime.substring(0, 5) : 'All day'}
                  </div>
                  <div className="truncate">
                    <span className="font-title-sm text-xs sm:text-sm text-on-surface font-bold block truncate">
                      {item.title}
                    </span>
                    <span className="text-xs text-on-surface-variant block truncate">
                      {item.description || item.type}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`font-label-xs text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      item.type === 'deadline'
                        ? 'bg-error-container text-on-error-container'
                        : item.type === 'hackathon'
                        ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                        : 'bg-primary-fixed text-on-primary-fixed-variant'
                    }`}
                  >
                    {item.type}
                  </span>
                  {item.type !== 'task' && item.type !== 'hackathon' && !item.referenceId && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingEvent(item)}
                        className="w-7 h-7 flex items-center justify-center text-on-surface-variant hover:text-on-surface rounded-lg"
                        title="Edit event"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button
                        onClick={() => setEventToDelete(item.id)}
                        className="w-7 h-7 flex items-center justify-center text-on-surface-variant hover:text-error rounded-lg"
                        title="Delete event"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-surface-container-lowest border border-surface-container-high w-full max-w-sm rounded-2xl p-5 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <h3 className="font-headline-md text-base text-on-surface font-bold">
                Add Calendar Event
              </h3>
              <button
                className="w-8 h-8 rounded-full text-on-surface-variant hover:text-on-surface flex items-center justify-center"
                onClick={() => setShowAddModal(false)}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="flex flex-col gap-3">
              <div>
                <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">
                  Event Title *
                </label>
                <input
                  required
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Physics Lab Viva, Club Meet"
                  className="w-full h-11 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="e.g. Lab room 302, carry notebook"
                  className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full h-10 px-2 bg-surface-container-low rounded-xl text-on-surface text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full h-10 px-2 bg-surface-container-low rounded-xl text-on-surface text-xs outline-none"
                  />
                </div>
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
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-surface-container-lowest border border-surface-container-high w-full max-w-sm rounded-2xl p-5 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <h3 className="font-headline-md text-base text-on-surface font-bold">
                Edit Calendar Event
              </h3>
              <button
                className="w-8 h-8 rounded-full text-on-surface-variant hover:text-on-surface flex items-center justify-center"
                onClick={() => setEditingEvent(null)}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateEvent(editingEvent.id, {
                  title: editingEvent.title,
                  description: editingEvent.description,
                  startDate: editingEvent.startDate,
                  startTime: editingEvent.startTime,
                  type: editingEvent.type,
                });
                setEditingEvent(null);
              }}
              className="flex flex-col gap-3"
            >
              <div>
                <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">
                  Event Title *
                </label>
                <input
                  required
                  type="text"
                  value={editingEvent.title}
                  onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  className="w-full h-11 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none"
                />
              </div>

              <div>
                <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={editingEvent.description || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                  className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editingEvent.startDate}
                    onChange={(e) => setEditingEvent({ ...editingEvent, startDate: e.target.value })}
                    className="w-full h-10 px-2 bg-surface-container-low rounded-xl text-on-surface text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={editingEvent.startTime || '14:00'}
                    onChange={(e) => setEditingEvent({ ...editingEvent, startTime: e.target.value })}
                    className="w-full h-10 px-2 bg-surface-container-low rounded-xl text-on-surface text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">
                  Type
                </label>
                <select
                  value={editingEvent.type}
                  onChange={(e) => setEditingEvent({ ...editingEvent, type: e.target.value as CalendarEvent['type'] })}
                  className="w-full h-10 px-2 bg-surface-container-low rounded-xl text-on-surface text-xs font-semibold outline-none"
                >
                  <option value="event">General Event</option>
                  <option value="deadline">Academic Deadline</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
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

      {/* Deletion Modal */}
      <DeleteConfirmModal
        isOpen={eventToDelete !== null}
        title="Delete Event?"
        message="Are you sure you want to remove this calendar entry?"
        onCancel={() => setEventToDelete(null)}
        onConfirm={() => {
          if (eventToDelete) {
            deleteEvent(eventToDelete);
            setEventToDelete(null);
          }
        }}
      />
    </div>
  );
};
