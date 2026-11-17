import { createDatabase, insertRow } from './index.js'
import { runMigrations } from './migrate.js'
import { ensureAdmin, getDefaultCredentials } from '../auth.js'
import {
  seedCertificates,
  seedExperiences,
  seedFeedback,
  seedMessages,
  seedPosts,
  seedProfile,
  seedProjects,
  seedSkills,
  seedTestimonials,
} from './seed-data.js'

const JSON_FIELDS = new Set(['education', 'interests', 'organizations', 'plk'])

const profileRow = (profile) => {
  const row = { ...profile }
  for (const field of JSON_FIELDS) {
    row[field] = JSON.stringify(Array.isArray(row[field]) ? row[field] : [])
  }
  return row
}

const projectRow = (project) => {
  const row = { ...project }
  for (const field of ['tech', 'features', 'gallery']) {
    row[field] = JSON.stringify(Array.isArray(row[field]) ? row[field] : [])
  }
  const timestamp = new Date().toISOString()
  row.created_at = timestamp
  row.updated_at = timestamp
  delete row.project_slug
  return row
}

export async function seedDatabase(db) {
  const existing = await db.get('SELECT COUNT(*) AS count FROM profile')
  if (Number(existing?.count ?? 0) > 0) return false

  await insertRow(db, 'profile', profileRow(seedProfile))

  for (const skill of seedSkills) await insertRow(db, 'skills', skill)

  const projectIds = new Map()
  for (const project of seedProjects) {
    const id = await insertRow(db, 'projects', projectRow(project))
    projectIds.set(project.slug, id)
  }

  for (const certificate of seedCertificates) {
    await insertRow(db, 'certificates', certificate)
  }

  for (const experience of seedExperiences) {
    await insertRow(db, 'experiences', {
      ...experience,
      highlights: JSON.stringify(experience.highlights ?? []),
    })
  }

  for (const testimonial of seedTestimonials) {
    await insertRow(db, 'testimonials', {
      name: testimonial.name,
      role: testimonial.role,
      type: testimonial.type,
      organization: testimonial.organization,
      quote: testimonial.quote,
      avatar_url: testimonial.avatar_url,
      project_id: testimonial.project_slug ? projectIds.get(testimonial.project_slug) ?? null : null,
      approved: testimonial.approved,
      sort_order: testimonial.sort_order,
    })
  }

  for (const feedback of seedFeedback) {
    const projectId = projectIds.get(feedback.project_slug)
    if (!projectId) continue
    await insertRow(db, 'project_feedback', {
      project_id: projectId,
      name: feedback.name,
      email: '',
      rating: feedback.rating,
      message: feedback.message,
      approved: feedback.approved,
      created_at: feedback.created_at,
    })
  }

  for (const post of seedPosts) {
    await insertRow(db, 'posts', {
      ...post,
      tags: JSON.stringify(post.tags ?? []),
    })
  }

  for (const message of seedMessages) {
    await insertRow(db, 'messages', message)
  }

  return true
}

if (import.meta.main) {
  const db = await createDatabase()
  try {
    await runMigrations(db)
    const seeded = await seedDatabase(db)
    const created = await ensureAdmin(db)
    console.log(seeded ? 'Data contoh dimasukkan.' : 'Database sudah berisi data; seed dilewati.')
    if (created) {
      const credentials = getDefaultCredentials()
      console.log(`Admin dibuat: ${credentials.email} / ${credentials.password}`)
      if (created.usedFallback) {
        console.log('PERINGATAN: set ADMIN_EMAIL dan ADMIN_PASSWORD di .env sebelum produksi.')
      }
    }
    console.log(`Database: ${db.describe}`)
  } finally {
    await db.close()
  }
}
