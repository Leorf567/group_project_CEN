import { passwordStrength } from '../utils/validation';
import { CheckIcon } from './Icons';

const CHECK_LABELS = {
  length: '8+ characters',
  mixedCase: 'Upper & lowercase',
  number: 'A number',
  symbol: 'A symbol',
};

export default function PasswordStrength({ password }) {
  if (!password) return null;
  const { score, label, checks } = passwordStrength(password);

  return (
    <div className="strength" aria-live="polite">
      <div className="strength__bars">
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={`strength__bar ${n <= score ? `strength__bar--on s${score}` : ''}`} />
        ))}
        <span className={`strength__label s${score}`}>{label}</span>
      </div>
      <ul className="strength__checks">
        {Object.entries(CHECK_LABELS).map(([key, text]) => (
          <li key={key} className={checks[key] ? 'met' : ''}>
            <CheckIcon width={14} height={14} /> {text}
          </li>
        ))}
      </ul>
    </div>
  );
}
