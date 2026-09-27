import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Role } from "./mock-data";

type Ctx = { role: Role; setRole: (r: Role) => void; name: string };
const RoleCtx = createContext<Ctx>({ role: "student", setRole: () => {}, name: "Aarav" });

const NAMES: Record<Role, string> = {
  guest: "Guest",
  student: "Aarav Sharma",
  faculty: "Dr. Aruna Sharma",
  admin: "Platform Admin",
};

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("student");
  useEffect(() => {
    const stored = (typeof window !== "undefined" &&
      localStorage.getItem("vlabs-role")) as Role | null;
    if (stored) setRoleState(stored);
  }, []);
  const setRole = (r: Role) => {
    setRoleState(r);
    if (typeof window !== "undefined") localStorage.setItem("vlabs-role", r);
  };
  return (
    <RoleCtx.Provider value={{ role, setRole, name: NAMES[role] }}>{children}</RoleCtx.Provider>
  );
}

export const useRole = () => useContext(RoleCtx);
