import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

export default function ProtectedRoute({ children }) {
 const [session,setSession]=useState(undefined)
 useEffect(()=>{ if(!isSupabaseConfigured){setSession(null);return} supabase.auth.getSession().then(({data})=>setSession(data.session)); const {data}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s)); return()=>data.subscription.unsubscribe() },[])
 if(session===undefined) return <div className="page-loader"><span className="spinner"/>กำลังเข้าสู่ระบบ…</div>
 return session ? children : <Navigate to="/login" replace />
}
