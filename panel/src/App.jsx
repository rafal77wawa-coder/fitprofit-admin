import { useAuth } from './AuthContext.jsx';
import Login from './pages/Login.jsx';
import Shell from './components/Shell.jsx';
import { T } from './theme.js';

export default function App() {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.grey, fontSize: 14 }}>
        Wczytywanie panelu…
      </div>
    );
  }

  return user ? <Shell /> : <Login />;
}
