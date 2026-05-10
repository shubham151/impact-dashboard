import { writable } from 'svelte/store'

function getRoute(): string {
  return location.pathname.slice(1) || 'home'
}

export const route = writable<string>(getRoute())

export function navigate(to: string): void {
  route.set(to)
  if (location.pathname !== '/' + to) {
    history.pushState(null, '', '/' + to)
  }
}

export function init(): void {
  history.replaceState(null, '', '/' + getRoute())
  window.addEventListener('popstate', () => {
    route.set(getRoute())
  })
}
