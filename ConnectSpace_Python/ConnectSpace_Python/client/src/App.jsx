import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { api, getToken } from './lib/api';
import AuthPage from './pages/AuthPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import MeetingRoom from './pages/MeetingRoom.jsx';
import { LoaderCircle } from 'lucide-react';
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
export default function App() {
 const [user,setUser] = useState(null); const [checking,setChecking] = useState(Boolean(getToken()));
 useEffect(()=>{ if(!getToken()){setChecking(false);return;} api('/auth/me').then(d=>setUser(d.user)).catch(()=>localStorage.removeItem('connectspace_token')).finally(()=>setChecking(false)); },[]);
 const logout=()=>{localStorage.removeItem('connectspace_token');setUser(null);};
 if(checking) return <div className="full-loader"><LoaderCircle className="spin" size={28}/> Checking your workspace…</div>;
 return <AuthContext.Provider value={{user,setUser,logout}}><Routes><Route path="/" element={user?<Dashboard/>:<Navigate to="/auth" replace/>}/><Route path="/auth" element={user?<Navigate to="/" replace/>:<AuthPage/>}/><Route path="/meeting/:code" element={user?<MeetingRoom/>:<Navigate to="/auth" replace/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></AuthContext.Provider>;
}
