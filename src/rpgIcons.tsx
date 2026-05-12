import type { ReactNode } from 'react'

import type { FileItemKind } from './rpgFileKinds'

type IconProps = {
  className?: string
  title?: string
}

function wrap(className: string | undefined, node: ReactNode) {
  return (
    <span className={className ? `rpgIconWrap ${className}` : 'rpgIconWrap'}>
      {node}
    </span>
  )
}

const crisp = { shapeRendering: 'crispEdges' as const }

/** 슬라임 — 정리 대상(루트 파일) */
export function MonsterSlime({ className, title }: IconProps) {
  return wrap(className, (
    <svg
      width={32}
      height={32}
      viewBox="0 0 16 16"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      {...(title ? { 'aria-label': title } : {})}
      style={crisp}
      className="rpgIcon"
    >
      {title ? <title>{title}</title> : null}
      <rect x="3" y="9" width="10" height="5" fill="#3d6f4a" />
      <rect x="2" y="8" width="12" height="2" fill="#52a064" />
      <rect x="4" y="6" width="8" height="3" fill="#5ec278" />
      <rect x="5" y="5" width="2" height="2" fill="#1a3d24" />
      <rect x="9" y="5" width="2" height="2" fill="#1a3d24" />
      <rect x="5" y="6" width="1" height="1" fill="#8ff0a8" />
      <rect x="10" y="6" width="1" height="1" fill="#8ff0a8" />
    </svg>
  ))
}

/** 박쥐 — 던전 탐색 */
export function MonsterBat({ className, title }: IconProps) {
  return wrap(className, (
    <svg
      width={32}
      height={32}
      viewBox="0 0 16 16"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      {...(title ? { 'aria-label': title } : {})}
      style={crisp}
      className="rpgIcon"
    >
      {title ? <title>{title}</title> : null}
      <rect x="6" y="6" width="4" height="5" fill="#3a3548" />
      <rect x="5" y="7" width="2" height="2" fill="#2a2535" />
      <rect x="9" y="7" width="2" height="2" fill="#2a2535" />
      <rect x="1" y="8" width="5" height="2" fill="#4a4360" />
      <rect x="10" y="8" width="5" height="2" fill="#4a4360" />
      <rect x="6" y="4" width="1" height="2" fill="#c9a44a" />
      <rect x="9" y="4" width="1" height="2" fill="#c9a44a" />
      <rect x="7" y="9" width="1" height="1" fill="#e8d080" />
      <rect x="8" y="9" width="1" height="1" fill="#e8d080" />
    </svg>
  ))
}

/** 미믹 상자 — 다운로드 함정 */
export function MonsterMimic({ className, title }: IconProps) {
  return wrap(className, (
    <svg
      width={32}
      height={32}
      viewBox="0 0 16 16"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      {...(title ? { 'aria-label': title } : {})}
      style={crisp}
      className="rpgIcon"
    >
      {title ? <title>{title}</title> : null}
      <rect x="3" y="6" width="10" height="8" fill="#6b4a2a" />
      <rect x="3" y="5" width="10" height="2" fill="#8b6238" />
      <rect x="7" y="7" width="2" height="2" fill="#2a1a0e" />
      <rect x="4" y="10" width="8" height="2" fill="#4a3018" />
      <rect x="2" y="8" width="2" height="1" fill="#c9a44a" />
      <rect x="12" y="8" width="2" height="1" fill="#c9a44a" />
      <rect x="5" y="12" width="2" height="1" fill="#f0e0c8" />
      <rect x="9" y="12" width="2" height="1" fill="#f0e0c8" />
    </svg>
  ))
}

function itemSvg(children: ReactNode, label?: string) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 12 12"
      style={crisp}
      className="rpgIcon rpgIcon--item"
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      {...(label ? { 'aria-label': label } : {})}
    >
      {label ? <title>{label}</title> : null}
      {children}
    </svg>
  )
}

export function IconFolder({ className }: IconProps) {
  return wrap(className, itemSvg((
    <>
      <rect x="1" y="3" width="10" height="8" fill="#6a5a42" />
      <rect x="1" y="2" width="5" height="2" fill="#8a7858" />
      <rect x="2" y="5" width="8" height="5" fill="#4a3d2e" />
    </>
  ), '폴더'))
}

export function IconImageGem({ className }: IconProps) {
  return wrap(className, itemSvg((
    <>
      <rect x="5" y="1" width="2" height="2" fill="#7ec8ff" />
      <rect x="3" y="3" width="6" height="4" fill="#3a9cdd" />
      <rect x="4" y="7" width="4" height="3" fill="#1e6aa8" />
      <rect x="5" y="9" width="2" height="1" fill="#a8e8ff" />
    </>
  ), '이미지'))
}

export function IconScroll({ className }: IconProps) {
  return wrap(className, itemSvg((
    <>
      <rect x="3" y="1" width="6" height="10" fill="#d8c8a8" />
      <rect x="4" y="2" width="4" height="8" fill="#f0e8d0" />
      <rect x="4" y="3" width="4" height="1" fill="#6a5840" />
      <rect x="4" y="5" width="3" height="1" fill="#a09078" />
      <rect x="4" y="7" width="4" height="1" fill="#a09078" />
    </>
  ), '문서'))
}

export function IconChest({ className }: IconProps) {
  return wrap(className, itemSvg((
    <>
      <rect x="2" y="4" width="8" height="6" fill="#6b4a2a" />
      <rect x="2" y="3" width="8" height="2" fill="#8b6238" />
      <rect x="5" y="5" width="2" height="2" fill="#2a1a0e" />
    </>
  ), '압축'))
}

export function IconCrystalVideo({ className }: IconProps) {
  return wrap(className, itemSvg((
    <>
      <rect x="1" y="3" width="10" height="7" fill="#2a1a3a" />
      <rect x="2" y="4" width="8" height="5" fill="#5a3a78" />
      <rect x="3" y="5" width="2" height="2" fill="#c87aff" />
      <rect x="6" y="5" width="3" height="1" fill="#e8c0ff" />
    </>
  ), '영상'))
}

export function IconNoteAudio({ className }: IconProps) {
  return wrap(className, itemSvg((
    <>
      <rect x="2" y="1" width="2" height="9" fill="#3a3a48" />
      <rect x="4" y="2" width="5" height="2" fill="#6a8aff" />
      <rect x="4" y="5" width="5" height="2" fill="#6a8aff" />
      <rect x="4" y="8" width="5" height="2" fill="#6a8aff" />
    </>
  ), '오디오'))
}

export function IconRuneCode({ className }: IconProps) {
  return wrap(className, itemSvg((
    <>
      <rect x="1" y="1" width="10" height="10" fill="#1a2430" />
      <rect x="2" y="2" width="2" height="2" fill="#5ee8a8" />
      <rect x="6" y="2" width="2" height="2" fill="#5ee8a8" />
      <rect x="4" y="5" width="4" height="1" fill="#e8a85e" />
      <rect x="3" y="8" width="6" height="1" fill="#5ec8e8" />
    </>
  ), '코드'))
}

export function IconOrbOther({ className }: IconProps) {
  return wrap(className, itemSvg((
    <>
      <rect x="4" y="2" width="4" height="8" fill="#4a5060" />
      <rect x="3" y="3" width="6" height="6" fill="#6a7088" />
      <rect x="5" y="4" width="2" height="3" fill="#a8b8e8" />
    </>
  ), '기타'))
}

export function FileTypeIcon({ kind, className }: { kind: FileItemKind, className?: string }) {
  switch (kind) {
    case 'folder': return <IconFolder className={className} />
    case 'image': return <IconImageGem className={className} />
    case 'doc': return <IconScroll className={className} />
    case 'archive': return <IconChest className={className} />
    case 'video': return <IconCrystalVideo className={className} />
    case 'audio': return <IconNoteAudio className={className} />
    case 'code': return <IconRuneCode className={className} />
    default: return <IconOrbOther className={className} />
  }
}
