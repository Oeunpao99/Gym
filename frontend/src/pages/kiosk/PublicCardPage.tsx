import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { getMemberByCode, listMembers } from '../../api/members'
import { StatusBadge } from '../../components/StatusBadge'
import type { Member } from '../../types'

export function PublicCardPage() {
  const [params] = useSearchParams()
  const code = params.get('code')
  const printMode = params.get('print') === 'true'
  const downloadMode = params.get('download') === 'png'

  const [members, setMembers] = useState<Member[]>([])
  const [member, setMember] = useState<Member | null>(null)
  const [selectedCode, setSelectedCode] = useState(code ?? '')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    listMembers().then(setMembers)
  }, [])

  useEffect(() => {
    async function load() {
      if (code) {
        setMember(await getMemberByCode(code))
      } else if (members.length > 0) {
        setMember(members[0])
        setSelectedCode(members[0].member_code)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, members])

  useEffect(() => {
    if (printMode && member) {
      const timer = setTimeout(() => window.print(), 500)
      return () => clearTimeout(timer)
    }
  }, [printMode, member])

  useEffect(() => {
    if (downloadMode && member) {
      renderCardToCanvas(member).then((dataUrl) => {
        const link = document.createElement('a')
        link.href = dataUrl
        link.download = `${member.member_code}.png`
        link.click()
      })
    }
  }, [downloadMode, member])

  async function handleSelect(newCode: string) {
    setSelectedCode(newCode)
    setMember(await getMemberByCode(newCode))
  }

  async function renderCardToCanvas(m: Member): Promise<string> {
    const canvas = canvasRef.current ?? document.createElement('canvas')
    canvas.width = 640
    canvas.height = 400
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 640, 400)
    gradient.addColorStop(0, '#1f2937')
    gradient.addColorStop(1, '#111827')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 640, 400)
    ctx.strokeStyle = '#d4af37'
    ctx.lineWidth = 4
    ctx.strokeRect(8, 8, 624, 384)
    ctx.fillStyle = '#f9fafb'
    ctx.font = 'bold 28px sans-serif'
    ctx.fillText(m.name, 40, 80)
    ctx.font = '18px sans-serif'
    ctx.fillText(`Code: ${m.member_code}`, 40, 120)
    ctx.fillText(`Plan: ${m.membership_type}`, 40, 150)
    ctx.fillText(`Expires: ${m.expiry_date}`, 40, 180)
    ctx.fillText(`Status: ${m.status}`, 40, 210)
    return canvas.toDataURL('image/png')
  }

  if (!member) return <p className="card-page-empty">Loading member card...</p>

  return (
    <div className={`card-page ${printMode ? 'print-mode' : ''}`}>
      {!printMode && !downloadMode && (
        <div className="card-toolbar">
          <select value={selectedCode} onChange={(e) => handleSelect(e.target.value)}>
            {members.map((m) => (
              <option key={m.id} value={m.member_code}>
                {m.name} ({m.member_code})
              </option>
            ))}
          </select>
          <button onClick={() => window.print()}>Print</button>
          <button onClick={() => renderCardToCanvas(member).then((url) => window.open(url))}>Download PNG</button>
        </div>
      )}
      <div className="membership-card">
        {member.photo_url && <img src={member.photo_url} alt={member.name} className="card-photo" />}
        <h2>{member.name}</h2>
        <p className="card-code">{member.member_code}</p>
        <p>{member.membership_type}</p>
        <p>Joined: {member.join_date}</p>
        <p>Expires: {member.expiry_date}</p>
        <p>{member.days_left} days left</p>
        <StatusBadge status={member.status} />
        <div className="card-qr">
          <QRCodeCanvas value={member.member_code} size={110} />
        </div>
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}
