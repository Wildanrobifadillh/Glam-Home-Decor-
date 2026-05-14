import loginPageBackground from "../../assets/images/login-background-3.png";
import loginCardBackground from "../../assets/images/login-background-3.png";
import logoGlamHd from "../../assets/images/logo-glam-hd.png";

function LoginPage() {
  return (
    <main
      className="lp2-page"
      style={{
        backgroundImage: `linear-gradient(
          rgba(21, 19, 15, 0.34),
          rgba(21, 19, 15, 0.34)
        ), url(${loginPageBackground})`,
      }}
    >
      <section className="lp2-shell">
        <div
          className="lp2-visual"
          style={{
            backgroundImage: `linear-gradient(
              rgba(21, 19, 15, 0.2),
              rgba(90, 38, 26, 0.22)
            ), url(${loginCardBackground})`,
          }}
        >
      </div>
        <div className="lp2-form-panel">
          <div className="lp2-language">
            <span>Indonesia</span>
            <strong>ID</strong>
          </div>

          <div className="lp2-logo-avatar">
            <img src={logoGlamHd} alt="Glam Home Decor" />
          </div>

          <div className="lp2-heading">
            <h1>Welcome Back!!</h1>
            <p>Sistem Informasi Glam Home Decor</p>
          </div>

          <form className="lp2-form">
            <div className="lp2-field">
              <label>Username</label>
              <input type="text" placeholder="Masukkan username" />
            </div>

            <div className="lp2-field">
              <label>Password</label>
              <input type="password" placeholder="Masukkan password" />
            </div>

            <label className="lp2-remember">
              <input type="checkbox" />
              <span>Ingat saya</span>
            </label>

            <button type="button" className="lp2-button">
              Masuk
            </button>
          </form>

          <p className="lp2-footer">© 2026 Glam Home Decor</p>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;