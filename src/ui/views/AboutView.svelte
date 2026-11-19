<script>
  let { profile, data } = $props()

  const plkExperiences = $derived(
    (data.experiences ?? []).filter((item) => item.type === 'plk'),
  )
  const biodata = $derived([
    ['Nama lengkap', profile.name],
    ['Kelas', profile.class_name],
    ['Kompetensi keahlian', profile.competence],
    ['Lokasi', profile.location],
    ['Email', profile.email],
    ['Status', profile.availability],
  ])
</script>

<div class="about-view">
  <section class="panel-section">
    <p class="kicker">Biodata singkat</p>
    <h3 class="display-title">{profile.name}</h3>
    <p class="lede wide">{profile.bio}</p>
    <dl class="bio-grid">
      {#each biodata as [label, value] (label)}
        <div>
          <dt>{label}</dt>
          <dd>{value || '—'}</dd>
        </div>
      {/each}
    </dl>
  </section>

  <div class="two-col">
    <section class="panel-section">
      <p class="kicker">Riwayat pendidikan</p>
      <h4>Jejak belajar</h4>
      <ol class="timeline">
        {#each profile.education ?? [] as item, index (item)}
          <li>
            <span class="timeline-dot" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <span>{item}</span>
          </li>
        {/each}
        {#if !(profile.education ?? []).length}<li class="empty-line">Belum ada riwayat pendidikan.</li>{/if}
      </ol>
    </section>

    <section class="panel-section">
      <p class="kicker">Minat dan teknologi</p>
      <h4>Bidang yang ditekuni</h4>
      <div class="chip-row">
        {#each profile.interests ?? [] as interest (interest)}
          <span class="chip">{interest}</span>
        {/each}
      </div>
    </section>
  </div>

  <div class="two-col">
    <section class="panel-section">
      <p class="kicker">Organisasi & kepanitiaan</p>
      <h4>Pengalaman berkelompok</h4>
      <ul class="plain-list">
        {#each profile.organizations ?? [] as item (item)}
          <li>{item}</li>
        {/each}
        {#if !(profile.organizations ?? []).length}<li class="empty-line">Belum ada pengalaman organisasi.</li>{/if}
      </ul>
    </section>

    <section class="panel-section">
      <p class="kicker">Praktik kerja lapangan</p>
      <h4>Pengalaman PLK</h4>
      {#if plkExperiences.length}
        {#each plkExperiences as item (item.id)}
          <article class="mini-article">
            <strong>{item.title}</strong>
            <small>{item.organization} · {item.period}</small>
            <p>{item.description}</p>
          </article>
        {/each}
      {:else}
        <ul class="plain-list">
          {#each profile.plk ?? [] as item (item)}
            <li>{item}</li>
          {/each}
          {#if !(profile.plk ?? []).length}<li class="empty-line">Belum ada pengalaman PLK.</li>{/if}
        </ul>
      {/if}
    </section>
  </div>

  <section class="panel-section goal-box">
    <h4 class="kicker">Cita-cita & tujuan karier</h4>
    <p>{profile.career_goal}</p>
  </section>
</div>
