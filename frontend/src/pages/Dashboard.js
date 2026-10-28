import { BoardIcon, TargetIcon, UsersIcon } from '../components/Icons';
import { useAuth } from '../context/AuthContext';

// Placeholder home screen; the Kanban board (#7) and social features land here.
const UPCOMING = [
  { icon: TargetIcon, title: 'Projects & goals', text: 'Create projects, set goals and invite collaborators.' },
  { icon: BoardIcon, title: 'Kanban board', text: 'Move tasks across To Do, In Progress and Done.' },
  { icon: UsersIcon, title: 'Friends', text: 'Follow friends and see how far they’ve come.' },
];

export default function Dashboard() {
  const { user, justRegistered } = useAuth();
  const firstName = user.name.split(' ')[0];

  return (
    <div className="page">
      <section className="hero">
        <p className="eyebrow">{justRegistered ? 'Account created' : 'Dashboard'}</p>
        <h1>{justRegistered ? `Welcome aboard, ${firstName}!` : `Good to see you, ${firstName}.`}</h1>
        <p className="muted">Here’s what’s coming to your workspace.</p>
      </section>

      <section className="card-grid">
        {UPCOMING.map(({ icon: Icon, title, text }) => (
          <article key={title} className="card card--feature">
            <span className="card__icon"><Icon /></span>
            <h3>{title}</h3>
            <p className="muted">{text}</p>
            <span className="tag">Coming soon</span>
          </article>
        ))}
      </section>
    </div>
  );
}
