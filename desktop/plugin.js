/**
 * Made Shelf — everything Hermes made for you, one full page.
 *
 * Unified package: copy to $HERMES_HOME/desktop-plugins/made-shelf/.
 */

import {
  host,
  useQuery,
  useMutation,
  queryClient,
  ROUTES_AREA,
  SIDEBAR_NAV_AREA,
  STATUSBAR_AREAS,
} from '@hermes/plugin-sdk'
import { jsx, jsxs } from 'react/jsx-runtime'
import { useMemo, useState } from 'react'

const PAGE_PATH = '/made-shelf'

let stylesInjected = false
function ensureStyles() {
  if (stylesInjected || typeof document === 'undefined') return
  stylesInjected = true
  const el = document.createElement('style')
  el.setAttribute('data-made-shelf', '1')
  el.textContent = `
    @keyframes ms-fade-up {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .ms-page { animation: ms-fade-up 0.4s ease-out; }
    .ms-card { animation: ms-fade-up 0.35s ease-out both; }
    .ms-card:nth-child(1) { animation-delay: 0.03s; }
    .ms-card:nth-child(2) { animation-delay: 0.06s; }
    .ms-card:nth-child(3) { animation-delay: 0.09s; }
    .ms-btn:hover { filter: brightness(1.08); }
    .ms-btn:active { transform: translateY(1px); }
    .ms-btn:disabled { opacity: 0.45; cursor: wait; }
  `
  document.head.appendChild(el)
}

function useShelf(ctx, kind) {
  return useQuery({
    queryKey: ['made-shelf', 'shelf', kind],
    queryFn: () => ctx.rest(`/shelf?kind=${encodeURIComponent(kind || 'all')}`),
    refetchInterval: 4000,
  })
}

function formatWhen(iso) {
  const s = (iso || '').replace('T', ' ')
  return s.length >= 19 ? s.slice(0, 19) : s
}

function btnStyle(kind) {
  const base = {
    fontSize: 12,
    padding: '7px 12px',
    borderRadius: 7,
    cursor: 'pointer',
    fontWeight: 500,
    letterSpacing: '0.01em',
    transition: 'filter 0.12s ease, transform 0.08s ease',
  }
  if (kind === 'primary') {
    return {
      ...base,
      color: 'var(--ui-text-on-accent, var(--ui-text-primary))',
      background: 'var(--ui-accent)',
      border: '1px solid transparent',
    }
  }
  return {
    ...base,
    color: 'var(--ui-text-secondary)',
    background: 'transparent',
    border: '1px solid var(--ui-stroke-secondary)',
  }
}

function chipStyle(active) {
  return {
    fontSize: 12,
    padding: '5px 10px',
    borderRadius: 999,
    cursor: 'pointer',
    border: '1px solid var(--ui-stroke-secondary)',
    color: active ? 'var(--ui-text-primary)' : 'var(--ui-text-tertiary)',
    background: active
      ? 'color-mix(in srgb, var(--ui-accent) 14%, transparent)'
      : 'transparent',
    fontWeight: active ? 600 : 400,
  }
}

async function insertPath(item) {
  const text = item.path || item.name || ''
  if (!text) return
  // SDK composer verb (Hermes >= 0.21.5): resolves true when a mounted
  // composer took the text, false when none answers — then fall back to
  // the clipboard instead of guessing.
  if (await host.composer.insertText(null, text, { mode: 'block' })) {
    host.notify({ kind: 'info', message: 'Path inserted into the composer.' })
    return
  }
  if (host.os && typeof host.os.writeClipboard === 'function') {
    void host.os.writeClipboard(text)
  }
  host.notify({
    kind: 'info',
    message: 'No open composer — path copied to the clipboard.',
  })
}

function revealPath(item) {
  const path = item.path || ''
  if (!path) return
  if (host.os && typeof host.os.revealPath === 'function') {
    void host.os.revealPath(path).catch(() => {
      host.notify({ kind: 'info', message: 'Could not reveal that path.' })
    })
    return
  }
  host.notify({ kind: 'info', message: path })
}

function ItemCard({ item, onPin, onRemove, busy }) {
  return jsxs('article', {
    className: 'ms-card',
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      padding: '16px 16px 14px',
      marginBottom: 10,
      borderRadius: 10,
      border: '1px solid var(--ui-stroke-secondary)',
      background:
        'linear-gradient(135deg, color-mix(in srgb, var(--ui-accent) 5%, transparent) 0%, transparent 40%)',
      boxShadow: item.pinned ? 'inset 3px 0 0 0 var(--ui-accent)' : 'none',
    },
    children: [
      jsxs('div', {
        style: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
        children: [
          jsxs('div', {
            style: { minWidth: 0 },
            children: [
              jsxs('div', {
                style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
                children: [
                  jsx('span', {
                    style: {
                      fontWeight: 650,
                      fontSize: 14,
                      color: 'var(--ui-text-primary)',
                      wordBreak: 'break-all',
                    },
                    children: item.name || item.path,
                  }),
                  jsx('span', {
                    style: {
                      fontSize: 10,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      padding: '2px 7px',
                      borderRadius: 999,
                      border: '1px solid var(--ui-stroke-secondary)',
                      color: 'var(--ui-text-tertiary)',
                    },
                    children: item.kind || 'file',
                  }),
                  item.pinned
                    ? jsx('span', {
                        style: {
                          fontSize: 10,
                          color: 'var(--ui-accent)',
                          fontWeight: 600,
                        },
                        children: 'pinned',
                      })
                    : null,
                ],
              }),
              jsx('div', {
                style: {
                  fontSize: 11,
                  color: 'var(--ui-text-quaternary, var(--ui-text-tertiary))',
                  marginTop: 6,
                  wordBreak: 'break-all',
                },
                children: item.path,
              }),
              jsx('div', {
                style: {
                  fontSize: 11,
                  color: 'var(--ui-text-tertiary)',
                  marginTop: 4,
                },
                children: `${item.tool || '?'} · ${formatWhen(item.at)}`,
              }),
            ],
          }),
        ],
      }),
      item.summary
        ? jsx('div', {
            style: { fontSize: 12, lineHeight: 1.45, color: 'var(--ui-text-secondary)' },
            children: item.summary,
          })
        : null,
      jsxs('div', {
        style: { display: 'flex', flexWrap: 'wrap', gap: 8 },
        children: [
          jsx('button', {
            type: 'button',
            className: 'ms-btn',
            onClick: () => insertPath(item),
            style: btnStyle('primary'),
            children: 'Insert path',
          }),
          jsx('button', {
            type: 'button',
            className: 'ms-btn',
            onClick: () => revealPath(item),
            style: btnStyle('quiet'),
            children: 'Reveal',
          }),
          jsx('button', {
            type: 'button',
            className: 'ms-btn',
            disabled: busy,
            onClick: () => onPin(item),
            style: btnStyle('quiet'),
            children: item.pinned ? 'Unpin' : 'Pin',
          }),
          jsx('button', {
            type: 'button',
            className: 'ms-btn',
            disabled: busy,
            onClick: () => onRemove(item),
            style: { ...btnStyle('quiet'), opacity: 0.8 },
            children: 'Remove',
          }),
        ],
      }),
    ],
  })
}

function ShelfPage({ ctx }) {
  ensureStyles()
  const [kind, setKind] = useState('all')
  const query = useShelf(ctx, kind)
  const items = (query.data && query.data.items) || []
  const ordered = useMemo(() => {
    const pinned = items.filter((it) => it.pinned)
    const rest = items.filter((it) => !it.pinned)
    return [...pinned.reverse(), ...rest.reverse()]
  }, [items])

  const pinMut = useMutation({
    mutationFn: (body) => ctx.rest('/pin', { method: 'POST', body }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['made-shelf'] }),
  })
  const removeMut = useMutation({
    mutationFn: (body) => ctx.rest('/remove', { method: 'POST', body }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['made-shelf'] }),
  })
  const clearMut = useMutation({
    mutationFn: () => ctx.rest('/clear', { method: 'POST', body: { keep_pinned: true } }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['made-shelf'] }),
  })

  const busy = pinMut.isPending || removeMut.isPending

  return jsxs('div', {
    className: 'ms-page',
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'auto',
      padding: '36px 40px 64px',
      maxWidth: 780,
      margin: '0 auto',
      color: 'var(--ui-text-secondary)',
      boxSizing: 'border-box',
    },
    children: [
      jsxs('header', {
        children: [
          jsx('div', {
            style: {
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--ui-text-tertiary)',
              fontWeight: 600,
              marginBottom: 12,
            },
            children: 'Made Shelf',
          }),
          jsx('h1', {
            style: {
              margin: 0,
              fontSize: 'clamp(28px, 4vw, 36px)',
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              color: 'var(--ui-text-primary)',
            },
            children: 'Everything Hermes made.',
          }),
          jsx('p', {
            style: {
              margin: '12px 0 0',
              fontSize: 14,
              lineHeight: 1.55,
              maxWidth: 500,
              color: 'var(--ui-text-secondary)',
            },
            children:
              'Cross-session shelf of files the agent wrote or patched — pin keepers, insert paths, reveal on disk.',
          }),
        ],
      }),
      jsxs('div', {
        style: {
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginTop: 22,
          alignItems: 'center',
        },
        children: [
          ...['all', 'file', 'patch', 'image'].map((k) =>
            jsx(
              'button',
              {
                type: 'button',
                onClick: () => setKind(k),
                style: chipStyle(kind === k),
                children: k,
              },
              k,
            ),
          ),
          jsx('div', {
            style: { flex: 1 },
          }),
          jsx('div', {
            style: { fontSize: 12, color: 'var(--ui-text-tertiary)' },
            children: `${ordered.length} on shelf`,
          }),
          ordered.length
            ? jsx('button', {
                type: 'button',
                className: 'ms-btn',
                disabled: clearMut.isPending,
                onClick: () => clearMut.mutate(),
                style: btnStyle('quiet'),
                children: 'Clear unpinned',
              })
            : null,
        ],
      }),
      ordered.length
        ? jsx('div', {
            style: { marginTop: 18 },
            children: ordered.map((item) =>
              jsx(
                ItemCard,
                {
                  item,
                  busy,
                  onPin: (it) =>
                    pinMut.mutate({ id: it.id, pinned: !it.pinned }),
                  onRemove: (it) => removeMut.mutate({ id: it.id }),
                },
                item.id,
              ),
            ),
          })
        : jsxs('div', {
            style: {
              marginTop: 28,
              padding: '36px 28px',
              borderRadius: 12,
              border: '1px dashed var(--ui-stroke-secondary)',
              background:
                'radial-gradient(ellipse at 20% 0%, color-mix(in srgb, var(--ui-accent) 10%, transparent), transparent 55%)',
            },
            children: [
              jsx('div', {
                style: {
                  fontSize: 12,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--ui-text-tertiary)',
                  marginBottom: 10,
                },
                children: 'Empty shelf',
              }),
              jsx('div', {
                style: {
                  fontSize: 17,
                  fontWeight: 600,
                  color: 'var(--ui-text-primary)',
                  marginBottom: 8,
                },
                children: 'Nothing made yet.',
              }),
              jsx('div', {
                style: {
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: 'var(--ui-text-secondary)',
                  maxWidth: 440,
                },
                children:
                  'Ask Hermes to write or patch a file. When it does, the path lands here — across sessions.',
              }),
            ],
          }),
    ],
  })
}

function StatusChip({ ctx }) {
  ensureStyles()
  const query = useShelf(ctx, 'all')
  const count = (query.data && query.data.count) || 0
  const label = count ? `made ${count}` : 'made'
  return jsx('button', {
    type: 'button',
    title: 'Open Made Shelf',
    onClick: () => host.navigate(PAGE_PATH),
    style: {
      fontSize: 11,
      padding: '3px 9px',
      borderRadius: 999,
      border: '1px solid var(--ui-stroke-secondary)',
      background: count
        ? 'color-mix(in srgb, var(--ui-accent) 12%, transparent)'
        : 'transparent',
      color: count ? 'var(--ui-text-primary)' : 'var(--ui-text-tertiary)',
      cursor: 'pointer',
      fontWeight: count ? 650 : 400,
    },
    children: label,
  })
}

export default {
  id: 'made-shelf',
  name: 'Made Shelf',
  defaultEnabled: true,
  register(ctx) {
    ctx.registerMany([
      {
        id: 'page',
        area: ROUTES_AREA,
        data: { path: PAGE_PATH },
        render: () => jsx(ShelfPage, { ctx }),
      },
      {
        id: 'nav',
        area: SIDEBAR_NAV_AREA,
        order: 46,
        data: { path: PAGE_PATH, label: 'Made Shelf', codicon: 'archive' },
      },
      {
        id: 'chip',
        area: STATUSBAR_AREAS.right,
        order: 87,
        render: () => jsx(StatusChip, { ctx }),
      },
    ])
  },
}
