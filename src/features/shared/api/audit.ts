import { supabase } from '@/lib/supabase/client'

type AuditInput = {
  organizationId: string
  actorProfileId: string
  action: string
  entityType: string
  entityId?: string
  metadata?: Record<string, unknown>
}

export async function recordAuditEvent(input: AuditInput) {
  if (!supabase) {
    return
  }

  await supabase.from('audit_logs').insert({
    organization_id: input.organizationId,
    actor_profile_id: input.actorProfileId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
  })
}
