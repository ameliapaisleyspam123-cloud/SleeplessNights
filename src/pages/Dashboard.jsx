import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export default function Dashboard() {

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div className="dashboard">
      <h1>The Grimoire</h1>
      <p>Your D&D campaign hub</p>

      <div className="campaign-card">
        <h2>Sleepless Nights</h2>
        <p>Dungeon Master</p>
      </div>

      <button onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}
