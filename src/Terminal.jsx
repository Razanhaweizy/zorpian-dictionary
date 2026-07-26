import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import './Terminal.css';

const BANNER = [
  ' _     _____ _  _____ _____ _____ ____  __  __ ',
  '| |   | ____| |/ /_ _|_   _| ____|  _ \\|  \\/  |',
  '| |   |  _| | \' / | |  | | |  _| | |_) | |\\/| |',
  '| |___| |___| . \\ | |  | | | |___|  _ <| |  | |',
  '|_____|_____|_|\\_\\___| |_| |_____|_| \\_\\_|  |_|',
  '',
  'a dictionary terminal for a language that does not exist yet',
  'type `help` to see available commands',
];

const HELP_TEXT = [
  'lookup <word>          look up a word',
  'list [filter]          list all words, optionally filtered',
  'register <user> <pw>   create an account',
  'login <user> <pw>      log into your account',
  'unlock <password>      submit the editor password to gain edit perms',
  'add <word> : <meaning> [: <type>]   add a word (editors only)',
  'logout                 log out of your account',
  'clear                  clear the screen',
  'help                   show this list again',
];

export default function Terminal() {
  const [lines, setLines] = useState([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(null);
  const [session, setSession] = useState(() => {
    const saved = localStorage.getItem('lexiterm_session');
    return saved ? JSON.parse(saved) : null;
  });
  const [booted, setBooted] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // boot sequence: type out the banner line by line
  useEffect(() => {
    let cancelled = false;
    let i = 0;
    function typeNext() {
      if (cancelled || i >= BANNER.length) {
        setBooted(true);
        return;
      }
      setLines((prev) => [...prev, { text: BANNER[i], kind: 'boot' }]);
      i += 1;
      setTimeout(typeNext, i === 1 ? 120 : 90);
    }
    typeNext();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  useEffect(() => {
    if (booted) inputRef.current?.focus();
  }, [booted]);

  function print(text, kind = 'output') {
    setLines((prev) => [...prev, { text, kind }]);
  }

  function saveSession(next) {
    setSession(next);
    if (next) localStorage.setItem('lexiterm_session', JSON.stringify(next));
    else localStorage.removeItem('lexiterm_session');
  }

  async function runCommand(raw) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    print(`> ${trimmed}`, 'echo');

    const [cmd, ...rest] = trimmed.split(' ');
    const argStr = rest.join(' ');

    try {
      switch (cmd.toLowerCase()) {
        case 'help':
          HELP_TEXT.forEach((l) => print(l));
          break;

        case 'clear':
          setLines([]);
          break;

        case 'lookup':
        case 'look':
        case 'define': {
          if (!argStr) return print('usage: lookup <word>', 'error');
          const entry = await api.lookup(argStr);
          print(`${entry.word} (${entry.type})`, 'highlight');
          print(entry.meaning);
          break;
        }

        case 'list': {
          const results = await api.list(argStr);
          if (!results.length) return print('no entries found.', 'error');
          results.forEach((w) => print(`  ${w.word} — ${w.meaning}`));
          break;
        }

        case 'register': {
          const [username, password] = rest;
          if (!username || !password) return print('usage: register <username> <password>', 'error');
          const data = await api.register(username, password);
          print(data.message, 'highlight');
          break;
        }

        case 'login': {
          const [username, password] = rest;
          if (!username || !password) return print('usage: login <username> <password>', 'error');
          const data = await api.login(username, password);
          saveSession({ token: data.token, username, isEditor: data.isEditor });
          print(data.message, 'highlight');
          break;
        }

        case 'logout':
          saveSession(null);
          print('logged out.', 'highlight');
          break;

        case 'unlock': {
          if (!session) return print('you need to log in first.', 'error');
          if (!argStr) return print('usage: unlock <password>', 'error');
          const data = await api.unlock(argStr, session.token);
          saveSession({ ...session, isEditor: true });
          print(data.message, 'highlight');
          break;
        }

        case 'add': {
          if (!session) return print('you need to log in first.', 'error');
          if (!session.isEditor) return print('you need editor perms. try `unlock <password>`.', 'error');
          const [word, meaning, type] = argStr.split(':').map((s) => s?.trim());
          if (!word || !meaning) return print('usage: add <word> : <meaning> [: <type>]', 'error');
          const data = await api.addWord(word, meaning, type, session.token);
          print(data.message, 'highlight');
          break;
        }

        default:
          print(`unknown command: "${cmd}". type \`help\` for a list.`, 'error');
      }
    } catch (err) {
      print(err.message, 'error');
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      runCommand(input);
      setHistory((prev) => [...prev, input]);
      setHistoryIdx(null);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!history.length) return;
      const idx = historyIdx === null ? history.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(idx);
      setInput(history[idx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx === null) return;
      const idx = historyIdx + 1;
      if (idx >= history.length) {
        setHistoryIdx(null);
        setInput('');
      } else {
        setHistoryIdx(idx);
        setInput(history[idx]);
      }
    }
  }

  return (
    <div className="term-shell" onClick={() => inputRef.current?.focus()}>
      <div className="term-scanlines" aria-hidden="true" />
      <div className="term-vignette" aria-hidden="true" />
      <div className="term-window" ref={scrollRef}>
        {lines.map((l, i) => (
          <div key={i} className={`term-line term-${l.kind}`}>
            {l.text}
          </div>
        ))}
        {booted && (
          <div className="term-line term-prompt-row">
            <span className="term-prompt">
              {session ? `${session.username}${session.isEditor ? '#' : '$'}` : 'guest$'}
            </span>
            <input
              ref={inputRef}
              className="term-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              autoComplete="off"
              aria-label="terminal input"
            />
            <span className="term-cursor" aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  );
}
