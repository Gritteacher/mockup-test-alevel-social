import { useEffect, useState } from 'react'
import { Ticket, Star, Gift, PlusCircle, MinusCircle } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

export default function Quota() {
  const [wallet, setWallet] = useState({ mock_quota: 0, practice_points: 0 })
  const [tx, setTx] = useState([])
  useEffect(() => {
    if (!isSupabaseConfigured) return
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const [w, t] = await Promise.all([supabase.from('quota_wallets').select('*').eq('user_id', session.user.id).single(), supabase.from('quota_transactions').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false })])
      if (w.data) setWallet(w.data)
      if (t.data) setTx(t.data)
    })()
  }, [])
  return <div className="page quota-page"><div className="page-heading"><div><h1>โควตาของฉัน</h1><p>สิทธิ์การทำข้อสอบของคุณ</p></div></div><div className="wallet-grid"><div className="wallet-card indigo"><div><span>Mock Quota</span><b>{wallet.mock_quota}</b></div><Ticket /></div><div className="wallet-card points"><div><span>Practice Points</span><b>{wallet.practice_points}</b></div><Star /></div></div><section className="quota-earn"><h2>วิธีรับโควตาเพิ่ม</h2><div><Star /><span>สะสม 100 Practice Points = +1 โควตา</span></div><div><Gift /><span>รับโควตาเพิ่มจากคุณครู</span></div></section><section className="quota-history"><h2>ประวัติโควตา</h2>{tx.length === 0 ? <div className="empty-state">ยังไม่มีประวัติโควตา</div> : tx.map(x => <div className="transaction" key={x.id}><time>{new Date(x.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}</time><div><b>{x.note || x.type}</b></div><strong className={x.amount > 0 ? 'good' : 'bad'}>{x.amount > 0 ? <PlusCircle /> : <MinusCircle />}{x.amount > 0 ? '+' : ''}{x.amount}</strong></div>)}</section></div>
}
