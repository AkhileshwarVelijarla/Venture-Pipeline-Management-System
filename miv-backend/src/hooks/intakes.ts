import type { CollectionAfterChangeHook, CollectionBeforeChangeHook } from 'payload'
import { emailService, type IntakeEmailData } from '@/lib/email-service'

type WSSAnswer = 'no_difficulty' | 'some_difficulty' | 'a_lot_of_difficulty' | 'cannot_do_at_all'
type TriageTrack = 'unassigned' | 'fast' | 'slow'

interface IntakeHookData extends IntakeEmailData {
  id: string
  venture?: string | { id?: string | null } | null
  wss?: Record<string, WSSAnswer | null | undefined>
  triageTrack?: TriageTrack | null
}

const getRelationshipId = (value: IntakeHookData['venture']): string | undefined => {
  if (!value) return undefined
  if (typeof value === 'string') return value
  return value.id ?? undefined
}

export const setDisabilityFlag: CollectionBeforeChangeHook = async ({ data }) => {
  const intakeData = data as IntakeHookData | undefined

  if (intakeData?.wss) {
    const difficult = Object.values(intakeData.wss).some(
      (v) => v === 'a_lot_of_difficulty' || v === 'cannot_do_at_all',
    )
    return { ...intakeData, disabilityFlag: difficult }
  }
  return data
}

export const afterIntakeCreate: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== 'create') return
  const payload = req.payload
  const intakeDoc = doc as IntakeHookData
  let ventureId = getRelationshipId(intakeDoc.venture)

  // If no venture linked, create one
  if (!ventureId) {
    const venture = await payload.create({
      collection: 'ventures',
      data: {
        name_en: intakeDoc.ventureName_en || 'Untitled venture application',
        name_km: intakeDoc.ventureName_km,
        country: intakeDoc.country || 'Unknown',
        triageTrack: intakeDoc.triageTrack || 'unassigned',
        triageRationale: intakeDoc.triageRationale,
      } as never,
    })
    ventureId = venture.id
    await payload.update({
      collection: 'onboardingIntakes',
      id: intakeDoc.id,
      data: { venture: ventureId } as never,
    })
  }

  // Link venture.latestIntake
  await payload.update({
    collection: 'ventures',
    id: ventureId,
    data: { latestIntake: intakeDoc.id } as never,
  })

  // Agreements stubs if not exist
  const existing = await payload.find({
    collection: 'agreements',
    where: { venture: { equals: ventureId } },
    limit: 2,
  })

  if (existing.totalDocs === 0) {
    await payload.create({
      collection: 'agreements',
      data: { venture: ventureId, type: 'NDA', status: 'not_requested' },
    })
    await payload.create({
      collection: 'agreements',
      data: { venture: ventureId, type: 'MOU', status: 'not_requested' },
    })
  }

  // Activity log
  await payload.create({
    collection: 'activityLogs',
    data: {
      action: 'intake.created',
      entity: 'onboardingIntakes',
      entityId: String(intakeDoc.id),
      timestamp: new Date().toISOString(),
    },
  })

  const founderEmail = intakeDoc.founders?.[0]?.email ?? undefined

  await Promise.all([
    emailService.sendIntakeConfirmationToFounder(founderEmail, intakeDoc),
    emailService.sendIntakeNotificationToAdmin(process.env.ADMIN_NOTIFICATION_EMAIL, intakeDoc),
  ])
}
