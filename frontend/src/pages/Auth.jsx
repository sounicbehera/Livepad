import { useState } from "react";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>{isLogin ? "Sign In" : "Create Account"}</h2>

        <form style={styles.form}>
          {!isLogin && (
            <input
              type="text"
              placeholder="Full Name"
              style={styles.input}
            />
          )}

          <input
            type="email"
            placeholder="Email"
            style={styles.input}
          />

          <input
            type="password"
            placeholder="Password"
            style={styles.input}
          />

          <button style={styles.button}>
            {isLogin ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <p style={{ marginTop: 10 }}>
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <span
            style={styles.link}
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? " Sign Up" : " Sign In"}
          </span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#0f172a",
  },
  card: {
    background: "#1e293b",
    padding: 30,
    borderRadius: 12,
    width: 350,
    color: "white",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  input: {
    padding: 10,
    borderRadius: 6,
    border: "none",
  },
  button: {
    padding: 12,
    borderRadius: 6,
    border: "none",
    background: "#6366f1",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
  },
  link: {
    color: "#818cf8",
    cursor: "pointer",
    marginLeft: 5,
  },
};