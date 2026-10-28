import { useId, useState } from 'react';
import { EyeIcon, EyeOffIcon } from './Icons';

export default function FormField({
  label,
  icon: Icon,
  error,
  hint,
  type = 'text',
  trailing,
  ...inputProps
}) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === 'password';
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      <div className="field__label-row">
        <label htmlFor={id} className="field__label">{label}</label>
        {trailing}
      </div>
      <div className="field__control">
        {Icon && <Icon className="field__icon" />}
        <input
          id={id}
          type={isPassword && revealed ? 'text' : type}
          className={`field__input ${Icon ? 'field__input--icon' : ''} ${isPassword ? 'field__input--toggle' : ''}`}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            className="field__toggle"
            onClick={() => setRevealed((r) => !r)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
          >
            {revealed ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} className="field__error" role="alert">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="field__hint">{hint}</p>
      ) : null}
    </div>
  );
}
