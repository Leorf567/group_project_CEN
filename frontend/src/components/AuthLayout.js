import { BoardIcon, LogoMark, TargetIcon, UsersIcon } from './Icons';

const HIGHLIGHTS = [
  { icon: TargetIcon, title: 'Track your missions', text: 'Break big goals into projects and see how far you’ve come.' },
  { icon: BoardIcon, title: 'Kanban that keeps up', text: 'Drag work from To Do to Done with your collaborators.' },
  { icon: UsersIcon, title: 'Accountability built in', text: 'Friends see your progress — and cheer you on.' },
];

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <aside className="auth__showcase">
        <div className="auth__brand">
          <LogoMark /> <span>Momentum</span>
        </div>
        <div className="auth__pitch">
          <h2>Productivity is easier with people in your corner.</h2>
          <ul className="auth__highlights">
            {HIGHLIGHTS.map(({ icon: Icon, title: t, text }) => (
              <li key={t}>
                <span className="auth__highlight-icon"><Icon /></span>
                <div>
                  <strong>{t}</strong>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="auth__preview" aria-hidden="true">
          <div className="preview-card">
            <div className="preview-card__head">
              <span className="dot dot--violet" /> Capstone sprint
              <span className="preview-card__pct">68%</span>
            </div>
            <div className="progress"><span style={{ width: '68%' }} /></div>
            <div className="preview-card__avatars">
              <span>LR</span><span>JM</span><span>AK</span><span className="more">+2</span>
            </div>
          </div>
        </div>
        <div className="auth__glow" aria-hidden="true" />
      </aside>

      <main className="auth__panel">
        <div className="auth__card">
          <div className="auth__brand auth__brand--mobile">
            <LogoMark /> <span>Momentum</span>
          </div>
          <header className="auth__header">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </header>
          {children}
          {footer && <footer className="auth__footer">{footer}</footer>}
        </div>
      </main>
    </div>
  );
}
