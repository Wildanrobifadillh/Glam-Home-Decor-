import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { authApi } from "./auth.api";
import { authStore } from "./auth.store";
import { getErrorMessage } from "../../utils/getErrorMessage";

import loginPageBackground from "../../assets/images/login-background-2.webp";
import loginCardBackground from "../../assets/images/login-background-7.webp";
import logoGlamHd from "../../assets/images/logo-glam-hd.png";

function LoginPage() {
  const [form, setForm] = useState({
  username: "",
  password: "",
});

const [isLoading, setIsLoading] = useState(false);
const [errorMessage, setErrorMessage] = useState("");
const [isPasswordVisible, setIsPasswordVisible] = useState(false);

const handleChange = (event) => {
  const { name, value } = event.target;

  setForm((currentForm) => ({
    ...currentForm,
    [name]: value,
  }));
};

const handleSubmit = async (event) => {
  event.preventDefault();

  setErrorMessage("");
  setIsLoading(true);

  try {
    const response = await authApi.login({
      username: form.username,
      password: form.password,
    });

    const responseData = response.data?.data || response.data;

    const token = responseData?.token || responseData?.accessToken;
    const user = responseData?.user || responseData?.userData || null;

    if (!token) {
      throw new Error("Token login tidak ditemukan dari server.");
    }

    authStore.setAuth({
      token,
      user,
    });

    window.location.href = "/dashboard";
  } catch (error) {
    setErrorMessage(getErrorMessage(error));
  } finally {
    setIsLoading(false);
  }
};

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

          <form className="lp2-form" onSubmit={handleSubmit}>
            <div className="lp2-field">
              <label>Username</label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="Masukkan username"
              />
            </div>

            <div className="lp2-field">
              <label>Password</label>

              <div className="lp2-password-wrap">
                <input
                  type={isPasswordVisible ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Masukkan password"
                />

                <button
                  type="button"
                  className="lp2-password-toggle"
                  onClick={() => setIsPasswordVisible((currentValue) => !currentValue)}
                  aria-label={
                    isPasswordVisible ? "Sembunyikan password" : "Tampilkan password"
                  }
                >
                  {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <label className="lp2-remember">
              <input type="checkbox" />
              <span>Ingat saya</span>
            </label>

            <p
              className={`lp2-error ${errorMessage ? "is-visible" : ""}`}
              aria-live="polite"
            >
              {errorMessage || " "}
            </p>

            <button type="submit" className="lp2-button" disabled={isLoading}>
              {isLoading ? "Memproses..." : "Masuk"}
            </button>
          </form>

          <p className="lp2-footer">© 2026 Glam Home Decor</p>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;