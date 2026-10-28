import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="full-page-center not-found">
      <p className="eyebrow">404</p>
      <h1>This page wandered off.</h1>
      <Link to="/" className="btn btn--primary">Take me home</Link>
    </div>
  );
}
