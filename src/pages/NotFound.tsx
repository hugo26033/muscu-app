import { Link } from 'react-router';

export default function NotFound({ message = 'Page introuvable.' }: { message?: string }) {
  return (
    <div className="empty">
      <p>{message}</p>
      <Link to="/" className="btn">
        Retour à l'accueil
      </Link>
    </div>
  );
}
