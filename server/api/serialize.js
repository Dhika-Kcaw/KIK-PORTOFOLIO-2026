import { parseList } from '../../shared/content-schema.js'

const list = (value) => parseList(value)

export const serializeProfile = (row) => {
  if (!row) return null
  return {
    ...row,
    id: Number(row.id),
    education: list(row.education),
    interests: list(row.interests),
    organizations: list(row.organizations),
    plk: list(row.plk),
  }
}

export const serializeProject = (row) =>
  row
    ? {
        ...row,
        id: Number(row.id),
        tech: list(row.tech),
        features: list(row.features),
        gallery: list(row.gallery),
        featured: Boolean(row.featured),
        published: Boolean(row.published),
        sort_order: Number(row.sort_order ?? 0),
      }
    : null

export const serializeSkill = (row) =>
  row ? { ...row, id: Number(row.id), level: Number(row.level) } : null

export const serializeCertificate = (row) =>
  row ? { ...row, id: Number(row.id) } : null

export const serializeExperience = (row) =>
  row ? { ...row, id: Number(row.id), highlights: list(row.highlights) } : null

export const serializeTestimonial = (row) =>
  row
    ? {
        ...row,
        id: Number(row.id),
        project_id: row.project_id === null ? null : Number(row.project_id),
        approved: Boolean(row.approved),
      }
    : null

export const serializeFeedback = (row) =>
  row
    ? {
        ...row,
        id: Number(row.id),
        project_id: row.project_id === null ? null : Number(row.project_id),
        // Nilai di luar 1–5 tidak pernah ditampilkan: pip bintang di panel hanya
        // lima, jadi angka liar dari import manual dipangkas di sini.
        rating: Math.min(5, Math.max(1, Number(row.rating) || 5)),
        approved: Boolean(row.approved),
      }
    : null

export const serializePost = (row) =>
  row ? { ...row, id: Number(row.id), tags: list(row.tags) } : null

export const serializeMessage = (row) =>
  row
    ? {
        ...row,
        id: Number(row.id),
        approved: Boolean(row.approved),
      }
    : null

export const serializeModel = (row) =>
  row
    ? {
        ...row,
        id: Number(row.id),
        scale: Number(row.scale ?? 0),
        active: Boolean(row.active),
      }
    : null

export const serializeResource = (resource, row) => {
  switch (resource) {
    case 'projects':
      return serializeProject(row)
    case 'skills':
      return serializeSkill(row)
    case 'certificates':
      return serializeCertificate(row)
    case 'experiences':
      return serializeExperience(row)
    case 'testimonials':
      return serializeTestimonial(row)
    case 'posts':
      return serializePost(row)
    case 'models':
      return serializeModel(row)
    case 'feedback':
      return serializeFeedback(row)
    default:
      return row
  }
}
