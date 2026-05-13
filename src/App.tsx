import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FileTypeIcon, MonsterBat, MonsterMimic, MonsterSlime } from './rpgIcons'
import { fileItemKind } from './rpgFileKinds'
import calicoCat from './assets/calico_cat.png'
import greyCat from './assets/grey_cat.png'
import shihTzu from './assets/shih_tzu.png'
import './App.css'

const SAVE_KEY = 'download-dungeon-save-v2'

type DungeonScanRow = { name: string; isDirectory: boolean; ext: string; size: number; mtimeMs: number }
type DungeonScanResult = { root: string; items: DungeonScanRow[] }
type DungeonAnalyzeResult = {
  root: string
  duplicateGroups: { name: string; size: number; count: number; files: string[] }[]
  recommendations: { name: string; size: number; atimeMs: number; score: number; reasons: string[] }[]
  scannedFileCount: number
}

type Achievement = {
  id: string
  icon: string
  name: string
  desc: string
  check: (p: Persisted) => boolean
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_kill', icon: '⚔️', name: '첫 처치', desc: '파일 1개 삭제', check: p => p.deletedFiles >= 1 },
  { id: 'cleaner', icon: '🧹', name: '청소왕', desc: '파일 10개 정리', check: p => p.organizedFiles >= 10 },
  { id: 'hunter', icon: '👾', name: '복제 사냥꾼', desc: '중복 10개 제거', check: p => p.deletedFiles >= 10 },
  { id: 'explorer', icon: '🗺️', name: '탐험가', desc: '던전 5회 탐색', check: p => p.scans >= 5 },
  { id: 'lv10', icon: '💎', name: 'LV 10 달성', desc: '레벨 10 도달', check: p => levelProgress(p.totalXp).level >= 10 },
  { id: 'streak3', icon: '🔥', name: '연속 3일', desc: '3일 연속 정리', check: p => p.streakDays >= 3 },
  { id: 'dungeon_clear', icon: '💀', name: '던전 클리어', desc: '파일 0개 달성', check: p => p.lastScanFileCount === 0 && p.scans > 0 },
  { id: 'big_haul', icon: '🏆', name: '대청소', desc: '한번에 5개 삭제', check: p => p.maxSingleDelete >= 5 },
]

type Persisted = {
  totalXp: number
  scans: number
  organizes: number
  deletedFiles: number
  organizedFiles: number
  streakDays: number
  lastActivityDate: string
  lastScanFileCount: number
  maxSingleDelete: number
  unlockedAchievements: string[]
  totalBytesFreed: number
  fileTypeCounts: Record<string, number>
}

function defaultPersisted(): Persisted {
  return {
    totalXp: 0, scans: 0, organizes: 0, deletedFiles: 0, organizedFiles: 0,
    streakDays: 0, lastActivityDate: '', lastScanFileCount: -1, maxSingleDelete: 0,
    unlockedAchievements: [], totalBytesFreed: 0, fileTypeCounts: {},
  }
}

function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return defaultPersisted()
    return { ...defaultPersisted(), ...JSON.parse(raw) }
  } catch { return defaultPersisted() }
}

function xpToNext(level: number): number { return Math.max(40, Math.floor(45 + level * 28)) }

function levelProgress(totalXp: number): { level: number; into: number; need: number } {
  let level = 1; let into = totalXp
  for (;;) { const need = xpToNext(level); if (into < need) return { level, into, need }; into -= need; level++ }
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  const u = ['KB', 'MB', 'GB', 'TB']; let v = n / 1024; let i = 0
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++ }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${u[i]}`
}

function idleDays(atimeMs: number): number {
  return Math.floor((Date.now() - atimeMs) / (24 * 60 * 60 * 1000))
}

type Toast = { id: number; type: 'danger' | 'warn' | 'success'; title: string; meta: string }

function App() {
  const api = typeof window !== 'undefined' ? window.dungeon : undefined
  const [persist, setPersist] = useState<Persisted>(() => loadPersisted())
  const [log, setLog] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [scanResult, setScanResult] = useState<DungeonScanResult | null>(null)
  const [analyzeResult, setAnalyzeResult] = useState<DungeonAnalyzeResult | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [levelUp, setLevelUp] = useState<number | null>(null)
  const [checkedRecs, setCheckedRecs] = useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([])
  const toastIdRef = useRef(0)
  const prevXpRef = useRef(persist.totalXp)

  useEffect(() => { localStorage.setItem(SAVE_KEY, JSON.stringify(persist)) }, [persist])

  const prog = useMemo(() => levelProgress(persist.totalXp), [persist.totalXp])

  useEffect(() => {
    const before = levelProgress(prevXpRef.current).level
    const after = levelProgress(persist.totalXp).level
    if (after > before) setLevelUp(after)
    prevXpRef.current = persist.totalXp
  }, [persist.totalXp])

  useEffect(() => {
    if (levelUp === null) return
    const t = window.setTimeout(() => setLevelUp(null), 3200)
    return () => window.clearTimeout(t)
  }, [levelUp])

  const pushToast = useCallback((type: Toast['type'], title: string, meta: string) => {
    const id = ++toastIdRef.current
    setToasts(prev => [...prev.slice(-3), { id, type, title, meta }])
    window.setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000)
  }, [])

  const dismissToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id))

  const checkAchievements = useCallback((p: Persisted) => {
    const newOnes = ACHIEVEMENTS.filter(a => !p.unlockedAchievements.includes(a.id) && a.check(p))
    if (newOnes.length > 0) {
      setNewAchievements(prev => [...prev, ...newOnes])
      newOnes.forEach(a => pushToast('success', `업적 달성! ${a.icon} ${a.name}`, a.desc))
      return { ...p, unlockedAchievements: [...p.unlockedAchievements, ...newOnes.map(a => a.id)] }
    }
    return p
  }, [pushToast])

  useEffect(() => {
    if (newAchievements.length === 0) return
    const t = window.setTimeout(() => setNewAchievements([]), 4000)
    return () => window.clearTimeout(t)
  }, [newAchievements])

  const pushLog = useCallback((line: string) => {
    setLog(prev => [line, ...prev].slice(0, 12))
  }, [])

  const fileRows = useMemo(() => scanResult ? scanResult.items.filter(i => !i.isDirectory) : [], [scanResult])
  const dirCount = useMemo(() => scanResult ? scanResult.items.filter(i => i.isDirectory).length : 0, [scanResult])

  const handleScan = async () => {
    if (!api) { setErr('Electron 앱으로 실행하면 다운로드 폴더를 탐색할 수 있어요.'); return }
    setErr(null); setBusy(true)
    try {
      const res = await api.scanDownloads()
      setScanResult(res)
      const files = res.items.filter(i => !i.isDirectory)
      const scanXp = Math.min(24, 3 + files.length)
      setPersist(p => {
        const updated = { ...p, totalXp: p.totalXp + scanXp, scans: p.scans + 1, lastScanFileCount: files.length }
        // 30일+ 미접근 파일 알림
        const oldFiles = files.filter(f => idleDays(f.mtimeMs) >= 30)
        if (oldFiles.length > 0) pushToast('warn', `${oldFiles.length}개 파일이 30일 이상 방치됨`, '분석 탭에서 확인하고 처치하세요')
        return checkAchievements(updated)
      })
      pushLog(`탐색 완료 · 루트 파일 ${files.length}개 · +${scanXp} XP`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '스캔에 실패했어요.')
    } finally { setBusy(false) }
  }

  const handleOrganize = async () => {
    if (!api) { setErr('Electron에서만 정리 마법을 쓸 수 있어요.'); return }
    setErr(null); setBusy(true)
    try {
      const res = await api.organizeDownloads()
      let xp = res.moved * 18
      if (res.moved > 0) xp += 10
      else if (res.failed.length > 0) xp += 4
      setPersist(p => {
        const updated = { ...p, totalXp: p.totalXp + xp, organizes: p.organizes + 1, organizedFiles: p.organizedFiles + res.moved }
        return checkAchievements(updated)
      })
      if (res.moved > 0) { pushLog(`정리 성공 · ${res.moved}개 이동 · +${xp} XP`); pushToast('success', `${res.moved}개 아이템 정리 완료!`, `+${xp} XP 획득`) }
      else pushLog(`이동할 루트 파일이 없어요.`)
      if (res.failed.length) pushLog(`잠금/권한으로 실패: ${res.failed.slice(0, 5).join(', ')}`)
      const refreshed = await api.scanDownloads()
      setScanResult(refreshed)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '정리에 실패했어요.')
    } finally { setBusy(false) }
  }

  const handleAnalyze = async () => {
    if (!api) { setErr('Electron에서만 중복/추천 분석을 실행할 수 있어요.'); return }
    setErr(null); setBusy(true); setCheckedRecs(new Set())
    try {
      const res = await api.analyzeDownloads()
      setAnalyzeResult(res)
      const gain = Math.min(44, 8 + res.duplicateGroups.length * 4 + res.recommendations.length)
      setPersist(p => checkAchievements({ ...p, totalXp: p.totalXp + gain }))
      pushLog(`탐지 완료 · 중복 ${res.duplicateGroups.length}무리 · 추천 ${res.recommendations.length}개 · +${gain} XP`)
      if (res.duplicateGroups.length > 0) pushToast('warn', `중복 파일 ${res.duplicateGroups.length}무리 발견!`, '복제 몬스터를 처치하세요')
      if (res.recommendations.length > 0) {
        const danger = res.recommendations.filter(r => r.score >= 80)
        if (danger.length > 0) pushToast('danger', `위험도 높은 파일 ${danger.length}개!`, danger.map(r => r.name).slice(0, 2).join(', '))
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : '분석에 실패했어요.')
    } finally { setBusy(false) }
  }

  const toggleRec = (name: string) => {
    setCheckedRecs(prev => { const next = new Set(prev); if (next.has(name)) next.delete(name); else next.add(name); return next })
  }

  const toggleAllRecs = () => {
    if (!analyzeResult) return
    const all = analyzeResult.recommendations.map(r => r.name)
    if (checkedRecs.size === all.length) setCheckedRecs(new Set())
    else setCheckedRecs(new Set(all))
  }

  const handleDeleteSelected = async () => {
    if (!api || checkedRecs.size === 0) return
    setConfirmOpen(false); setBusy(true); setErr(null)
    try {
      const recMap = new Map(analyzeResult?.recommendations.map(r => [r.name, r]) ?? [])
      const totalBytes = [...checkedRecs].reduce((sum, name) => sum + (recMap.get(name)?.size ?? 0), 0)
      const res = await api.deleteFiles([...checkedRecs])
      const xp = res.deleted * 20
      setPersist(p => {
        const updated = {
          ...p, totalXp: p.totalXp + xp,
          deletedFiles: p.deletedFiles + res.deleted,
          maxSingleDelete: Math.max(p.maxSingleDelete, res.deleted),
          totalBytesFreed: p.totalBytesFreed + totalBytes,
        }
        return checkAchievements(updated)
      })
      pushLog(`처치 완료 · ${res.deleted}개 삭제 · +${xp} XP`)
      pushToast('success', `${res.deleted}개 파일 처치 완료!`, `${formatBytes(totalBytes)} 확보 · +${xp} XP`)
      if (res.failed.length) pushLog(`삭제 실패: ${res.failed.slice(0, 3).join(', ')}`)
      setCheckedRecs(new Set())
      const refreshed = await api.analyzeDownloads()
      setAnalyzeResult(refreshed)
      const refreshedScan = await api.scanDownloads()
      setScanResult(refreshedScan)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '삭제에 실패했어요.')
    } finally { setBusy(false) }
  }

  const electronOnly = !api
  const barPct = Math.min(100, (prog.into / prog.need) * 100)
  const unlockedCount = persist.unlockedAchievements.length

  // 파일 타입별 통계 (스캔 결과 기반)
  const fileTypeStats = useMemo(() => {
    if (!scanResult) return []
    const counts: Record<string, number> = {}
    scanResult.items.filter(i => !i.isDirectory).forEach(f => {
      const ext = f.ext.replace('.', '').toLowerCase() || 'other'
      const cat = ['png','jpg','jpeg','gif','webp','heic'].includes(ext) ? '이미지'
        : ['pdf','doc','docx','xls','xlsx','ppt','pptx','txt'].includes(ext) ? '문서'
        : ['zip','rar','7z','tar','gz'].includes(ext) ? '압축'
        : ['mp4','mkv','mov','avi'].includes(ext) ? '영상'
        : ['mp3','wav','flac','aac'].includes(ext) ? '오디오'
        : '기타'
      counts[cat] = (counts[cat] ?? 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [scanResult])

  const maxFileType = fileTypeStats[0]?.[1] ?? 1

  return (
    <div className="dungeon dungeon--rpg">
      {/* 토스트 알림 */}
      <div className="dungeon__toastWrap" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`dungeon__toast dungeon__toast--${t.type}`}>
            <span className="dungeon__toastIcon">
              {t.type === 'danger' ? '⚠️' : t.type === 'warn' ? '🕐' : '✅'}
            </span>
            <div className="dungeon__toastBody">
              <p className="dungeon__toastTitle">{t.title}</p>
              <p className="dungeon__toastMeta">{t.meta}</p>
            </div>
            <button type="button" className="dungeon__toastClose" onClick={() => dismissToast(t.id)} aria-label="닫기">✕</button>
          </div>
        ))}
      </div>

      {/* 삭제 확인 팝업 */}
      {confirmOpen && (
        <div className="dungeon__confirmOverlay" role="dialog" aria-modal="true">
          <div className="dungeon__confirmBox">
            <p className="dungeon__confirmTitle">⚔️ 선택 파일을 처치할까요?</p>
            <p className="dungeon__confirmSub">{checkedRecs.size}개 파일이 영구 삭제됩니다. 복구할 수 없어요!</p>
            <ul className="dungeon__confirmList">
              {[...checkedRecs].slice(0, 5).map(name => <li key={name}>{name}</li>)}
              {checkedRecs.size > 5 && <li>외 {checkedRecs.size - 5}개...</li>}
            </ul>
            <div className="dungeon__confirmBtns">
              <button type="button" className="dungeon__btn primary" onClick={handleDeleteSelected}>처치 확인</button>
              <button type="button" className="dungeon__btn" onClick={() => setConfirmOpen(false)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {levelUp !== null && (
        <div className="levelUpOverlay" role="dialog" aria-modal="true" aria-label="레벨 업">
          <div className="levelUpOverlay__flash" aria-hidden />
          <div className="levelUpCard">
            <p className="levelUpCard__pre">던전 정복도 상승</p>
            <p className="levelUpCard__title pixelFont-large">LEVEL UP!</p>
            <p className="levelUpCard__lv pixelFont-medium">LV {levelUp}</p>
            <div className="levelUpCard__gems" aria-hidden><span /><span /><span /></div>
          </div>
        </div>
      )}

      <div className="dungeon__vignette" aria-hidden />

      <header className="dungeon__hero">
        <div className="dungeon__heroCharacters" aria-label="캐릭터 파티">
          <figure className="dungeon__heroCharacter"><img src={greyCat} alt="회색 고양이 캐릭터" /></figure>
          <figure className="dungeon__heroCharacter"><img src={calicoCat} alt="삼색 고양이 캐릭터" /></figure>
          <figure className="dungeon__heroCharacter"><img src={shihTzu} alt="시추 캐릭터" /></figure>
        </div>
        <p className="dungeon__badge pixelFont-pill">offline · local only</p>
        <h1 className="dungeon__title pixelFont">Download Dungeon RPG</h1>
        <p className="dungeon__subtitle">
          아무렇게나 쌓여가는 다운로드 던전, 아이템(파일)을 정리하면 경험치가 쌓입니다. 모든 이름·경로는 이 창 안에서만 처리됩니다. 외부로 절대 나가지 않아요.
        </p>
      </header>

      {electronOnly && (
        <aside className="dungeon__warn" role="status">
          <MonsterMimic className="dungeon__warnIcon" />
          <span className="dungeon__warnText">개발 서버만 켠 상태라면 <code>npm run dev</code>로 Electron 창을 띄워 주세요.</span>
        </aside>
      )}

      {/* 상태 */}
      <section className="dungeon__frame dungeon__status" aria-label="캐릭터 상태">
        <div className="dungeon__frameInner">
          <div className="dungeon__levelRow">
            <span className="dungeon__lv pixelFont-medium">LV {prog.level}</span>
            <span className={`dungeon__xpnums ${prog.into >= prog.need * 0.92 ? 'dungeon__xpnums--pulse' : ''}`}>
              <span className="dungeon__xpLabel">EXP</span>{' '}
              <span className="dungeon__xpfrac">{prog.into}/{prog.need}</span>
            </span>
          </div>
          <div className="dungeon__bar" role="progressbar" aria-valuemin={0} aria-valuemax={prog.need} aria-valuenow={prog.into}>
            <div className="dungeon__barBack" aria-hidden />
            <div className="dungeon__barChunks" aria-hidden>
              {Array.from({ length: 18 }, (_, i) => (
                <span key={i} className={`dungeon__barChunk ${barPct > (i / 18) * 100 ? 'on' : ''}`} />
              ))}
            </div>
          </div>
          <p className="dungeon__stats">
            <span className="dungeon__pill">전체 경험치<strong>{persist.totalXp}</strong></span>
            <span className="dungeon__pill">탐색<strong>{persist.scans}</strong></span>
            <span className="dungeon__pill">정복<strong>{persist.organizes}</strong></span>
            <span className="dungeon__pill">처치<strong>{persist.deletedFiles}</strong></span>
            <span className="dungeon__pill">확보<strong>{formatBytes(persist.totalBytesFreed)}</strong></span>
          </p>
        </div>
      </section>

      {/* 버튼 */}
      <section className="dungeon__actions" aria-label="행동">
  <button type="button" className="dungeon__btn primary" disabled={busy} onClick={handleScan}>
    <MonsterBat className="dungeon__btnIcon" />
    <span className="dungeon__btnText" style={{ color: '#f4fff4', WebkitTextFillColor: '#f4fff4', opacity: 1, fontFamily: 'Malgun Gothic, sans-serif' }}>
      다운로드 던전 탐색{busy ? ' (처리 중)' : ''}
    </span>
  </button>
  <button type="button" className="dungeon__btn dungeon__btn--violet" disabled={busy || !scanResult} onClick={handleAnalyze}>
    <MonsterMimic className="dungeon__btnIcon" />
    <span className="dungeon__btnText" style={{ color: '#f1e9ff', WebkitTextFillColor: '#f1e9ff', opacity: 1, fontFamily: 'Malgun Gothic, sans-serif' }}>
      {!scanResult ? '🔒 탐색 후 분석 가능' : `파일분석${busy ? ' (처리 중)' : ''}`}
    </span>
  </button>
  <button type="button" className="dungeon__btn" disabled={busy || !analyzeResult} onClick={handleOrganize}>
    <MonsterSlime className="dungeon__btnIcon" />
    <span className="dungeon__btnText" style={{ color: '#fff7ff', WebkitTextFillColor: '#fff7ff', opacity: 1, fontFamily: 'Malgun Gothic, sans-serif' }}>
      {!analyzeResult ? '🔒 분석 후 정리 가능' : `파일정리${busy ? ' (처리 중)' : ''}`}
    </span>
  </button>
</section>

      {err && <p className="dungeon__err" role="alert">{err}</p>}

      {/* 업적 */}
      <section className="dungeon__frame dungeon__panel" aria-label="업적">
        <div className="dungeon__frameInner">
          <h2 className="dungeon__h2">업적 · {unlockedCount}/{ACHIEVEMENTS.length}</h2>
          <div className="dungeon__achievements">
            {ACHIEVEMENTS.map(a => {
              const unlocked = persist.unlockedAchievements.includes(a.id)
              const isNew = newAchievements.some(n => n.id === a.id)
              return (
                <div key={a.id} className={`dungeon__ach ${unlocked ? 'dungeon__ach--unlocked' : 'dungeon__ach--locked'} ${isNew ? 'dungeon__ach--new' : ''}`}>
                  <span className="dungeon__achIcon">{a.icon}</span>
                  <div className="dungeon__achInfo">
                    <p className="dungeon__achName">{a.name}</p>
                    <p className="dungeon__achDesc">{a.desc}</p>
                    {unlocked && <span className="dungeon__achBadge">달성!</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 통계 */}
      {scanResult && (
        <section className="dungeon__frame dungeon__panel" aria-label="통계">
          <div className="dungeon__frameInner">
            <h2 className="dungeon__h2">던전 통계</h2>
            <div className="dungeon__statsGrid">
              <div className="dungeon__statCard"><p className="dungeon__statVal">{formatBytes(persist.totalBytesFreed)}</p><p className="dungeon__statLabel">총 확보 용량</p></div>
              <div className="dungeon__statCard"><p className="dungeon__statVal">{persist.deletedFiles}</p><p className="dungeon__statLabel">처치한 파일</p></div>
              <div className="dungeon__statCard"><p className="dungeon__statVal">{persist.organizedFiles}</p><p className="dungeon__statLabel">정리한 파일</p></div>
              <div className="dungeon__statCard"><p className="dungeon__statVal">LV {prog.level}</p><p className="dungeon__statLabel">현재 레벨</p></div>
            </div>
            {fileTypeStats.length > 0 && (
              <div className="dungeon__barChart">
                <p className="dungeon__h3" style={{ marginBottom: '0.6rem' }}>파일 타입 분포</p>
                {fileTypeStats.map(([cat, count]) => (
                  <div key={cat} className="dungeon__barRow">
                    <span className="dungeon__barLabel">{cat}</span>
                    <div className="dungeon__barTrack">
                      <div className="dungeon__barFill" style={{ width: `${(count / maxFileType) * 100}%` }} />
                    </div>
                    <span className="dungeon__barNum">{count}개</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 스캔 결과 */}
      <section className="dungeon__frame dungeon__panel" aria-label="스캔 결과">
        <div className="dungeon__frameInner">
          <h2 className="dungeon__h2">맵 스캔 로그</h2>
          {!scanResult && <p className="dungeon__muted">아직 던전을 밝히지 않았습니다.</p>}
          {scanResult && (
            <>
              <p className="dungeon__path" title={scanResult.root}>
                <span className="dungeon__pathLabel">거점</span>
                <code>{scanResult.root}</code>
              </p>
              <p className="dungeon__summary">
                발견한 전리품(파일) <strong>{fileRows.length}</strong> · 구역(폴더) <strong>{dirCount}</strong> · 보관함 <code>DungeonSorted</code>
              </p>
              <div className="dungeon__tableWrap">
                <table className="dungeon__table">
                  <thead>
                    <tr>
                      <th className="colIcon" aria-hidden> </th>
                      <th>전리품</th><th>표식</th><th>무게</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanResult.items.map((row: DungeonScanRow) => {
                      const kind = fileItemKind(row.ext, row.isDirectory)
                      const idle = idleDays(row.mtimeMs)
                      return (
                        <tr key={row.name} className={idle >= 30 && !row.isDirectory ? 'dungeon__rowStale' : ''}>
                          <td className="colIcon"><FileTypeIcon kind={kind} className="dungeon__rowIcon" /></td>
                          <td className="dungeon__cellName">
                            {row.name}
                            {idle >= 30 && !row.isDirectory && <span className="dungeon__idleTag">{idle}일 방치</span>}
                          </td>
                          <td><span className="dungeon__typeTag">{row.isDirectory ? '구역' : (row.ext || '???')}</span></td>
                          <td>{row.isDirectory ? '—' : formatBytes(row.size)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>

      {/* 모험 일지 */}
      <section className="dungeon__frame dungeon__panel dungeon__panel--log" aria-label="모험 일지">
        <div className="dungeon__frameInner">
          <h2 className="dungeon__h2">모험 일지</h2>
          {log.length === 0
            ? <p className="dungeon__muted">기록된 이야기가 없습니다.</p>
            : <ul className="dungeon__log">{log.map((line, i) => <li key={`${i}-${line}`}><span className="dungeon__logBullet" aria-hidden />{line}</li>)}</ul>}
        </div>
      </section>

      {/* 중복/AI 추천 */}
      <section className="dungeon__frame dungeon__panel dungeon__panel--insight" aria-label="중복 탐지 및 AI 추천">
        <div className="dungeon__frameInner">
          <h2 className="dungeon__h2">중복 탐지 · AI 추천(로컬)</h2>
          {!analyzeResult && <p className="dungeon__muted">아직 분석 기록이 없습니다.</p>}
          {analyzeResult && (
            <>
              <p className="dungeon__summary">
                스캔 파일 <strong>{analyzeResult.scannedFileCount}</strong>개 · 중복 <strong>{analyzeResult.duplicateGroups.length}</strong>무리 · 추천 <strong>{analyzeResult.recommendations.length}</strong>개
              </p>
              <div className="dungeon__insightGrid">
                <div className="dungeon__insightCard">
                  <h3 className="dungeon__h3">복제 몬스터(파일명+용량)</h3>
                  {analyzeResult.duplicateGroups.length === 0
                    ? <p className="dungeon__muted">중복이 보이지 않습니다.</p>
                    : <ul className="dungeon__threatList">
                        {analyzeResult.duplicateGroups.slice(0, 8).map(g => (
                          <li key={`${g.name}-${g.size}`}>
                            <span className="dungeon__threatTitle">{g.name}</span>
                            <span className="dungeon__threatMeta">{g.count}회 · {formatBytes(g.size)}</span>
                          </li>
                        ))}
                      </ul>}
                </div>
                <div className="dungeon__insightCard">
                  <h3 className="dungeon__h3">AI 휴리스틱 추천(외부 API 없음)</h3>
                  {analyzeResult.recommendations.length === 0
                    ? <p className="dungeon__muted">지금은 추천 대상이 없습니다.</p>
                    : <>
                        <div className="dungeon__recHeader">
                          <label className="dungeon__checkAll">
                            <input type="checkbox" checked={checkedRecs.size === analyzeResult.recommendations.length} onChange={toggleAllRecs} />
                            전체 선택
                          </label>
                          {checkedRecs.size > 0 && (
                            <button type="button" className="dungeon__btn dungeon__btn--danger dungeon__btn--sm" onClick={() => setConfirmOpen(true)} disabled={busy}>
                              ⚔️ 선택 {checkedRecs.size}개 처치
                            </button>
                          )}
                        </div>
                        <ul className="dungeon__threatList">
                          {analyzeResult.recommendations.slice(0, 10).map(item => (
                            <li key={`${item.name}-${item.atimeMs}`} className={checkedRecs.has(item.name) ? 'dungeon__threatItem--checked' : ''}>
                              <label className="dungeon__threatCheck">
                                <input type="checkbox" checked={checkedRecs.has(item.name)} onChange={() => toggleRec(item.name)} />
                                <span className="dungeon__threatTitle">
                                  {item.name}{' '}
                                  <span className={`dungeon__scoreBadge ${item.score >= 80 ? 'dungeon__scoreBadge--danger' : ''}`}>위험도 {item.score}</span>
                                </span>
                              </label>
                              <span className="dungeon__threatMeta">
                                {formatBytes(item.size)} · {idleDays(item.atimeMs)}일 미접근 · {item.reasons.join(', ')}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </>}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <footer className="dungeon__foot">
        <p>규칙: 다운로드<strong>폴더 맨 위</strong>의 파일만{' '}<code>DungeonSorted/</code>분류 저장고로 이동합니다. 네트워크 호출 없음 · 파일 내용 미전송.</p>
      </footer>
    </div>
  )
}

export default App