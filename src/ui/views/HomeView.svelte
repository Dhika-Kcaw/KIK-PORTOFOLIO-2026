<script>
  import { initials } from '../panel-utils.js'

  let { profile, data, onNavigate } = $props()

  const skills = $derived((data.skills ?? []).filter((skill) => skill.category === 'hard').slice(0, 6))
  const featured = $derived(
    (data.projects ?? []).filter((project) => project.featured).slice(0, 3).length
      ? (data.projects ?? []).filter((project) => project.featured).slice(0, 3)
      : (data.projects ?? []).slice(0, 3),
  )
  const stats = $derived([
    ['Karya', data.projects?.length ?? 0],
    ['Sertifikat', data.certificates?.length ?? 0],
    ['Pengalaman', data.experiences?.length ?? 0],
    ['Testimoni', data.testimonials?.length ?? 0],
  ])
</script>

<div class="home-view">
  <section class="home-hero">
    <div class="home-portrait">
      {#if profile.avatar_url}
        <img src={profile.avatar_url} alt={`Foto ${profile.name}`} />
      {:else}
        <span aria-hidden="true">{initials(profile.name)}</span>
      {/if}
      <small>Arsip pribadi</small>
    </div>

    <div class="home-copy">
      <p class="kicker">{profile.class_name || 'Portofolio'} · {profile.competence || 'Pengembangan Perangkat Lunak'}</p>
      <h3>{profile.name}</h3>
      <p class="headline">{profile.headline || profile.role}</p>
      <p class="lede">{profile.bio}</p>

      {#if skills.length}
        <div class="chip-row" aria-label="Keahlian utama">
          {#each skills as skill (skill.id)}
            <span class="chip">{skill.name}</span>
          {/each}
        </div>
      {/if}

      <div class="hero-actions">
        <button class="button primary" type="button" onclick={() => onNavigate?.({ type: 'section', key: 'projects' })}>
          Lihat Portofolio <span aria-hidden="true">→</span>
        </button>
        <button class="button ghost" type="button" onclick={() => onNavigate?.({ type: 'section', key: 'cv' })}>
          Lihat CV
        </button>
        <button class="button ghost" type="button" onclick={() => onNavigate?.({ type: 'section', key: 'contact' })}>
          Hubungi Saya
        </button>
      </div>
    </div>
  </section>

  <div class="stat-row">
    {#each stats as [label, value] (label)}
      <div class="stat">
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    {/each}
  </div>

  <section class="panel-section">
    <header class="section-head">
      <div>
        <p class="kicker">Pilihan dari galeri</p>
        <h4>Karya unggulan</h4>
      </div>
      <button class="text-link" type="button" onclick={() => onNavigate?.({ type: 'section', key: 'projects' })}>
        Semua karya →
      </button>
    </header>

    <div class="mini-projects">
      {#each featured as project (project.id)}
        <button class="mini-project" type="button" onclick={() => onNavigate?.({ type: 'project', id: project.id })}>
          <span class="mini-cover">
            {#if project.image_url}
              <img src={project.image_url} alt="" />
            {:else}
              <span class="cover-seal" aria-hidden="true">作</span>
            {/if}
          </span>
          <span class="mini-copy">
            <small>{project.year} · {project.category}</small>
            <strong>{project.title}</strong>
            <span>{project.summary || project.description}</span>
          </span>
        </button>
      {/each}
    </div>
  </section>

  <div class="info-strip">
    <p><span>Lokasi</span>{profile.location || 'Indonesia'}</p>
    <p><span>Status</span>{profile.availability || 'Terbuka untuk kolaborasi'}</p>
    <p><span>Kontak</span>{profile.email || '—'}</p>
  </div>
</div>
