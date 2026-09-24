import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, ExternalLink, Plus, Search, CheckCircle2, Clock3, Trash2, Pencil, X } from 'lucide-react';
import { getSupabaseClient } from '../services/supabaseClient';
import { LearningItem } from '../types';

const emptyForm = { topic: '', category: 'AI / ML', status: 'To Learn' as LearningItem['status'], priority: 'Medium' as LearningItem['priority'], source: '', resourceUrl: '', note: '', personalNotes: '' };

export const LearningView: React.FC = () => {
  const [items, setItems] = useState<LearningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'All' | LearningItem['status']>('All');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<LearningItem | null>(null);
  const [form, setForm] = useState(emptyForm);

  const client = getSupabaseClient();

  const load = async () => {
    if (!client) { setLoading(false); return; }
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
    if (!client || !form.topic.trim()) return;
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;
    const payload = { topic: form.topic.trim(), category: form.category, status: form.status, priority: form.priority, source: form.source || null, resource_url: form.resourceUrl || null, note: form.note || null, personal_notes: form.personalNotes || null };
    if (editing) await client.from('learning_items').update(payload).eq('id', editing.id).eq('user_id', user.id);
    else await client.from('learning_items').insert({ ...payload, user_id: user.id });
    setShowModal(false); await load();
  };

  const remove = async (id: string) => { if (!client || !window.confirm('Delete this learning item?')) return; await client.from('learning_items').delete().eq('id', id); await load(); };
  const markLearned = async (item: LearningItem) => { if (!client) return; await client.from('learning_items').update({ status: 'Learned' }).eq('id', item.id); await load(); };

  const counts = { all: items.length, toLearn: items.filter(i => i.status === 'To Learn').length, learning: items.filter(i => i.status === 'Learning').length, learned: items.filter(i => i.status === 'Learned').length };

  return <div className="flex flex-col gap-5 w-full">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-2xl font-bold text-on-surface">Things to Learn</h1><p className="text-sm text-on-surface-variant">Save interesting tech topics now. Learn them when you have time.</p></div>
      <button onClick={openNew} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary"><Plus size={18}/> Add Topic</button>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {[['Saved', counts.all], ['To Learn', counts.toLearn], ['Learning', counts.learning], ['Learned', counts.learned]].map(([label, count]) => <button key={String(label)} onClick={() => setStatus(label === 'Saved' ? 'All' : label as any)} className="text-left rounded-2xl border border-surface-container bg-surface-container-lowest p-4 shadow-sm"><div className="text-xs text-on-surface-variant font-semibold">{label}</div><div className="text-xl font-extrabold text-on-surface mt-1">{count}</div></button>)}
    </div>

    <div className="flex flex-col sm:flex-row gap-2.5">
      <div className="relative flex-1"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search MCP, RAG, Vercel, Docker..." className="w-full rounded-xl border border-surface-container bg-surface-container-lowest py-3 pl-10 pr-4 text-sm outline-none"/></div>
      <select value={status} onChange={e => setStatus(e.target.value as any)} className="rounded-xl border border-surface-container bg-surface-container-lowest px-3 py-3 text-sm"><option>All</option><option>To Learn</option><option>Learning</option><option>Learned</option></select>
    </div>

    {loading ? <div className="rounded-2xl border border-surface-container bg-surface-container-lowest p-8 text-center text-sm text-on-surface-variant">Loading your learning list...</div> : filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-surface-container bg-surface-container-lowest p-10 text-center"><BookOpen className="mx-auto text-primary"/><p className="mt-2 font-semibold text-on-surface">Nothing saved yet</p><p className="text-sm text-on-surface-variant mt-1">Saw something interesting? Save it here before you forget.</p><button onClick={openNew} className="mt-4 text-sm font-bold text-primary">+ Add your first topic</button></div> : <div className="grid gap-3">{filtered.map(item => <div key={item.id} className="rounded-2xl border border-surface-container bg-surface-container-lowest p-4 shadow-sm"><div className="flex items-start gap-3"><div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><BookOpen size={19}/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2 items-center"><h3 className="font-bold text-on-surface">{item.topic}</h3><span className="text-[10px] rounded-full bg-surface-container-high px-2 py-1 font-bold text-on-surface-variant">{item.category}</span><span className={`text-[10px] rounded-full px-2 py-1 font-bold ${item.priority === 'High' ? 'bg-error-container text-on-error-container' : 'bg-primary/10 text-primary'}`}>{item.priority}</span></div>{item.note && <p className="mt-1 text-sm text-on-surface-variant">{item.note}</p>}<div className="mt-3 flex flex-wrap gap-2 text-xs text-on-surface-variant"><span className="inline-flex items-center gap-1"><Clock3 size={13}/>{item.status}</span>{item.source && <span>• {item.source}</span>}{item.resourceUrl && <a href={item.resourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary font-semibold">Open resource <ExternalLink size={12}/></a>}</div></div><div className="flex gap-1 shrink-0"><button onClick={() => markLearned(item)} title="Mark learned" className="rounded-lg p-2 hover:bg-primary/10 text-primary"><CheckCircle2 size={17}/></button><button onClick={() => openEdit(item)} title="Edit" className="rounded-lg p-2 hover:bg-surface-container-high"><Pencil size={17}/></button><button onClick={() => remove(item.id)} title="Delete" className="rounded-lg p-2 hover:bg-error-container/20 text-error"><Trash2 size={17}/></button></div></div></div>)}</div>}

    {showModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"><div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-surface-container-lowest p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 className="font-bold text-lg text-on-surface">{editing ? 'Edit Learning Topic' : 'Save Something to Learn'}</h2><button onClick={() => setShowModal(false)}><X/></button></div><div className="mt-4 space-y-3"><input autoFocus value={form.topic} onChange={e => setForm({...form, topic: e.target.value})} placeholder="e.g. MCP, RAG, Vercel AI SDK" className="w-full rounded-xl border border-surface-container px-3 py-2.5"/><div className="grid grid-cols-2 gap-3"><input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="Category" className="rounded-xl border border-surface-container px-3 py-2.5"/><select value={form.priority} onChange={e => setForm({...form, priority: e.target.value as any})} className="rounded-xl border border-surface-container px-3 py-2.5"><option>Low</option><option>Medium</option><option>High</option></select></div><select value={form.status} onChange={e => setForm({...form, status: e.target.value as any})} className="w-full rounded-xl border border-surface-container px-3 py-2.5"><option>To Learn</option><option>Learning</option><option>Learned</option></select><input value={form.source} onChange={e => setForm({...form, source: e.target.value})} placeholder="Source (Instagram, YouTube, etc.)" className="w-full rounded-xl border border-surface-container px-3 py-2.5"/><input value={form.resourceUrl} onChange={e => setForm({...form, resourceUrl: e.target.value})} placeholder="Resource URL (optional)" className="w-full rounded-xl border border-surface-container px-3 py-2.5"/><textarea value={form.note} onChange={e => setForm({...form, note: e.target.value})} placeholder="Why did you save this?" className="w-full min-h-20 rounded-xl border border-surface-container px-3 py-2.5"/><textarea value={form.personalNotes} onChange={e => setForm({...form, personalNotes: e.target.value})} placeholder="Your notes" className="w-full min-h-24 rounded-xl border border-surface-container px-3 py-2.5"/><button onClick={save} disabled={!form.topic.trim()} className="w-full rounded-xl bg-primary py-3 font-bold text-on-primary disabled:opacity-50">{editing ? 'Save Changes' : 'Save Topic'}</button></div></div></div>}
  </div>;
};