import { useEffect, useRef, useState } from 'react';
import {
  Loader2,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { mentorApi } from '../api/client';
import { formatRelative } from '../utils/format';
import PageHeader from '../components/PageHeader';
import UpgradePrompt from '../components/UpgradePrompt';
import './Mentor.css';

function Mentor() {
  const [threads, setThreads] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [thread, setThread] = useState(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [suggestedActions, setSuggestedActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    let active = true;

    mentorApi
      .list()
      .then((response) => {
        if (!active) return;
        const loaded = response.data.threads || [];
        setThreads(loaded);
        if (loaded.length) setActiveId(loaded[0].id);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Unable to load conversations.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!activeId) {
      setThread(null);
      return undefined;
    }

    let active = true;
    mentorApi
      .get(activeId)
      .then((response) => {
        if (active) {
          setThread(response.data.thread);
          setSuggestedActions([]);
        }
      })
      .catch((err) => {
        if (active) setError(err.message || 'Unable to open that conversation.');
      });

    return () => {
      active = false;
    };
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [thread?.messages?.length, sending]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setCreating(true);
    setError('');

    try {
      const response = await mentorApi.create({
        title: title.trim() || 'Career mentor chat',
      });
      const created = response.data.thread;
      setThreads((current) => [created, ...current]);
      setActiveId(created.id);
      setTitle('');
    } catch (err) {
      setError(err.message || 'Unable to start a conversation.');
    } finally {
      setCreating(false);
    }
  };

  const handleSend = async (event) => {
    event.preventDefault();
    const content = message.trim();
    if (!content || !activeId || sending) return;

    setSending(true);
    setError('');
    setMessage('');

    const optimistic = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };

    setThread((current) =>
      current
        ? { ...current, messages: [...(current.messages || []), optimistic] }
        : current
    );

    try {
      const response = await mentorApi.send(activeId, content);
      const reply = response.data.message;
      setThread((current) =>
        current
          ? {
              ...current,
              messages: [
                ...(current.messages || []).filter(
                  (item) => item.id !== optimistic.id
                ),
                { ...optimistic, id: `user-${reply.id}` },
                reply,
              ],
            }
          : current
      );
      setSuggestedActions(response.data.suggested_actions || []);
      setThreads((current) =>
        current.map((item) =>
          item.id === activeId
            ? { ...item, updated_at: new Date().toISOString() }
            : item
        )
      );
    } catch (err) {
      setError(err.message || 'The mentor could not reply. Please try again.');
      setThread((current) =>
        current
          ? {
              ...current,
              messages: (current.messages || []).filter(
                (item) => item.id !== optimistic.id
              ),
            }
          : current
      );
      setMessage(content);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (threadId) => {
    if (!window.confirm('Delete this conversation?')) return;

    try {
      await mentorApi.remove(threadId);
      const remaining = threads.filter((item) => item.id !== threadId);
      setThreads(remaining);
      if (activeId === threadId) {
        setActiveId(remaining[0]?.id || null);
      }
    } catch (err) {
      setError(err.message || 'Unable to delete that conversation.');
    }
  };

  return (
    <div className="mentor">
      <PageHeader
        eyebrow="AI career mentor"
        icon={MessageCircle}
        title="Talk through your next move"
        description="A persistent coach that knows your profile, skills, goals, and progress."
      />

      <section className="section section--soft">
        <div className="container">
          <UpgradePrompt feature="mentor" />
          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          {loading ? (
            <div className="spinner" role="status" aria-label="Loading conversations" />
          ) : (
            <div className="mentor__layout">
              <aside className="card mentor__sidebar">
                <form className="mentor__new" onSubmit={handleCreate}>
                  <input
                    className="form-input"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="New conversation title"
                    aria-label="New conversation title"
                  />
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={creating}
                  >
                    <Plus size={15} /> New
                  </button>
                </form>

                <div className="mentor__threads">
                  {threads.length ? (
                    threads.map((item) => (
                      <div
                        key={item.id}
                        className={`mentor__thread ${
                          activeId === item.id ? 'mentor__thread--active' : ''
                        }`}
                      >
                        <button
                          type="button"
                          className="mentor__thread-open"
                          onClick={() => setActiveId(item.id)}
                        >
                          <strong>{item.title}</strong>
                          <small>{formatRelative(item.updated_at)}</small>
                        </button>
                        <button
                          type="button"
                          className="mentor__thread-delete"
                          onClick={() => handleDelete(item.id)}
                          aria-label={`Delete ${item.title}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="empty-state">Start your first conversation above.</p>
                  )}
                </div>
              </aside>

              <section className="card mentor__chat">
                {!thread && (
                  <div className="mentor__empty">
                    <Sparkles size={28} />
                    <h2>Your mentor is ready</h2>
                    <p>
                      Ask about career choices, applications, interviews, or what
                      to learn next.
                    </p>
                  </div>
                )}

                {thread && (
                  <>
                    <header className="mentor__chat-head">
                      <div>
                        <h2>{thread.title}</h2>
                        <p>{thread.messages?.length || 0} messages</p>
                      </div>
                    </header>

                    <div className="mentor__messages">
                      {(thread.messages || []).map((item) => (
                        <div
                          key={item.id}
                          className={`mentor__message mentor__message--${item.role}`}
                        >
                          <span className="mentor__role">
                            {item.role === 'user' ? 'You' : 'Mentor'}
                          </span>
                          <p>{item.content}</p>
                        </div>
                      ))}

                      {sending && (
                        <div className="mentor__message mentor__message--assistant">
                          <span className="mentor__role">Mentor</span>
                          <p className="mentor__typing">
                            <Loader2 size={16} className="mentor__spin" /> Thinking…
                          </p>
                        </div>
                      )}

                      <div ref={bottomRef} />
                    </div>

                    {suggestedActions.length > 0 && (
                      <div className="mentor__actions">
                        {suggestedActions.map((action) => (
                          <button
                            key={action}
                            type="button"
                            className="mentor__action"
                            onClick={() => setMessage(action)}
                          >
                            {action}
                          </button>
                        ))}
                      </div>
                    )}

                    <form className="mentor__composer" onSubmit={handleSend}>
                      <textarea
                        className="form-textarea"
                        rows={2}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder="Ask your mentor anything about your career…"
                        disabled={sending}
                      />
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={sending || !message.trim()}
                      >
                        <Send size={16} /> Send
                      </button>
                    </form>
                  </>
                )}
              </section>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default Mentor;
