import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
export default function AdminRoute({children}){
 const [allowed,setAllowed]=useState(isSupabaseConfigured?undefined:true)
 useEffect(()=>{if(!isSupabaseConfigured)return;(async()=>{const {data:{session}}=await supabase.auth.getSession();if(!session){setAllowed(false);return}const {data}=await supabase.from('profiles').select('role').eq('id',session.user.id).single();setAllowed(['teacher','admin'].includes(data?.role))})()},[])
 if(allowed===undefined)return <div className="page-loader"><span className="spinner"/>กำลังตรวจสอบสิทธิ์…</div>
 return allowed?children:<Navigate to="/student/dashboard" replace/>
}
