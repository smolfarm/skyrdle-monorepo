export type AppRoute =
  | { kind: 'daily' }
  | { kind: 'shared'; shareCode: string }
  | { kind: 'infinite' }

export function normalizeShareCode(shareCode: string) {
  return shareCode.trim().toLowerCase()
}

export function parseAppRoute(pathname: string): AppRoute {
  if (/^\/infinite\/?$/.test(pathname)) {
    return { kind: 'infinite' }
  }

  const match = pathname.match(/^\/shared\/([^/]+)\/?$/)
  if (match) {
    return {
      kind: 'shared',
      shareCode: normalizeShareCode(decodeURIComponent(match[1])),
    }
  }

  return { kind: 'daily' }
}

export function buildAppPath(route: AppRoute) {
  if (route.kind === 'infinite') {
    return '/infinite'
  }

  if (route.kind === 'shared') {
    return `/shared/${route.shareCode}`
  }

  return '/'
}
