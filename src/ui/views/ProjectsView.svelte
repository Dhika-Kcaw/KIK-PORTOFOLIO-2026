<script>
  let { data, onOpenProject } = $props()

  let query = $state('')
  let category = $state('Semua')

  const projects = $derived(data.projects ?? [])
  const categories = $derived(['Semua', ...new Set(projects.map((project) => project.category).filter(Boolean))])
  const filtered = $derived(
    projects.filter((project) => {
      if (category !== 'Semua' && project.category !== category) return false
      const text = query.trim().toLowerCase()
      if (!text) return true
      return `${project.title} ${project.category} ${project.year} ${project.summary} ${(project.tech ?? []).join(' ')}`
        .toLowerCase()
        .includes(text)
    }),
  )
</script>

<div class="projects-view">
  <section class="panel-section">
    <div class="filter-row">
      {#each categories as item (item)}
        <button
          class="filter-chip"
          class:active={category === item}
          type="button"
          onclick={() => (category = item)}
        >
          {item}
        </button>
      {/each}
      <input
        class="search-input"
        type="search"
        bind:value={query}
        placeholder="Cari nama, teknologi, tahun…"
        aria-label="Cari proyek"
      />
    </div>

    {#if filtered.length}
      <div class="project-grid">
        {#each filtered as project (project.id)}
          <button class="project-tile" type="button" onclick={() => onOpenProject?.(project.id)}>
            <span class="tile-cover">
              {#if project.image_url}
                <img src={project.image_url} alt={`Tangkapan layar ${project.title}`} loading="lazy" />
              {:else}
                <span class="cover-seal" aria-hidden="true">作</span>
              {/if}
            </span>
            <span class="tile-copy">
              <small>{[project.year, project.category].filter(Boolean).join(' · ') || 'Proyek'}</small>
              <strong>{project.title}</strong>
              <span>{project.summary || project.description}</span>
              {#if (project.tech ?? []).length}
                <span class="chip-row">
                  {#each (project.tech ?? []).slice(0, 4) as tech (tech)}
                    <span class="chip">{tech}</span>
                  {/each}
                </span>
              {/if}
            </span>
          </button>
        {/each}
      </div>
    {:else}
      <p class="empty-state">Tidak ada proyek yang cocok dengan pencarian ini.</p>
    {/if}

    <p class="result-count">{filtered.length} dari {projects.length} karya ditampilkan</p>
  </section>
</div>

<style>
  .result-count {
    margin-top: 14px;
    font-family: var(--font-mono);
    font-size: 8.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.42);
  }
</style>
