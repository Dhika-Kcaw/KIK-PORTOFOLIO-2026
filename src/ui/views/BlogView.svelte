<script>
  import { formatDate, renderMarkdown } from '../panel-utils.js'

  let { data, onBlip } = $props()

  let activeId = $state(null)
  let query = $state('')

  const posts = $derived(data.posts ?? [])
  const active = $derived(posts.find((post) => post.id === activeId) ?? null)
  const filtered = $derived.by(() => {
    const text = query.trim().toLowerCase()
    if (!text) return posts
    return posts.filter((post) =>
      `${post.title} ${post.excerpt} ${(post.tags ?? []).join(' ')}`.toLowerCase().includes(text),
    )
  })

  function openPost(post) {
    activeId = post.id
    onBlip?.()
  }
</script>

<div class="blog-view">
  {#if active}
    <button class="back-link" type="button" onclick={() => (activeId = null)}>
      <span aria-hidden="true">←</span> Semua catatan
    </button>

    <header>
      <p class="kicker">
        {formatDate(active.published_at)}
        {#if (active.tags ?? []).length}· {active.tags.join(' / ')}{/if}
      </p>
      <h3 class="display-title">{active.title}</h3>
      {#if active.excerpt}<p class="lede wide">{active.excerpt}</p>{/if}
    </header>

    {#if active.cover_url}
      <div class="post-cover">
        <img src={active.cover_url} alt="" />
      </div>
    {/if}

    <div class="prose">
      <!-- renderMarkdown meloloskan HTML lebih dulu, hanya tag aman yang dihasilkan. -->
      {@html renderMarkdown(active.content || active.excerpt || '')}
    </div>
  {:else}
    <section class="panel-section">
      <div class="filter-row">
        <p class="kicker">Jurnal pengembangan</p>
        <input
          class="search-input"
          type="search"
          bind:value={query}
          placeholder="Cari catatan…"
          aria-label="Cari catatan"
        />
      </div>

      {#if filtered.length}
        <div class="post-list">
          {#each filtered as post (post.id)}
            <button class="post-item post-button" type="button" onclick={() => openPost(post)}>
              <span class="post-meta">
                <span>{formatDate(post.published_at)}</span>
                {#if (post.tags ?? []).length}<span>{post.tags.join(' / ')}</span>{/if}
              </span>
              <h4>{post.title}</h4>
              {#if post.excerpt}<p>{post.excerpt}</p>{/if}
              <span class="read-more">Baca catatan →</span>
            </button>
          {/each}
        </div>
      {:else}
        <p class="empty-state">Belum ada catatan yang terbit.</p>
      {/if}
    </section>
  {/if}
</div>

<style>
  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 12px;
    padding: 2px 0;
    border-bottom: 1px solid rgba(36, 28, 22, 0.2);
    font-size: 10px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.6);
  }

  .back-link:hover {
    color: var(--vermilion-deep);
  }

  .post-button {
    display: block;
    width: 100%;
    text-align: left;
  }

  .post-button:hover h4 {
    color: var(--vermilion-deep);
  }

  .read-more {
    display: inline-block;
    margin-top: 6px;
    font-family: var(--font-mono);
    font-size: 8.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(178, 58, 48, 0.7);
  }

  .post-cover {
    margin-top: 14px;
    aspect-ratio: 16 / 7;
    overflow: hidden;
    border: 1px solid rgba(36, 28, 22, 0.16);
  }

  .post-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .filter-row .kicker {
    margin-right: auto;
  }
</style>
