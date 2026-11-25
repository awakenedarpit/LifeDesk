import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, ExternalLink, Plus, Search, CheckCircle2, Clock3, Trash2, Pencil, X } from 'lucide-react';
import { getSupabaseClient } from '../services/supabaseClient';
import { LearningItem } from '../types';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

const emptyForm = { topic: '', category: 'AI / ML', status: 'To Learn' as LearningItem['status'], priority: 'Medium' as LearningItem['priority'], source: '', resourceUrl: '', note: '', personalNotes: '' };

export const LearningView: React.FC = () => {
  const [items, setItems] = useState<LearningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'All' | LearningItem['status']>('All');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<LearningItem | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const client = getSupabaseClient();
  const LOCAL_KEY = 'lifedesk_learning_items';

  const readLocal = (): LearningItem[] => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const writeLocal = (next: LearningItem[]) => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
    } catch {
      // ignore storage quota errors
    }
  };

  const load = async () => {
    if (!client) {
      setItems(readLocal());
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: { user } } = await client.auth.getUser();
    if (!user) { setItems([]); setLoading(false); return; }
    const { data, error } = await client.from('learning_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (!error && data) setItems(data.map((x: any) => ({ id: x.id, userId: x.user_id, topic: x.topic, category: x.category, status: x.status, priority: x.priority, source: x.source || '', resourceUrl: x.resource_url || '', note: x.note || '', personalNotes: x.personal_notes || '', createdAt: x.created_at, learnedAt: x.learned_at || undefined, updatedAt: x.updated_at })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter(i => {
    const q = query.trim().toLowerCase();
    return (!q || `${i.topic} ${i.category} ${i.source} ${i.note}`.toLowerCase().includes(q)) && (status === 'All' || i.status === status);
  }), [items, query, status]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (item: LearningItem) => { setEditing(item); setForm({ topic: item.topic, category: item.category, status: item.status, priority: item.priority, source: item.source || '', resourceUrl: item.resourceUrl || '', note: item.note || '', personalNotes: item.personalNotes || '' }); setShowModal(true); };

  const save = async () => {
    if (!form.topic.trim()) return;
    if (!client) {
      const now = new Date().toISOString();
      const current = readLocal();
      const next = editing
        ? current.map(i => i.id === editing.id ? { ...i, ...form, topic: form.topic.trim(), updatedAt: now } : i)
        : [{ id: `learn-${Date.now()}`, userId: 'local', ...form, topic: form.topic.trim(), createdAt: now, updatedAt: now }, ...current];
      writeLocal(next);
      setItems(next);
      setShowModal(false);
      return;
    }
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;
    const payload = { topic: form.topic.trim(), category: form.category, status: form.status, priority: form.priority, source: form.source || null, resource_url: form.resourceUrl || null, note: form.note || null, personal_notes: form.personalNotes || null };
    if (editing) await client.from('learning_items').update(payload).eq('id', editing.id).eq('user_id', user.id);
    else await client.from('learning_items').insert({ ...payload, user_id: user.id });
    setShowModal(false); await load();
  };

  const remove = async (id: string) => {
    if (!client) {
      const next = readLocal().filter(i => i.id !== id);
      writeLocal(next);
      setItems(next);
      return;
    }
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;
    await client.from('learning_items').delete().eq('id', id).eq('user_id', user.id);
    await load();
  };
  const markLearned = async (item: LearningItem) => {
    if (!client) {
      const now = new Date().toISOString();
      const next = readLocal().map(i => i.id === item.id ? { ...i, status: 'Learned' as const, learnedAt: now, updatedAt: now } : i);
      writeLocal(next);
      setItems(next);
      return;
    }
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;
    await client.from('learning_items').update({ status: 'Learned' }).eq('id', item.id).eq('user_id', user.id);
    await load();
  };

  const counts = { all: items.length, toLearn: items.filter(i => i.status === 'To Learn').length, learning: items.filter(i => i.status === 'Learning').length, learned: items.filter(i => i.status === 'Learned').length };

  const getSafeResourceUrl = (raw?: string): string | null => {
    if (!raw) return null;
    try {
      const parsed = new URL(raw.trim());
      return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : null;
    } catch {
      return null;
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-headline-lg-mobile sm:font-headline-lg text-on-surface font-bold tracking-tight">Things to Learn</h1>
          <p className="text-sm text-on-surface-variant">Save interesting tech topics now. Learn them when you have time.</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary shadow-sm hover:bg-primary-container hover:text-on-primary-container transition-colors">
          <Plus size={18} /> Add Topic
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {([
          ['Saved', counts.all, 'All'],
          ['To Learn', counts.toLearn, 'To Learn'],
          ['Learning', counts.learning, 'Learning'],
          ['Learned', counts.learned, 'Learned'],
        ] as const).map(([label, count, targetStatus]) => {
          const isSelected = status === targetStatus;
          return (
            <button
              key={label}
              onClick={() => setStatus(targetStatus)}
              className={`text-left rounded-2xl border p-4 shadow-sm transition-colors ${
                isSelected
                  ? 'border-primary bg-primary-fixed/40'
                  : 'border-outline-variant bg-surface-container-lowest hover:border-primary/60'
              }`}
            >
              <div className="text-xs text-on-surface-variant font-semibold">{label}</div>
              <div className="text-xl font-extrabold text-on-surface mt-1 tabular-nums">{count}</div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search MCP, RAG, Vercel, Docker..." className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest py-3 pl-10 pr-4 text-sm text-on-surface outline-none focus:border-primary" />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value as any)} className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-3 text-sm text-on-surface font-semibold outline-none focus:border-primary">
          <option>All</option><option>To Learn</option><option>Learning</option><option>Learned</option>
        </select>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 text-center text-sm text-on-surface-variant">Loading your learning list...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-10 text-center">
          <BookOpen className="mx-auto text-primary-ink" />
          <p className="mt-2 font-semibold text-on-surface">Nothing saved yet</p>
          <p className="text-sm text-on-surface-variant mt-1">Saw something interesting? Save it here before you forget.</p>
          <button onClick={openNew} className="mt-4 text-sm font-bold text-primary-ink hover:underline">+ Add your first topic</button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(item => {
            const safeUrl = getSafeResourceUrl(item.resourceUrl);
            return (
              <div key={item.id} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary-ink flex items-center justify-center shrink-0">
                    <BookOpen size={19} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2 items-center">
                      <h3 className="font-bold text-on-surface">{item.topic}</h3>
                      <span className="text-[10px] rounded-full bg-surface-container-low border border-outline-variant px-2 py-0.5 font-bold text-on-surface-variant">{item.category}</span>
                      <span className={`text-[10px] rounded-full px-2 py-0.5 font-bold ${item.priority === 'High' ? 'bg-error-container text-on-error-container' : 'bg-primary-fixed text-on-primary-fixed-variant'}`}>{item.priority}</span>
                    </div>
                    {item.note && <p className="mt-1 text-sm text-on-surface-variant">{item.note}</p>}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-on-surface-variant">
                      <span className="inline-flex items-center gap-1"><Clock3 size={13} />{item.status}</span>
                      {item.source && <span>• {item.source}</span>}
                      {safeUrl && (
                        <a href={safeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary-ink font-semibold hover:underline">
                          Open resource <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => markLearned(item)} title="Mark learned" className="rounded-lg p-2 hover:bg-primary-fixed text-primary-ink transition-colors"><CheckCircle2 size={17} /></button>
                    <button onClick={() => openEdit(item)} title="Edit" className="rounded-lg p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"><Pencil size={17} /></button>
                    <button onClick={() => setDeleteTargetId(item.id)} title="Delete" className="rounded-lg p-2 hover:bg-error-container/25 text-error transition-colors"><Trash2 size={17} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DeleteConfirmModal
        isOpen={Boolean(deleteTargetId)}
        title="Delete Learning Topic?"
        message="This will remove this saved topic from your learning list."
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTargetId) {
            remove(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
      />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-surface-container-lowest border border-outline-variant p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
              <h2 className="font-bold text-lg text-on-surface">{editing ? 'Edit Learning Topic' : 'Save Something to Learn'}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface"><X size={18} /></button>
            </div>
            <div className="mt-4 space-y-3">
              <input autoFocus value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} placeholder="e.g. MCP, RAG, Vercel AI SDK" className="w-full rounded-xl border border-outline-variant bg-surface-container-low text-on-surface px-3 py-2.5 text-sm outline-none focus:border-primary" />
              <div className="grid grid-cols-2 gap-3">
                <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Category" className="rounded-xl border border-outline-variant bg-surface-container-low text-on-surface px-3 py-2.5 text-sm outline-none focus:border-primary" />
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as any })} className="rounded-xl border border-outline-variant bg-surface-container-low text-on-surface px-3 py-2.5 text-sm outline-none focus:border-primary"><option>Low</option><option>Medium</option><option>High</option></select>
              </div>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })} className="w-full rounded-xl border border-outline-variant bg-surface-container-low text-on-surface px-3 py-2.5 text-sm outline-none focus:border-primary"><option>To Learn</option><option>Learning</option><option>Learned</option></select>
              <input value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} placeholder="Source (Instagram, YouTube, etc.)" className="w-full rounded-xl border border-outline-variant bg-surface-container-low text-on-surface px-3 py-2.5 text-sm outline-none focus:border-primary" />
              <input value={form.resourceUrl} onChange={e => setForm({ ...form, resourceUrl: e.target.value })} placeholder="Resource URL (optional)" className="w-full rounded-xl border border-outline-variant bg-surface-container-low text-on-surface px-3 py-2.5 text-sm outline-none focus:border-primary" />
              <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Why did you save this?" className="w-full min-h-20 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface px-3 py-2.5 text-sm outline-none focus:border-primary" />
              <textarea value={form.personalNotes} onChange={e => setForm({ ...form, personalNotes: e.target.value })} placeholder="Your notes" className="w-full min-h-24 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface px-3 py-2.5 text-sm outline-none focus:border-primary" />
              <button onClick={save} disabled={!form.topic.trim()} className="w-full rounded-xl bg-primary py-3 font-bold text-on-primary disabled:opacity-50 hover:bg-primary-container hover:text-on-primary-container transition-colors">{editing ? 'Save Changes' : 'Save Topic'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};