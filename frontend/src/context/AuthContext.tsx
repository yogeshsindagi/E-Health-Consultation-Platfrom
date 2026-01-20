import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

/* -------------------- Types -------------------- */

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: "patient" | "doctor" | "hospital-admin";
  specialization?: string;
  licenseNumber?: string;
  hospitalId?: string;
}

interface DecodedToken {
  user_id: string;
  role: string;
  name: string;
  exp: number;
}

interface User {
  id: string;
  role: string;
  name: string;
  walletAddress?: string;
}

interface AuthContextType {
  user: User | null;
  login: (
    data: LoginPayload,
    type?: "normal" | "hospital-admin" | "system-admin"
  ) => Promise<User>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => void;
  connectWallet: () => Promise<void>;
}

/* -------------------- Context -------------------- */
import { ethers } from "ethers";

const AuthContext = createContext<AuthContextType | null>(null);

/* -------------------- Provider -------------------- */

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode<DecodedToken>(token);
        // Check expiry if needed (optional)
        if (decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem("token");
          setUser(null);
        } else {
          // Ideally fetch full user profile to get walletAddress if token doesn't have it
          // For now, we leave it undefined until connectWallet or re-login if we updated token
          setUser({
            id: decoded.user_id,
            role: decoded.role,
            name: decoded.name,
          });
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        }
      } catch (error) {
        localStorage.removeItem("token");
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  /* -------- LOGIN -------- */

  const login = async (
    data: LoginPayload,
    type: "normal" | "hospital-admin" | "system-admin" = "normal"
  ): Promise<User> => {

    let url = "http://127.0.0.1:8000/login";

    if (type === "hospital-admin") {
      url = "http://127.0.0.1:8000/login/hospital-admin";
    }

    if (type === "system-admin") {
      url = "http://127.0.0.1:8000/login/system-admin";
    }

    const response = await axios.post(url, data);

    const token = response.data.access_token;
    const decoded = jwtDecode<DecodedToken>(token);

    const userData: User = {
      id: decoded.user_id,
      role: decoded.role,
      name: decoded.name,
      // If token has wallet_address include it, else fetch or leave empty
    };

    localStorage.setItem("token", token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    setUser(userData);
    return userData;
  };

  /* -------- REGISTER -------- */

  const register = async (data: RegisterPayload): Promise<void> => {
    let url = "http://127.0.0.1:8000/register/patient";

    if (data.role === "doctor") {
      url = "http://127.0.0.1:8000/register/doctor";
    }

    if (data.role === "hospital-admin") {
      url = "http://127.0.0.1:8000/register/hospital-admin";
    }

    await axios.post(url, data);
  };

  /* -------- CONNECT WALLET -------- */

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    if (!user) {
      alert("Please login first.");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      // Sign Message to prove ownership
      const message = `Connect to E-Health: ${user.id}`;
      const signature = await signer.signMessage(message);

      // Send to Backend
      await axios.post("http://127.0.0.1:8000/users/link-wallet", {
        walletAddress: address,
        signature: signature
      });

      // Update State
      setUser({ ...user, walletAddress: address });
      alert("Wallet Linked Successfully!");

    } catch (error) {
      console.error("Wallet connection failed:", error);
      alert("Failed to link wallet.");
    }
  };


  /* -------- LOGOUT -------- */

  const logout = () => {
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, connectWallet }}>
      {children}
    </AuthContext.Provider>
  );
};

/* -------------------- Hook -------------------- */

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
