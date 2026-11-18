<script>
  import { onDestroy, onMount } from 'svelte'
  import { fade, fly } from 'svelte/transition'
  import {
    CERTIFICATE_CATEGORIES,
    EXPERIENCE_TYPES,
    POST_STATUSES,
    PROFILE_FIELDS,
    RESOURCES,
    SKILL_CATEGORIES,
    TESTIMONIAL_TYPES,
  } from '../../shared/content-schema.js'
  import { api } from './api.js'
  import AdminField from './AdminField.svelte'
  import AdminLogin from './AdminLogin.svelte'
  import ModelUploader from './ModelUploader.svelte'
  import './admin.css'

  const NAV_GROUPS = [
    {
      label: 'Museum',
      items: [
        { key: 'overview', label: 'Ringkasan', seal: '堂' },
        { key: 'profile', label: 'Profil & About', seal: '我' },
      ],
    },
    {
      label: 'Koleksi',
      items: Object.entries(RESOURCES).map(([key, config]) => ({
        key,
        label: config.label,
        seal: config.seal,
      })),
    },
    {
      label: 'Interaksi',
      items: [{ key: 'messages', label: 'Pesan Masuk', seal: '信' }],
    },
  ]

  const PROFILE_GROUPS = [
    {
      title: 'Identitas',
      fields: ['name', 'headline', 'class_name', 'competence', 'avatar_url'],
    },
    {
      title: 'Beranda',
      fields: ['hero_tagline', 'bio', 'location', 'availability'],
    },
    {
      title: 'Kontak & CV',
      fields: ['email', 'github', 'instagram', 'linkedin', 'cv_url'],
    },
    {
      title: 'Tentang Saya',
      fields: ['education', 'interests', 'organizations', 'plk', 'career_goal'],
    },
  ]

  const SELECT_LABELS = new Map(
    [
      ...SKILL_CATEGORIES,
      ...CERTIFICATE_CATEGORIES,
      ...EXPERIENCE_TYPES,
      ...TESTIMONIAL_TYPES,
      ...POST_STATUSES,
    ].map((option) => [option.value, option.label]),
  )

  let checking = $state(true)
  let admin = $state(null)
  let section = $state('overview')
  let loading = $state(false)
  let error = $state('')
  let notice = $state('')

  let overview = $state(null)
  let items = $state([])
  let messages = $state([])
  // Nama proyek untuk kolom “Proyek” di tabel umpan balik: daftar proyek
  // dimuat sekali, kalau gagal tabelnya tetap jalan dengan nomor ID.
  let projectTitles = $state(new Map())
  let profile = $state({})
  // Penanda data sudah pernah termuat. Tanpa penanda ini, bagian Profil tampil
  // sebagai form kosong selama permintaan berjalan sehingga terlihat seperti
  // halaman tidak terbuka (dan nilai baru muncul beberapa saat kemudian).
  let profileReady = $state(false)
  let messagesReady = $state(false)
  let search = $state('')
  let messageFilter = $state('all')
  let queueFilter = $state('all')
  let mobileNav = $state(false)

  let editor = $state(null)
  let form = $state({})
  let saving = $state(false)
  let savingProfile = $state(false)
  // Hapus data tidak lagi memakai confirm() bawaan browser: tombol berubah
  // menjadi konfirmasi di bar bawah supaya tidak ada dialog sistem yang
  // terblokir di ponsel dan tidak ada klik tidak sengaja.
  let pendingDelete = $state(null)
  let closeHint = $state('')
  let bootError = $state('')
  let timers = {}
  let modalEl = $state(null)
  let confirmEl = $state(null)
  // Pratinjau 3D dimuat terpisah: three.js + MMDLoader (±600 kB) tidak ikut
  // masuk bundel dashboard kecuali admin benar-benar membuka pratinjau.
  let previewItem = $state(null)
  let PreviewComponent = $state(null)

  const config = $derived(RESOURCES[section] ?? null)
  const sectionMeta = $derived(
    NAV_GROUPS.flatMap((group) => group.items).find((item) => item.key === section) ?? {
      label: 'Dashboard',
      seal: '往',
    },
  )
  const unreadCount = $derived(Number(overview?.counts?.messagesUnread ?? 0))
  // Testimoni dan umpan balik proyek adalah kiriman pengunjung: keduanya baru
  // tampil setelah admin menyetujui, jadi jumlah antreannya ditonjolkan.
  const pendingTestimonials = $derived(Number(overview?.counts?.testimonialsPending ?? 0))
  const pendingFeedback = $derived(Number(overview?.counts?.feedbackPending ?? 0))
  const pendingInSection = $derived(
    section === 'feedback' ? pendingFeedback : section === 'testimonials' ? pendingTestimonials : 0,
  )
  // Model yang benar-benar dipakai museum. Sumbernya respons overview, jadi
  // pengunggah model bisa menampilkan "sedang dipakai" tanpa permintaan tambahan.
  const activeModel = $derived(overview?.activeModel ?? null)

  // Pencarian mengikuti skema: setiap field teks/daftar ikut dicari, sehingga
  // isi testimoni (quote), ringkasan proyek, atau poin pengalaman juga ketemu.
  const searchFields = $derived(
    (config?.fields ?? []).filter((field) =>
      ['text', 'textarea', 'select', 'list', 'number'].includes(field.type),
    ),
  )

  // Bagian yang punya kolom `approved` memakai penyaring antrean moderasi
  // (Semua / Menunggu / Ditampilkan). Dipakai testimoni dan umpan balik proyek.
  const moderatable = $derived(
    Boolean(config?.fields?.some((field) => field.name === 'approved')),
  )

  const filteredItems = $derived.by(() => {
    const query = search.trim().toLowerCase()
    const scoped =
      !moderatable || queueFilter === 'all'
        ? items
        : queueFilter === 'pending'
          ? items.filter((item) => !item.approved)
          : items.filter((item) => item.approved)
    if (!query) return scoped
    return scoped.filter((item) =>
      searchFields
        .map((field) => {
          const value = item[field.name]
          if (Array.isArray(value)) return value.join(' ')
          return value === null || value === undefined ? '' : String(value)
        })
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  })

  const queueCounts = $derived.by(() => {
    const pending = items.filter((item) => !item.approved).length
    return { all: items.length, pending, approved: items.length - pending }
  })

  const queueTabs = $derived([
    ['all', `Semua (${queueCounts.all})`],
    ['pending', `Menunggu (${queueCounts.pending})`],
    ['approved', `Ditampilkan (${queueCounts.approved})`],
  ])

  const dirty = $derived(editor ? JSON.stringify(form) !== editor.snapshot : false)

  const todayLabel = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const countsSummary = $derived.by(() => {
    const counts = overview?.counts
    if (!counts) return 'Memuat hitungan arsip…'
    return `${counts.projects} proyek (${counts.projectsPublished} tampil), ${counts.certificates} sertifikat, ${counts.testimonials} testimoni disetujui, ${counts.posts} catatan.`
  })

  const actionQueue = $derived.by(() => {
    const counts = overview?.counts
    if (!counts) return []
    const queue = []
    if (counts.testimonialsPending) {
      queue.push({
        key: 'testimonials',
        seal: '言',
        label: `${counts.testimonialsPending} testimoni menunggu persetujuan`,
        note: 'Belum tampil di museum — tidak sebagai pin di papan, tidak sebagai pengunjung.',
      })
    }
    if (counts.feedbackPending) {
      queue.push({
        key: 'feedback',
        seal: '評',
        label: `${counts.feedbackPending} umpan balik proyek menunggu persetujuan`,
        note: 'Belum tampil di detail proyek mana pun sampai kamu setujui.',
      })
    }
    if (counts.messagesUnread) {
      queue.push({
        key: 'messages',
        seal: '信',
        label: `${counts.messagesUnread} pesan belum dibaca`,
        note: 'Pesan kontak bersifat privat dan tidak pernah tampil di museum.',
      })
    }
    const drafts = Number(counts.projects ?? 0) - Number(counts.projectsPublished ?? 0)
    if (drafts > 0) {
      queue.push({
        key: 'projects',
        seal: '作',
        label: `${drafts} proyek masih draf`,
        note: 'Draf tidak dipasang sebagai bingkai di galeri museum.',
      })
    }
    return queue
  })

  const filteredMessages = $derived.by(() => {
    if (messageFilter === 'unread') return messages.filter((item) => !item.read_at)
    return messages
  })

  const overviewCards = $derived.by(() => {
    const counts = overview?.counts
    const projects = Number(counts?.projects ?? 0)
    const published = Number(counts?.projectsPublished ?? 0)
    return [
      {
        key: 'projects',
        label: 'Proyek',
        value: projects,
        note: `${published} tampil · ${projects - published} draf`,
        seal: '作',
      },
      {
        key: 'certificates',
        label: 'Sertifikat',
        value: Number(counts?.certificates ?? 0),
        note: 'Dipajang di dinding museum',
        seal: '證',
      },
      {
        key: 'testimonials',
        label: 'Testimoni',
        value: Number(counts?.testimonials ?? 0),
        note: `${Number(counts?.testimonialsPending ?? 0)} menunggu persetujuan`,
        seal: '言',
      },
      {
        key: 'feedback',
        label: 'Umpan balik',
        value: Number(counts?.feedback ?? 0),
        note: `${Number(counts?.feedbackPending ?? 0)} menunggu persetujuan`,
        seal: '評',
      },
      {
        key: 'posts',
        label: 'Catatan',
        value: Number(counts?.posts ?? 0),
        note: 'Meja baca catatan ngoding',
        seal: '記',
      },
      {
        key: 'messages',
        label: 'Pesan',
        value: Number(counts?.messages ?? 0),
        note: `${unreadCount} belum dibaca`,
        seal: '信',
      },
    ]
  })

  // ---------------------------------------------------------------- rute
  // Dashboard memakai URL sungguhan (/admin/projects), bukan hash
  // (/admin#projects). Vite dan server sama-sama menyajikan index.html untuk
  // path tanpa ekstensi, jadi refresh di /admin/messages tetap membuka
  // bagian yang sama.
  const SECTION_KEYS = new Set(['overview', 'profile', 'messages', ...Object.keys(RESOURCES)])

  function pathFor(key) {
    return key === 'overview' ? '/admin' : `/admin/${key}`
  }

  function pathSection() {
    const segments = window.location.pathname.split('/').filter(Boolean)
    if (segments[0] !== 'admin') return null
    if (segments.length === 1) return 'overview'
    const key = (segments[1] ?? '').toLowerCase()
    return SECTION_KEYS.has(key) ? key : 'overview'
  }

  function isCanonicalPath(key) {
    return window.location.pathname.replace(/\/$/, '') === pathFor(key)
  }

  function syncPath(key, { push = true } = {}) {
    if (isCanonicalPath(key)) return
    const url = pathFor(key)
    try {
      if (push) history.pushState({ section: key }, '', url)
      else history.replaceState({ section: key }, '', url)
    } catch {
      // Sebagian browser/iframe membatasi History API. Navigasi di dalam
      // dashboard harus tetap jalan walau URL tidak bisa diubah.
    }
  }

  onMount(async () => {
    // Hanya pemeriksaan sesi yang menahan layar "Membuka arsip…". Begitu sesi
    // diketahui, dashboard langsung tampil dan data bagiannya dimuat di dalam;
    // permintaan data yang lambat tidak boleh menyandera layar pemuatan
    // (dulu `await loadSection('overview')` membuat refresh di /admin/profile
    // bisa berhenti di layar itu).
    try {
      const result = await api('/api/auth/me')
      admin = result.admin
      section = pathSection() ?? 'overview'
      syncPath(section, { push: false })
    } catch (reason) {
      // 401 berarti memang belum masuk. Kegagalan lain (server mati, timeout)
      // tidak boleh disamarkan menjadi layar login.
      if (reason?.status === 401) admin = null
      else bootError = `Server tidak menjawab: ${reason?.message ?? reason}`
      return
    } finally {
      checking = false
    }

    if (admin) {
      loadSection(section)
      // Ringkasan dipakai untuk lencana navigasi dan status model aktif, jadi
      // dimuat sekali di awal untuk semua bagian — bukan hanya di Ringkasan.
      refreshOverview()
    }
  })

  onDestroy(() => {
    for (const timer of Object.values(timers)) clearTimeout(timer)
    clearTimeout(watchdog)
  })

  // Penjaga terakhir: bila pemeriksaan sesi tidak selesai dalam 15 detik,
  // layar "Membuka arsip…" menampilkan sebabnya + tombol muat ulang, supaya
  // tidak berputar tanpa akhir tanpa petunjuk apa pun.
  const watchdog = setTimeout(() => {
    if (checking && !bootError) {
      bootError =
        'Pemeriksaan sesi belum selesai setelah 15 detik. Pastikan API berjalan (terminal `bun run dev`) lalu muat ulang.'
    }
  }, 15_000)

  // `app.css` mengunci scroll karena museum adalah kanvas penuh layar. Dashboard
  // adalah dokumen biasa (profil bahkan lebih panjang dari satu layar), jadi kunci
  // itu dilepas selama /admin terbuka — sebelumnya halaman profil tidak bisa
  // digulir sama sekali dan kolom di bawahnya tidak pernah terjangkau.
  onMount(() => {
    const targets = [document.documentElement, document.body]
    for (const element of targets) element.classList.add('admin-mode')
    return () => {
      for (const element of targets) element.classList.remove('admin-mode')
    }
  })

  // Tombol Back/Forward browser harus berpindah bagian, bukan hanya mengubah URL.
  onMount(() => {
    const onPop = () => {
      const target = pathSection() ?? 'overview'
      selectSection(target, { push: false })
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  })

  // Di layar sempit sidebar menjadi laci; saat tertutup ia harus tidak bisa
  // dijangkau tombol Tab (sebelumnya item menu tak terlihat tetap terfokus).
  let narrow = $state(false)
  onMount(() => {
    const query = window.matchMedia('(max-width: 900px)')
    narrow = query.matches
    const onChange = (event) => {
      narrow = event.matches
      if (!narrow) mobileNav = false
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  })

  function handleError(reason) {
    if (reason?.status === 401) {
      admin = null
      return
    }
    error = reason?.message || String(reason)
  }

  function showNotice(message) {
    notice = message
    clearTimeout(timers.notice)
    timers.notice = setTimeout(() => {
      notice = ''
    }, 3200)
  }

  function showCloseHint(message) {
    closeHint = message
    clearTimeout(timers.closeHint)
    timers.closeHint = setTimeout(() => {
      closeHint = ''
    }, 6000)
  }

  function setObject(target, data) {
    for (const key of Object.keys(target)) delete target[key]
    Object.assign(target, data ?? {})
  }

  function defaultsFor(fields) {
    const data = {}
    for (const field of fields) {
      if (field.type === 'boolean') data[field.name] = Boolean(field.default)
      else if (field.type === 'number') data[field.name] = field.default ?? 0
      else if (field.type === 'list') data[field.name] = []
      else data[field.name] = field.default ?? ''
    }
    return data
  }

  function setForm(data) {
    for (const key of Object.keys(form)) delete form[key]
    Object.assign(form, data)
  }

  async function ensureProjectTitles() {
    if (projectTitles.size) return
    try {
      const result = await api('/api/admin/projects')
      projectTitles = new Map((result.items ?? []).map((item) => [Number(item.id), item.title]))
    } catch {
      // Kolom proyek hanya memperjelas baris; kegagalan tidak memblokir tabel.
    }
  }

  async function refreshOverview() {
    try {
      overview = await api('/api/admin/overview')
    } catch (reason) {
      handleError(reason)
    }
  }

  async function loadSection(key = section) {
    if (!admin) {
      loading = false
      return
    }
    loading = true
    error = ''
    try {
      if (key === 'overview') {
        overview = await api('/api/admin/overview')
      } else if (key === 'profile') {
        const result = await api('/api/admin/profile')
        setObject(profile, result.profile)
        profileReady = true
      } else if (key === 'messages') {
        const result = await api('/api/admin/messages')
        messages = result.items ?? []
        messagesReady = true
      } else {
        const result = await api(`/api/admin/${key}`)
        items = result.items ?? []
        if (key === 'feedback') await ensureProjectTitles()
      }
    } catch (reason) {
      handleError(reason)
    } finally {
      loading = false
    }
  }

  // Item navigasi berupa tautan. Klik biasa diambil alih supaya perpindahan
  // bagian tidak memuat ulang halaman; modifier (Ctrl/Cmd/Shift/klik tengah)
  // dibiarkan agar tetap bisa dibuka di tab baru.
  function handleNav(event, key) {
    if (event.defaultPrevented) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (typeof event.button === 'number' && event.button !== 0) return
    event.preventDefault()
    if (section === key) {
      window.scrollTo(0, 0)
      return
    }
    selectSection(key)
  }

  function selectSection(key, { push = true } = {}) {
    section = key
    search = ''
    queueFilter = 'all'
    editor = null
    pendingDelete = null
    previewItem = null
    mobileNav = false
    error = ''
    closeHint = ''
    items = []
    syncPath(key, { push })
    // Dokumen sudah bisa digulir (lihat admin-mode). Tanpa ini, pindah bagian
    // saat sedang di bawah halaman membuat isi baru tampil di tengah/bawah,
    // sehingga terlihat seperti klik pertama tidak bekerja.
    window.scrollTo(0, 0)
    loadSection(key)
  }

  function badgeFor(key) {
    if (key === 'messages') return unreadCount || 0
    const counts = overview?.counts
    if (!counts) return 0
    if (key === 'projects') return counts.projects
    if (key === 'certificates') return counts.certificates
    if (key === 'testimonials') return pendingTestimonials || counts.testimonials
    if (key === 'feedback') return pendingFeedback || counts.feedback
    if (key === 'posts') return counts.posts
    if (key === 'models') return counts.models
    return 0
  }

  function startCreate() {
    if (!config) return
    error = ''
    const data = defaultsFor(config.fields)
    setForm(data)
    editor = { mode: 'create', id: null, key: Date.now(), snapshot: JSON.stringify(data) }
  }

  function startEdit(item) {
    if (!config) return
    error = ''
    // Salinan data murni: `item` adalah proxy $state, dan structuredClone() bisa
    // melempar DataCloneError untuk objek proxy di sebagian browser.
    const data = JSON.parse(JSON.stringify(item))
    setForm(data)
    editor = { mode: 'edit', id: item.id, key: Date.now(), snapshot: JSON.stringify(data) }
  }

  function closeEditor() {
    if (saving) return
    editor = null
    error = ''
    closeHint = ''
  }

  /**
   * Klik latar atau Escape hanya menutup editor bila tidak ada perubahan.
   * Kalau ada isian setengah jadi, editor tetap terbuka supaya pekerjaan tidak
   * hilang tanpa peringatan (sebelumnya klik latar langsung membuang semuanya).
   */
  function requestClose() {
    if (!editor || saving) return
    if (dirty) {
      showCloseHint('Isian belum disimpan. Tekan Simpan, atau Batal untuk membuang perubahan.')
      return
    }
    closeEditor()
  }

  async function saveResource(event) {
    event?.preventDefault()
    if (!config || !editor || saving) return
    saving = true
    error = ''
    try {
      const path =
        editor.mode === 'create'
          ? `/api/admin/${section}`
          : `/api/admin/${section}/${editor.id}`
      const method = editor.mode === 'create' ? 'POST' : 'PUT'
      const saved = await api(path, { method, body: form })
      editor = null
      closeHint = ''
      await loadSection(section)
      await refreshOverview()
      showNotice(`${config.singular} disimpan.`)
      return saved
    } catch (reason) {
      handleError(reason)
    } finally {
      saving = false
    }
  }

  function requestDelete(target) {
    pendingDelete = target
  }

  function cancelDelete() {
    pendingDelete = null
  }

  async function confirmDelete() {
    const target = pendingDelete
    if (!target) return
    cancelDelete()
    try {
      if (target.kind === 'message') {
        await api(`/api/admin/messages/${target.id}`, { method: 'DELETE' })
        messages = messages.filter((item) => item.id !== target.id)
        showNotice('Pesan dihapus.')
      } else {
        await api(`/api/admin/${section}/${target.id}`, { method: 'DELETE' })
        await loadSection(section)
        showNotice(`${config?.singular ?? 'Entri'} dihapus.`)
      }
      await refreshOverview()
    } catch (reason) {
      handleError(reason)
    }
  }

  function removeResource(item) {
    if (!config) return
    requestDelete({
      kind: 'resource',
      id: item.id,
      label: item.title || item.name || `#${item.id}`,
      what: config.singular.toLowerCase(),
    })
  }

  /**
   * "Pakai" pada daftar model: PUT hanya field `active`, server mematikan model
   * lain dan menolak model tanpa berkas PMX.
   */
  async function applyModel(item) {
    if (!item || item.active || saving) return
    saving = true
    error = ''
    try {
      await api(`/api/admin/models/${item.id}`, { method: 'PUT', body: { active: true } })
      await loadSection('models')
      await refreshOverview()
      showNotice(`${item.name} dipakai di museum.`)
    } catch (reason) {
      handleError(reason)
    } finally {
      saving = false
    }
  }

  async function handleModelUploaded() {
    // Baris model sudah dibuat server; cukup segarkan daftar dan hitungan.
    await loadSection('models')
    await refreshOverview()
    showNotice('Model diunggah. Tekan Pakai untuk memakainya di museum.')
  }

  /**
   * Buka pratinjau 3D model (meja putar 360°). Komponen pratinjau baru diimpor
   * saat pertama kali dipakai supaya muat dashboard tetap ringan.
   */
  async function openPreview(item) {
    if (!item?.pmx_url) {
      error = 'Model ini belum punya berkas PMX.'
      return
    }
    error = ''
    try {
      if (!PreviewComponent) {
        const module = await import('./ModelPreview.svelte')
        PreviewComponent = module.default
      }
      previewItem = item
    } catch (reason) {
      handleError(reason)
    }
  }

  function closePreview() {
    previewItem = null
  }

  async function saveProfile() {
    if (savingProfile) return
    savingProfile = true
    error = ''
    try {
      const result = await api('/api/admin/profile', { method: 'PUT', body: profile })
      setObject(profile, result.profile)
      showNotice('Profil dan halaman tentang saya disimpan.')
    } catch (reason) {
      handleError(reason)
    } finally {
      savingProfile = false
    }
  }

  /** Setujui atau sembunyikan kiriman pengunjung langsung dari tabel. */
  async function toggleApproval(item) {
    if (!config) return
    try {
      const updated = await api(`/api/admin/${section}/${item.id}`, {
        method: 'PUT',
        body: { approved: !item.approved },
      })
      Object.assign(item, updated)
      items = [...items]
      await refreshOverview()
      showNotice(
        updated.approved
          ? `${config.singular} “${updated.name}” disetujui dan tampil di museum.`
          : `${config.singular} “${updated.name}” disembunyikan dari museum.`,
      )
    } catch (reason) {
      handleError(reason)
    }
  }

  async function updateMessage(message, patch) {
    try {
      const updated = await api(`/api/admin/messages/${message.id}`, {
        method: 'PUT',
        body: patch,
      })
      Object.assign(message, updated)
      await refreshOverview()
    } catch (reason) {
      handleError(reason)
    }
  }

  function removeMessage(message) {
    requestDelete({ kind: 'message', id: message.id, label: message.name, what: 'pesan' })
  }

  async function logout() {
    try {
      await api('/api/auth/logout', { method: 'POST' })
    } catch {
      // Sesi mungkin sudah berakhir.
    }
    admin = null
    section = 'overview'
    mobileNav = false
    items = []
    messages = []
    messagesReady = false
    profile = {}
    profileReady = false
    pendingDelete = null
    notice = ''
    syncPath('overview', { push: false })
  }

  function handleKeydown(event) {
    if (event.key !== 'Escape') return
    if (pendingDelete) cancelDelete()
    else if (editor) requestClose()
    else if (mobileNav) mobileNav = false
  }

  function fieldOf(name) {
    return PROFILE_FIELDS.find((field) => field.name === name)
  }

  function resourceField(name) {
    return config?.fields.find((field) => field.name === name)
  }

  function displayCell(item, name) {
    const field = resourceField(name)
    const value = item[name]
    if (field?.type === 'boolean') {
      if (name === 'published') return value ? 'Tampil' : 'Draf'
      if (name === 'active') return value ? 'Dipakai' : 'Tersimpan'
      if (name === 'approved') return value ? 'Tampil' : 'Menunggu'
      return value ? 'Ya' : 'Tidak'
    }
    if (field?.type === 'select') return SELECT_LABELS.get(value) ?? value
    if (Array.isArray(value)) return value.join(', ')
    if (value === null || value === undefined || value === '') return '—'
    // Umpan balik menunjuk proyek lewat ID; admin perlu membaca nama karyanya.
    if (name === 'project_id') return projectTitles.get(Number(value)) ?? `#${value}`
    return value
  }

  function formatDate(value) {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)
    return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
  }

  function onLogin(doneAdmin) {
    admin = doneAdmin
    checking = false
    bootError = ''
    const target = pathSection() ?? 'overview'
    selectSection(target, { push: false })
  }

  // Fokus pindah ke dialog editor / konfirmasi supaya Escape dan pembaca layar bekerja.
  $effect(() => {
    if (editor && modalEl) modalEl.focus()
  })

  $effect(() => {
    if (!editor && pendingDelete && confirmEl) confirmEl.focus()
  })
</script>

<svelte:window onkeydown={handleKeydown} />

{#if checking}
  <div class="checking-screen">
    <span class="checking-seal" aria-hidden="true">往</span>
    <p>Membuka arsip…</p>
    {#if bootError}
      <p class="checking-error" role="alert">{bootError}</p>
      <button class="button primary" type="button" onclick={() => location.reload()}>
        Muat ulang
      </button>
    {/if}
  </div>
{:else if !admin}
  {#if bootError}
    <div class="boot-error" role="alert">
      <p><strong>Dashboard tidak bisa dibuka.</strong></p>
      <p>{bootError}</p>
      <p class="muted">
        Pastikan API museum berjalan (jendela terminal <code>bun run dev</code>), lalu muat
        ulang halaman ini. Halaman login hanya muncul bila sesi benar-benar kosong.
      </p>
      <button class="button primary" type="button" onclick={() => location.reload()}>
        Muat ulang
      </button>
    </div>
  {:else}
    <AdminLogin onSuccess={onLogin} />
  {/if}
{:else}
  <div class="admin-shell">
    {#if mobileNav}
      <button
        class="nav-scrim"
        type="button"
        aria-label="Tutup menu"
        onclick={() => (mobileNav = false)}
      ></button>
    {/if}

    <aside class="sidebar" class:open={mobileNav}>
      <a class="brand" href="/">
        <span class="brand-seal" aria-hidden="true">往</span>
        <span class="brand-copy">
          <strong>NekoNeko</strong>
          <small>Archive Control</small>
        </span>
      </a>

      <p class="sidebar-note">Kontrol isi museum 3D. Perubahan langsung dipakai saat museum dimuat ulang.</p>

      <nav aria-label="Navigasi dashboard">
        {#each NAV_GROUPS as group (group.label)}
          <p class="nav-label">{group.label}</p>
          {#each group.items as item (item.key)}
            <!-- Item navigasi adalah tautan sungguhan: bisa dibuka di tab baru,
                 bisa di-klik-kanan, dan tetap bekerja walau handler JS gagal. -->
            <a
              class="nav-item"
              class:active={section === item.key}
              href={pathFor(item.key)}
              aria-current={section === item.key ? 'page' : undefined}
              onclick={(event) => handleNav(event, item.key)}
            >
              <span class="nav-seal" aria-hidden="true">{item.seal}</span>
              <span class="nav-text">{item.label}</span>
              {#if badgeFor(item.key)}
                <span class="nav-badge" class:warn={item.key === 'messages' || (item.key === 'testimonials' && pendingTestimonials > 0) || (item.key === 'feedback' && pendingFeedback > 0)}>
                  {badgeFor(item.key)}
                </span>
              {/if}
            </a>
          {/each}
        {/each}
      </nav>

      <footer class="sidebar-foot">
        <p class="user-name">{admin.name}</p>
        <p class="user-mail">{admin.email}</p>
        <div class="sidebar-actions">
          <a href="/" target="_blank" rel="noreferrer">Lihat museum ↗</a>
          <button type="button" onclick={logout}>Keluar</button>
        </div>
      </footer>
    </aside>

    <main class="main">
      <header class="topbar">
        <button class="menu-btn" type="button" onclick={() => (mobileNav = true)}>
          <span aria-hidden="true">☰</span> Indeks
        </button>

        <div class="page-title">
          <span class="page-seal" aria-hidden="true">{sectionMeta.seal}</span>
          <div>
            <p class="eyebrow">Meja arsip</p>
            <h1>{sectionMeta.label}</h1>
          </div>
        </div>

        <div class="top-actions">
          <a class="button ghost desktop-only" href="/" target="_blank" rel="noreferrer">
            Lihat museum ↗
          </a>
          <span class="admin-chip">{admin.name}</span>
          <button class="button ghost" type="button" onclick={logout}>Keluar</button>
        </div>

        {#if loading}<div class="loading-bar" aria-hidden="true"></div>{/if}
      </header>

      <div class="content">
        {#if error && !editor}
          <div class="alert" role="alert">
            <span>{error}</span>
            <button type="button" aria-label="Tutup pesan error" onclick={() => (error = '')}>×</button>
          </div>
        {/if}

        {#if section === 'overview'}
          <section class="view">
            <div class="view-intro">
              <div>
                <p class="eyebrow">Ringkasan arsip · {todayLabel}</p>
                <h2>Museum</h2>
                <p class="muted">{countsSummary}</p>
              </div>
              <a class="button primary" href="/" target="_blank" rel="noreferrer">
                Buka museum <span aria-hidden="true">→</span>
              </a>
            </div>

            <div class="count-grid">
              {#each overviewCards as card (card.key)}
                <button class="count-card" type="button" onclick={() => selectSection(card.key)}>
                  <span class="count-seal" aria-hidden="true">{card.seal}</span>
                  <span class="count-value">{card.value}</span>
                  <span class="count-label">{card.label}</span>
                  <span class="count-note">{card.note}</span>
                </button>
              {/each}
            </div>

            <section class="panel queue">
              <header class="panel-head">
                <div>
                  <p class="eyebrow">Perlu tindakan</p>
                  <h3>
                    {actionQueue.length
                      ? `${actionQueue.length} hal menunggu`
                      : 'Tidak ada yang menunggu'}
                  </h3>
                </div>
              </header>

              {#if actionQueue.length}
                <ul class="queue-list">
                  {#each actionQueue as task (task.key)}
                    <li>
                      <button type="button" onclick={() => selectSection(task.key)}>
                        <span class="queue-seal" aria-hidden="true">{task.seal}</span>
                        <span class="queue-body">
                          <strong>{task.label}</strong>
                          <span>{task.note}</span>
                        </span>
                        <span class="queue-go" aria-hidden="true">→</span>
                      </button>
                    </li>
                  {/each}
                </ul>
              {:else}
                <p class="queue-empty">
                  Semua kiriman sudah ditinjau dan tidak ada draf proyek yang tertinggal.
                </p>
              {/if}
            </section>

            <section class="panel">
              <header class="panel-head">
                <div>
                  <p class="eyebrow">Kotak masuk</p>
                  <h3>Pesan terbaru</h3>
                </div>
                <button class="text-btn" type="button" onclick={() => selectSection('messages')}>
                  Buka semua pesan
                </button>
              </header>

              {#if overview?.recent?.length}
                <ul class="recent-list">
                  {#each overview.recent as message (message.id)}
                    <li>
                      <button type="button" onclick={() => selectSection('messages')}>
                        <span class="recent-name">
                          {message.name}
                          {#if !message.read_at}<span class="dot" aria-label="Belum dibaca"></span>{/if}
                        </span>
                        <span class="recent-subject">{message.subject || 'Tanpa subjek'}</span>
                        <span class="recent-date">{formatDate(message.created_at)}</span>
                      </button>
                    </li>
                  {/each}
                </ul>
              {:else}
                <p class="empty">Belum ada pesan masuk.</p>
              {/if}
            </section>
          </section>
        {:else if section === 'profile'}
          <section class="view">
            <div class="view-intro">
              <div>
                <p class="eyebrow">Data utama</p>
                <h2>Profil & halaman tentang saya</h2>
                <p class="muted">
                  Data ini mengisi beranda, panel tentang saya, kontak, dan CV digital di museum.
                </p>
              </div>
              <button
                class="button primary"
                type="button"
                onclick={saveProfile}
                disabled={savingProfile || !profileReady}
              >
                {savingProfile ? 'Menyimpan…' : 'Simpan profil'}
              </button>
            </div>

            <!-- Form baru dirender setelah data tiba: tidak ada lagi kolom kosong
                 yang bisa terlanjur diketik lalu tertimpa data server. -->
            {#if profileReady}
              {#each PROFILE_GROUPS as group (group.title)}
                <section class="panel">
                  <header class="panel-head">
                    <div>
                      <p class="eyebrow">Profil</p>
                      <h3>{group.title}</h3>
                    </div>
                  </header>
                  <div class="form-grid">
                    {#each group.fields as name (name)}
                      {@const field = fieldOf(name)}
                      {#if field}
                        <AdminField {field} bind:value={profile[field.name]} />
                      {/if}
                    {/each}
                  </div>
                </section>
              {/each}

              <div class="save-row">
                <p class="muted">Perubahan disimpan ke database, bukan ke kode.</p>
                <button class="button primary" type="button" onclick={saveProfile} disabled={savingProfile}>
                  {savingProfile ? 'Menyimpan…' : 'Simpan profil'}
                </button>
              </div>
            {:else}
              <div class="empty panel">
                <p>{loading ? 'Memuat isi profil…' : 'Isi profil belum termuat.'}</p>
                {#if !loading}
                  <button class="text-btn" type="button" onclick={() => loadSection('profile')}>
                    Muat ulang
                  </button>
                {/if}
              </div>
            {/if}
          </section>
        {:else if section === 'messages'}
          <section class="view">
            <div class="view-intro">
              <div>
                <p class="eyebrow">Kotak masuk</p>
                <h2>Pesan kontak</h2>
                <p class="muted">
                  Pesan dari formulir kontak. Bersifat privat: tidak pernah tampil di museum.
                  Kesan pengunjung kini menjadi umpan balik di tiap proyek.
                </p>
              </div>
            </div>

            <div class="filter-tabs" role="group" aria-label="Filter pesan">
              {#each [['all', 'Semua'], ['unread', 'Belum dibaca']] as [key, label] (key)}
                <button
                  type="button"
                  class:active={messageFilter === key}
                  aria-pressed={messageFilter === key}
                  onclick={() => (messageFilter = key)}
                >{label}</button>
              {/each}
            </div>

            {#if !messagesReady && loading}
              <p class="empty panel">Memuat pesan…</p>
            {:else if !messagesReady}
              <div class="empty panel">
                <p>Pesan belum termuat.</p>
                <button class="text-btn" type="button" onclick={() => loadSection('messages')}>
                  Muat ulang
                </button>
              </div>
            {:else if filteredMessages.length === 0}
              <p class="empty panel">Tidak ada pesan pada filter ini.</p>
            {:else}
              <div class="message-list">
                {#each filteredMessages as message (message.id)}
                  <article class="message-card" class:unread={!message.read_at}>
                    <header>
                      <div class="message-meta">
                        <span class="msg-type">Pesan kontak</span>
                        {#if !message.read_at}<span class="unread-flag">Baru</span>{/if}
                      </div>
                      <time>{formatDate(message.created_at)}</time>
                    </header>

                    <h3>{message.subject || 'Pesan kontak'}</h3>
                    <p class="message-from">
                      {message.name}
                      {#if message.email}<span>·</span><a href={`mailto:${message.email}`}>{message.email}</a>{/if}
                    </p>
                    <p class="message-body">{message.message}</p>

                    <div class="message-actions">
                      <button class="button small" type="button" onclick={() => updateMessage(message, { read: !message.read_at })}>
                        {message.read_at ? 'Tandai belum dibaca' : 'Tandai dibaca'}
                      </button>
                      <button class="button small danger" type="button" onclick={() => removeMessage(message)}>
                        Hapus
                      </button>
                    </div>
                  </article>
                {/each}
              </div>
            {/if}
          </section>
        {:else if config}
          <section class="view">
            <div class="view-intro">
              <div>
                <p class="eyebrow">Koleksi museum</p>
                <h2>{config.label}</h2>
                <p class="muted">{config.description}</p>
              </div>
              <button class="button primary" type="button" onclick={startCreate}>
                + Tambah {config.singular.toLowerCase()}
              </button>
            </div>

            {#if section === 'models'}
              <ModelUploader
                activeModel={activeModel}
                modelCount={items.length}
                onUploaded={handleModelUploaded}
              />
            {/if}

            {#if moderatable}
              <div class="pending-banner" class:quiet={pendingInSection === 0}>
                <p>
                  {#if pendingInSection}
                    <strong>{pendingInSection} {section === 'feedback' ? 'umpan balik' : 'testimoni'} menunggu persetujuan.</strong>
                    {#if section === 'feedback'}
                      Kiriman pengunjung tidak tampil di detail proyek mana pun di museum sebelum
                      kamu setujui di sini. Setelah disetujui, umpan baliknya langsung ikut terkirim
                      lewat <code>/api/portfolio</code>.
                    {:else}
                      Kiriman pengunjung tidak muncul di museum — baik sebagai kartu di panel
                      Testimoni maupun sebagai NPC pengunjung — sebelum kamu setujui di sini.
                    {/if}
                  {:else}
                    Semua {section === 'feedback' ? 'umpan balik proyek' : 'testimoni'} sudah ditinjau.
                    Kiriman baru dari museum akan muncul di sini dan menunggu persetujuanmu.
                  {/if}
                </p>
              </div>

              <div class="filter-tabs" role="group" aria-label={`Filter ${config.label.toLowerCase()}`}>
                {#each queueTabs as [key, label] (key)}
                  <button
                    type="button"
                    class:active={queueFilter === key}
                    aria-pressed={queueFilter === key}
                    onclick={() => (queueFilter = key)}
                  >{label}</button>
                {/each}
              </div>
            {/if}

            <div class="table-tools">
              <input
                class="search"
                type="search"
                bind:value={search}
                placeholder={`Cari ${config.label.toLowerCase()}…`}
                aria-label={`Cari ${config.label}`}
              />
              <span class="table-count">{filteredItems.length} entri</span>
              <button
                class="text-btn reload"
                type="button"
                onclick={() => loadSection(section)}
                disabled={loading}
              >Muat ulang</button>
            </div>

            {#if loading}
              <p class="empty panel">Memuat data…</p>
            {:else if filteredItems.length === 0}
              <div class="empty panel">
                <p>
                  {#if search}
                    Tidak ada hasil untuk pencarian ini.
                  {:else if moderatable && queueFilter === 'pending'}
                    Tidak ada {config.label.toLowerCase()} yang menunggu persetujuan.
                  {:else if moderatable && queueFilter === 'approved'}
                    Belum ada {config.label.toLowerCase()} yang ditampilkan.
                  {:else if section === 'models'}
                    Belum ada model tersimpan. Museum memakai model bawaan sampai kamu
                    mengunggah model lalu menekan Pakai.
                  {:else}
                    Belum ada {config.label.toLowerCase()}.
                  {/if}
                </p>
                {#if !search && section !== 'models'}
                  <button class="button primary" type="button" onclick={startCreate}>
                    Tambah yang pertama
                  </button>
                {/if}
              </div>
            {:else}
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th class="id-col">ID</th>
                      {#each config.listFields as name (name)}
                        <th>{resourceField(name)?.label ?? name}</th>
                      {/each}
                      <th class="actions-col">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each filteredItems as item (item.id)}
                      <tr>
                        <td class="id-col" data-label="ID">#{item.id}</td>
                        {#each config.listFields as name (name)}
                          <td data-label={resourceField(name)?.label ?? name}>
                            <span class:cell-flag={name === 'published' || name === 'approved' || name === 'active'}>
                              {displayCell(item, name)}
                            </span>
                          </td>
                        {/each}
                        <td class="actions-col" data-label="Aksi">
                          {#if section === 'models'}
                            <button
                              class="row-btn"
                              type="button"
                              onclick={() => openPreview(item)}
                              disabled={!item.pmx_url}
                            >Pratinjau</button>
                            <button
                              class="row-btn"
                              class:approve={!item.active}
                              type="button"
                              disabled={item.active || saving}
                              onclick={() => applyModel(item)}
                            >{item.active ? 'Sedang dipakai' : 'Pakai'}</button>
                          {/if}
                          {#if moderatable}
                            <button
                              class="row-btn"
                              class:approve={!item.approved}
                              type="button"
                              onclick={() => toggleApproval(item)}
                            >
                              {item.approved ? 'Sembunyikan' : 'Setujui'}
                            </button>
                          {/if}
                          <button class="row-btn" type="button" onclick={() => startEdit(item)}>Ubah</button>
                          <button class="row-btn danger" type="button" onclick={() => removeResource(item)}>Hapus</button>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </section>
        {/if}
      </div>
    </main>
  </div>

  {#if editor && config}
    <div
      class="modal-backdrop"
      role="presentation"
      transition:fade={{ duration: 140 }}
      onclick={(event) => {
        // Klik latar saja yang menutup; klik di dalam dialog tidak. Memakai
        // pemeriksaan target membuat handler tidak perlu dipasang di dialog.
        if (event.target === event.currentTarget) requestClose()
      }}
    >
      <!-- Dialog editor: tanpa handler klik sendiri, jadi tidak ada elemen
           non-interaktif yang membawa event klik. -->
      <div
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
        tabindex="-1"
        bind:this={modalEl}
        transition:fly={{ y: 14, duration: 180 }}
      >
        <header class="modal-head">
          <div class="modal-title">
            <span class="modal-seal" aria-hidden="true">{config.seal}</span>
            <div>
              <p class="eyebrow">{editor.mode === 'create' ? 'Entri baru' : `Entri #${editor.id}`}</p>
              <h2 id="editor-title">{editor.mode === 'create' ? 'Tambah' : 'Ubah'} {config.singular.toLowerCase()}</h2>
            </div>
          </div>
          <button class="icon-btn" type="button" onclick={closeEditor} aria-label="Tutup editor">×</button>
        </header>

        <form onsubmit={saveResource}>
          {#if error}<p class="form-error" role="alert">{error}</p>{/if}

          <div class="modal-body">
            {#key editor.key}
              <div class="form-grid">
                {#each config.fields as field (field.name)}
                  <AdminField {field} bind:value={form[field.name]} />
                {/each}
              </div>
            {/key}
          </div>

          <footer class="modal-foot">
            {#if closeHint}
              <p class="close-hint" role="status">{closeHint}</p>
            {:else}
              <p class="muted">Perubahan disimpan ke database.</p>
            {/if}
            <div>
              <button class="button ghost" type="button" onclick={closeEditor} disabled={saving}>Batal</button>
              <button class="button primary" type="submit" disabled={saving}>
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  {/if}

  {#if pendingDelete}
    <div
      class="modal-backdrop confirm-backdrop"
      role="presentation"
      transition:fade={{ duration: 140 }}
      onclick={(event) => {
        if (event.target === event.currentTarget) cancelDelete()
      }}
    >
      <div
        class="modal confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        tabindex="-1"
        bind:this={confirmEl}
        transition:fly={{ y: 12, duration: 160 }}
      >
        <header class="modal-head">
          <div class="modal-title">
            <span class="modal-seal danger" aria-hidden="true">刪</span>
            <div>
              <p class="eyebrow">Konfirmasi hapus</p>
              <h2 id="confirm-title">Hapus {pendingDelete.what}?</h2>
            </div>
          </div>
        </header>

        <div class="confirm-body">
          <p id="confirm-desc">
            “{pendingDelete.label}” akan dihapus dari database museum, termasuk dari
            museum 3D pada pemuatan berikutnya. Tindakan ini tidak bisa dibatalkan.
          </p>
        </div>

        <footer class="modal-foot">
          <p class="muted">Pilih Batal untuk mempertahankan data.</p>
          <div>
            <button class="button ghost" type="button" onclick={cancelDelete}>Batal</button>
            <button class="button primary danger" type="button" onclick={confirmDelete}>
              Ya, hapus
            </button>
          </div>
        </footer>
      </div>
    </div>
  {/if}

  {#if previewItem && PreviewComponent}
    <!--
      Pratinjau model: meja putar 360°. Komponen ini memuat three.js sendiri,
      jadi baru diminta saat admin menekan Pratinjau.
    -->
    <PreviewComponent item={previewItem} onClose={closePreview} />
  {/if}

  {#if notice}
    <div class="toast" role="status" transition:fly={{ y: 8, duration: 180 }}>{notice}</div>
  {/if}
{/if}
