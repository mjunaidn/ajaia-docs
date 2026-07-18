import { useNavigate } from 'react-router-dom';
import { useSession } from '../App.jsx';

export default function Login() {
  const { users, login } = useSession();
  const navigate = useNavigate();

  function handlePick(id) {
    login(id);
    navigate('/docs');
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">M</span>
          <span className="brand-name">Marginalia</span>
        </div>
        <h1>Who's writing today?</h1>
        <p className="auth-sub">
          Pick a seeded account to continue. This project uses mocked auth on
          purpose — no passwords, see the README for why.
        </p>
        <div className="user-grid">
          {users.map((u) => (
            <button key={u.id} className="user-card" onClick={() => handlePick(u.id)}>
              <span className="avatar" style={{ background: u.color }}>
                {u.name.split(' ').map((n) => n[0]).join('')}
              </span>
              <span className="user-card-name">{u.name}</span>
              <span className="user-card-email">{u.email}</span>
            </button>
          ))}
          {users.length === 0 && (
            <p className="empty-note">
              No seeded users found. Run <code>npm run seed</code> in the server package.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
