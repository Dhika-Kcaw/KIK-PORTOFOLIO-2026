import { mount } from 'svelte'
import './app.css'

// Dashboard punya URL sendiri: /admin, /admin/projects, /admin/messages, …
// Museum tetap di /. Regex dipakai supaya /administrator tidak ikut dianggap admin.
const isAdmin = /^\/admin(?:\/|$)/.test(window.location.pathname)
const Root = isAdmin
  ? (await import('./admin/AdminApp.svelte')).default
  : (await import('./App.svelte')).default

if (isAdmin) document.title = 'Arsip NekoNeko · Dashboard'

const app = mount(Root, {
  target: document.getElementById('app'),
})

export default app
