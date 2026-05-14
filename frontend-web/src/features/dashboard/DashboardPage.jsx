import { authStore } from "../auth/auth.store";

function DashboardPage() {
  const user = authStore.getUser();

  const handleLogout = () => {
    authStore.logout();
    window.location.href = "/login";
  };

  return (
    <main style={{ minHeight: "100vh", padding: 40, background: "#F8F1E7" }}>
      <h1>Dashboard Glam Home Decor</h1>
      <p>Login berhasil.</p>

      {user ? (
        <div style={{ marginTop: 20 }}>
          <p>
            <strong>Nama:</strong> {user.name || "-"}
          </p>
          <p>
            <strong>Username:</strong> {user.username || "-"}
          </p>
          <p>
            <strong>Role:</strong> {user.role || "-"}
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleLogout}
        style={{
          marginTop: 24,
          padding: "12px 18px",
          borderRadius: 12,
          border: 0,
          background: "#C89B45",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Logout
      </button>
    </main>
  );
}

export default DashboardPage;