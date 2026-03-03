import { randomUUID } from 'node:crypto';

import { BffError } from '../errors.js';
import type {
  NotificationAlertType,
  NotificationDeliveryRecord,
  NotificationDeliveryStatus,
  NotificationEventPayload,
  NotificationEventStatus,
  NotificationScopeKind,
  NotificationSubscriptionRecord,
  NotificationSubscriptionUpsert,
  StoredNotificationDevice,
  StoredNotificationEvent,
} from './contracts.js';

export type NotificationDeviceRegistrationInput = {
  authSubject: string;
  deviceId: string;
  tokenHash: string;
  tokenCiphertext: string;
  platform: 'ios' | 'android';
  provider: 'apns' | 'fcm';
  appVersion: string;
  locale: 'fr' | 'en';
  timezone: string;
};

export type NotificationDeviceProjection = {
  id: string;
  deviceId: string;
  lastSeenAt: string;
  tokenCiphertext: string;
};

export type PendingDeliveryWithDevice = NotificationDeliveryRecord & {
  tokenCiphertext: string;
};

export type PendingDeliveriesPage = {
  items: PendingDeliveryWithDevice[];
  nextCursor: string | null;
};

type DeliveryInitialStatus = 'pending' | 'deferred';

export type NotificationsStore = {
  registerDevice: (input: NotificationDeviceRegistrationInput) => Promise<StoredNotificationDevice>;
  revokeDeviceByTokenHash: (input: { tokenHash: string }) => Promise<void>;
  deleteByAuthSubject: (input: { authSubject: string }) => Promise<void>;
  markDeviceInvalid: (input: { deviceId: string }) => Promise<void>;
  upsertSubscriptions: (input: NotificationSubscriptionUpsert) => Promise<NotificationSubscriptionRecord[]>;
  listSubscriptions: (input: {
    authSubject: string;
    deviceId: string;
    scopeKind: NotificationScopeKind;
    scopeId: string;
  }) => Promise<NotificationSubscriptionRecord[]>;
  insertEventIfAbsent: (event: NotificationEventPayload) => Promise<{ event: StoredNotificationEvent; created: boolean }>;
  markEventStatus: (input: { eventId: string; status: NotificationEventStatus }) => Promise<void>;
  findEligibleDevicesForEvent: (event: StoredNotificationEvent) => Promise<NotificationDeviceProjection[]>;
  createDeliveries: (input: {
    eventId: string;
    alertType: NotificationAlertType;
    deviceIds: string[];
    initialStatus?: DeliveryInitialStatus;
  }) => Promise<void>;
  listPendingDeliveries: (input: { eventId: string }) => Promise<PendingDeliveryWithDevice[]>;
  listPendingDeliveriesPage: (input: {
    eventId: string;
    limit: number;
    cursor?: string | null;
  }) => Promise<PendingDeliveriesPage>;
  promoteDeferredDeliveries: (input: {
    eventId: string;
    limit: number;
  }) => Promise<string[]>;
  countDeferredDeliveries: (input: { eventId: string }) => Promise<number>;
  markDeliveryStatus: (input: {
    deliveryId: string;
    status: NotificationDeliveryStatus;
    providerMessageId?: string | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    incrementAttempts?: boolean;
  }) => Promise<void>;
  markDeliveryOpenedByEventAndDevice: (input: {
    eventId: string;
    authSubject: string;
    deviceId: string;
  }) => Promise<number>;
  close: () => Promise<void>;
};

function nowIso(): string {
  return new Date().toISOString();
}

function toEventStatusOnInsert(): NotificationEventStatus {
  return 'received';
}

type DeliveriesCursorValue = {
  createdAt: string;
  deliveryId: string;
};

function compareCursor(a: DeliveriesCursorValue, b: DeliveriesCursorValue): number {
  const byCreatedAt = a.createdAt.localeCompare(b.createdAt);
  if (byCreatedAt !== 0) {
    return byCreatedAt;
  }

  return a.deliveryId.localeCompare(b.deliveryId);
}

function encodeDeliveriesCursor(value: DeliveriesCursorValue): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function decodeDeliveriesCursor(cursor: string | null | undefined): DeliveriesCursorValue | null {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      createdAt?: unknown;
      deliveryId?: unknown;
    };
    if (typeof parsed.createdAt !== 'string' || typeof parsed.deliveryId !== 'string') {
      return null;
    }

    return {
      createdAt: parsed.createdAt,
      deliveryId: parsed.deliveryId,
    };
  } catch {
    return null;
  }
}

class InMemoryNotificationsStore implements NotificationsStore {
  private devices = new Map<string, StoredNotificationDevice>();

  private subscriptions = new Map<string, NotificationSubscriptionRecord>();

  private eventsById = new Map<string, StoredNotificationEvent>();

  private eventsBySourceKey = new Map<string, string>();

  private deliveries = new Map<string, NotificationDeliveryRecord>();

  async registerDevice(input: NotificationDeviceRegistrationInput): Promise<StoredNotificationDevice> {
    const existingByToken = [...this.devices.values()].find(device => device.tokenHash === input.tokenHash);
    const now = nowIso();
    const nextDevice: StoredNotificationDevice = {
      id: existingByToken?.id ?? randomUUID(),
      authSubject: input.authSubject,
      deviceId: input.deviceId,
      tokenHash: input.tokenHash,
      tokenCiphertext: input.tokenCiphertext,
      platform: input.platform,
      provider: input.provider,
      locale: input.locale,
      timezone: input.timezone,
      appVersion: input.appVersion,
      status: 'active',
      lastSeenAt: now,
      createdAt: existingByToken?.createdAt ?? now,
      updatedAt: now,
    };

    this.devices.set(nextDevice.id, nextDevice);
    return nextDevice;
  }

  async revokeDeviceByTokenHash(input: { tokenHash: string }): Promise<void> {
    for (const [deviceId, device] of this.devices.entries()) {
      if (device.tokenHash === input.tokenHash) {
        this.devices.set(deviceId, {
          ...device,
          status: 'revoked',
          updatedAt: nowIso(),
        });
      }
    }
  }

  async deleteByAuthSubject(input: { authSubject: string }): Promise<void> {
    const removedDeviceIds = new Set(
      [...this.devices.values()]
        .filter(device => device.authSubject === input.authSubject)
        .map(device => device.id),
    );
    if (removedDeviceIds.size === 0) {
      return;
    }

    for (const [deviceId] of this.devices.entries()) {
      if (removedDeviceIds.has(deviceId)) {
        this.devices.delete(deviceId);
      }
    }

    for (const [key, subscription] of this.subscriptions.entries()) {
      if (removedDeviceIds.has(subscription.deviceId)) {
        this.subscriptions.delete(key);
      }
    }

    for (const [key, delivery] of this.deliveries.entries()) {
      if (removedDeviceIds.has(delivery.deviceId)) {
        this.deliveries.delete(key);
      }
    }
  }

  async markDeviceInvalid(input: { deviceId: string }): Promise<void> {
    const current = this.devices.get(input.deviceId);
    if (!current) {
      return;
    }
    this.devices.set(input.deviceId, {
      ...current,
      status: 'invalid',
      updatedAt: nowIso(),
    });
  }

  async upsertSubscriptions(input: NotificationSubscriptionUpsert): Promise<NotificationSubscriptionRecord[]> {
    const activeDevice = [...this.devices.values()]
      .filter(
        device =>
          device.authSubject === input.authSubject
          && device.deviceId === input.deviceId
          && device.status === 'active',
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

    if (!activeDevice) {
      throw new BffError(404, 'NOTIFICATION_DEVICE_NOT_FOUND', 'Notification device registration is required.');
    }

    const updated: NotificationSubscriptionRecord[] = [];
    const now = nowIso();

    input.subscriptions.forEach(subscription => {
      const key = `${activeDevice.id}:${input.scopeKind}:${input.scopeId}:${subscription.alertType}`;
      const existing = this.subscriptions.get(key);
      const next: NotificationSubscriptionRecord = {
        id: existing?.id ?? randomUUID(),
        deviceId: activeDevice.id,
        scopeKind: input.scopeKind,
        scopeId: input.scopeId,
        alertType: subscription.alertType,
        enabled: subscription.enabled,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      this.subscriptions.set(key, next);
      updated.push(next);
    });

    return updated;
  }

  async listSubscriptions(input: {
    authSubject: string;
    deviceId: string;
    scopeKind: NotificationScopeKind;
    scopeId: string;
  }): Promise<NotificationSubscriptionRecord[]> {
    const activeDevice = [...this.devices.values()]
      .filter(
        device =>
          device.authSubject === input.authSubject
          && device.deviceId === input.deviceId
          && device.status === 'active',
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

    if (!activeDevice) {
      return [];
    }

    return [...this.subscriptions.values()].filter(
      subscription =>
        subscription.deviceId === activeDevice.id
        && subscription.scopeKind === input.scopeKind
        && subscription.scopeId === input.scopeId,
    );
  }

  async insertEventIfAbsent(eventPayload: NotificationEventPayload): Promise<{ event: StoredNotificationEvent; created: boolean }> {
    const sourceKey = `${eventPayload.source}:${eventPayload.externalEventId}`;
    const existingEventId = this.eventsBySourceKey.get(sourceKey);
    if (existingEventId) {
      const existing = this.eventsById.get(existingEventId);
      if (existing) {
        return { event: existing, created: false };
      }
    }

    const now = nowIso();
    const event: StoredNotificationEvent = {
      ...eventPayload,
      id: randomUUID(),
      status: toEventStatusOnInsert(),
      createdAt: now,
      updatedAt: now,
    };

    this.eventsById.set(event.id, event);
    this.eventsBySourceKey.set(sourceKey, event.id);
    return { event, created: true };
  }

  async markEventStatus(input: { eventId: string; status: NotificationEventStatus }): Promise<void> {
    const current = this.eventsById.get(input.eventId);
    if (!current) {
      return;
    }

    this.eventsById.set(input.eventId, {
      ...current,
      status: input.status,
      updatedAt: nowIso(),
    });
  }

  async findEligibleDevicesForEvent(event: StoredNotificationEvent): Promise<NotificationDeviceProjection[]> {
    const activeDevices = new Map(
      [...this.devices.values()]
        .filter(device => device.status === 'active')
        .map(device => [device.id, device]),
    );

    const deviceIds = new Set<string>();
    for (const subscription of this.subscriptions.values()) {
      if (!subscription.enabled || subscription.alertType !== event.alertType) {
        continue;
      }

      const matchesScope =
        (subscription.scopeKind === 'match' && Boolean(event.fixtureId) && subscription.scopeId === event.fixtureId)
        || (subscription.scopeKind === 'competition' && Boolean(event.competitionId) && subscription.scopeId === event.competitionId)
        || (subscription.scopeKind === 'team' && event.teamIds.includes(subscription.scopeId))
        || (subscription.scopeKind === 'player' && event.playerIds.includes(subscription.scopeId));

      if (!matchesScope) {
        continue;
      }

      if (activeDevices.has(subscription.deviceId)) {
        deviceIds.add(subscription.deviceId);
      }
    }

    return [...deviceIds].map(deviceId => ({
      id: deviceId,
      deviceId: activeDevices.get(deviceId)?.deviceId ?? '',
      lastSeenAt: activeDevices.get(deviceId)?.lastSeenAt ?? nowIso(),
      tokenCiphertext: activeDevices.get(deviceId)?.tokenCiphertext ?? '',
    }));
  }

  async createDeliveries(input: {
    eventId: string;
    alertType: NotificationAlertType;
    deviceIds: string[];
    initialStatus?: DeliveryInitialStatus;
  }): Promise<void> {
    const now = nowIso();
    const initialStatus = input.initialStatus ?? 'pending';
    input.deviceIds.forEach(deviceId => {
      const key = `${input.eventId}:${deviceId}:${input.alertType}`;
      if (this.deliveries.has(key)) {
        return;
      }

      const delivery: NotificationDeliveryRecord = {
        id: randomUUID(),
        eventId: input.eventId,
        deviceId,
        alertType: input.alertType,
        status: initialStatus,
        attempts: 0,
        providerMessageId: null,
        errorCode: null,
        errorMessage: null,
        sentAt: null,
        openedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      this.deliveries.set(key, delivery);
    });
  }

  async listPendingDeliveries(input: { eventId: string }): Promise<PendingDeliveryWithDevice[]> {
    const page = await this.listPendingDeliveriesPage({
      eventId: input.eventId,
      limit: Number.MAX_SAFE_INTEGER,
      cursor: null,
    });

    return page.items;
  }

  async listPendingDeliveriesPage(input: {
    eventId: string;
    limit: number;
    cursor?: string | null;
  }): Promise<PendingDeliveriesPage> {
    const cursor = decodeDeliveriesCursor(input.cursor);
    const limit = Math.max(1, Math.floor(input.limit));

    const deliveries = [...this.deliveries.values()]
      .filter(
        delivery =>
          delivery.eventId === input.eventId
          && delivery.status === 'pending',
      )
      .sort((a, b) =>
        compareCursor(
          { createdAt: a.createdAt, deliveryId: a.id },
          { createdAt: b.createdAt, deliveryId: b.id },
        ));

    const filteredDeliveries = cursor
      ? deliveries.filter(delivery =>
        compareCursor(
          { createdAt: delivery.createdAt, deliveryId: delivery.id },
          cursor,
        ) > 0)
      : deliveries;

    const selected = filteredDeliveries.slice(0, limit + 1);
    const hasMore = selected.length > limit;
    const pageItems = selected.slice(0, limit)
      .map(delivery => {
        const device = this.devices.get(delivery.deviceId);
        if (!device || device.status !== 'active') {
          return null;
        }

        return {
          ...delivery,
          tokenCiphertext: device.tokenCiphertext,
        };
      })
      .filter(Boolean) as PendingDeliveryWithDevice[];

    const lastItem = selected[Math.min(limit, selected.length) - 1];
    const nextCursor = hasMore && lastItem
      ? encodeDeliveriesCursor({
        createdAt: lastItem.createdAt,
        deliveryId: lastItem.id,
      })
      : null;

    return {
      items: pageItems,
      nextCursor,
    };
  }

  async promoteDeferredDeliveries(input: {
    eventId: string;
    limit: number;
  }): Promise<string[]> {
    const limit = Math.max(1, Math.floor(input.limit));
    const deferred = [...this.deliveries.values()]
      .filter(
        delivery =>
          delivery.eventId === input.eventId
          && delivery.status === 'deferred',
      )
      .sort((a, b) =>
        compareCursor(
          { createdAt: a.createdAt, deliveryId: a.id },
          { createdAt: b.createdAt, deliveryId: b.id },
        ))
      .slice(0, limit);

    const promotedIds: string[] = [];
    const now = nowIso();
    for (const delivery of deferred) {
      const key = `${delivery.eventId}:${delivery.deviceId}:${delivery.alertType}`;
      this.deliveries.set(key, {
        ...delivery,
        status: 'pending',
        updatedAt: now,
      });
      promotedIds.push(delivery.id);
    }

    return promotedIds;
  }

  async countDeferredDeliveries(input: { eventId: string }): Promise<number> {
    return [...this.deliveries.values()].filter(
      delivery => delivery.eventId === input.eventId && delivery.status === 'deferred',
    ).length;
  }

  async markDeliveryStatus(input: {
    deliveryId: string;
    status: NotificationDeliveryStatus;
    providerMessageId?: string | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    incrementAttempts?: boolean;
  }): Promise<void> {
    for (const [key, delivery] of this.deliveries.entries()) {
      if (delivery.id !== input.deliveryId) {
        continue;
      }

      this.deliveries.set(key, {
        ...delivery,
        status: input.status,
        providerMessageId: input.providerMessageId ?? delivery.providerMessageId,
        errorCode: input.errorCode ?? delivery.errorCode,
        errorMessage: input.errorMessage ?? delivery.errorMessage,
        attempts: input.incrementAttempts ? delivery.attempts + 1 : delivery.attempts,
        sentAt: input.status === 'sent' ? nowIso() : delivery.sentAt,
        updatedAt: nowIso(),
      });
      return;
    }
  }

  async markDeliveryOpenedByEventAndDevice(input: {
    eventId: string;
    authSubject: string;
    deviceId: string;
  }): Promise<number> {
    const matchingDeviceIds = new Set(
      [...this.devices.values()]
        .filter(
          device => device.authSubject === input.authSubject && device.deviceId === input.deviceId,
        )
        .map(device => device.id),
    );
    if (matchingDeviceIds.size === 0) {
      return 0;
    }

    let count = 0;
    for (const [key, delivery] of this.deliveries.entries()) {
      if (delivery.eventId !== input.eventId || !matchingDeviceIds.has(delivery.deviceId)) {
        continue;
      }

      this.deliveries.set(key, {
        ...delivery,
        status: 'opened',
        openedAt: nowIso(),
        updatedAt: nowIso(),
      });
      count += 1;
    }

    return count;
  }

  async close(): Promise<void> {
    return undefined;
  }
}

type PostgresQueryable = {
  query: <T = unknown>(sql: string, params?: unknown[]) => Promise<{ rows: T[] }>;
  end: () => Promise<void>;
};

class PostgresNotificationsStore implements NotificationsStore {
  constructor(private readonly client: PostgresQueryable) {}

  async registerDevice(input: NotificationDeviceRegistrationInput): Promise<StoredNotificationDevice> {
    const result = await this.client.query<StoredNotificationDevice>(
      `
        INSERT INTO push_devices (
          id,
          auth_subject,
          device_id,
          token_hash,
          token_ciphertext,
          platform,
          provider,
          locale,
          timezone,
          app_version,
          status,
          last_seen_at,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          'active',
          NOW(),
          NOW(),
          NOW()
        )
        ON CONFLICT (token_hash)
        DO UPDATE SET
          auth_subject = EXCLUDED.auth_subject,
          device_id = EXCLUDED.device_id,
          token_ciphertext = EXCLUDED.token_ciphertext,
          platform = EXCLUDED.platform,
          provider = EXCLUDED.provider,
          locale = EXCLUDED.locale,
          timezone = EXCLUDED.timezone,
          app_version = EXCLUDED.app_version,
          status = 'active',
          last_seen_at = NOW(),
          updated_at = NOW()
        RETURNING
          id,
          auth_subject AS "authSubject",
          device_id AS "deviceId",
          token_hash AS "tokenHash",
          token_ciphertext AS "tokenCiphertext",
          platform,
          provider,
          locale,
          timezone,
          app_version AS "appVersion",
          status,
          last_seen_at AS "lastSeenAt",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [
        input.authSubject,
        input.deviceId,
        input.tokenHash,
        input.tokenCiphertext,
        input.platform,
        input.provider,
        input.locale,
        input.timezone,
        input.appVersion,
      ],
    );

    return result.rows[0] as StoredNotificationDevice;
  }

  async revokeDeviceByTokenHash(input: { tokenHash: string }): Promise<void> {
    await this.client.query(
      `
        UPDATE push_devices
        SET status = 'revoked', updated_at = NOW()
        WHERE token_hash = $1
      `,
      [input.tokenHash],
    );
  }

  async deleteByAuthSubject(input: { authSubject: string }): Promise<void> {
    await this.client.query(
      `
        DELETE FROM push_devices
        WHERE auth_subject = $1
      `,
      [input.authSubject],
    );
  }

  async markDeviceInvalid(input: { deviceId: string }): Promise<void> {
    await this.client.query(
      `
        UPDATE push_devices
        SET status = 'invalid', updated_at = NOW()
        WHERE id = $1
      `,
      [input.deviceId],
    );
  }

  async upsertSubscriptions(input: NotificationSubscriptionUpsert): Promise<NotificationSubscriptionRecord[]> {
    const deviceResult = await this.client.query<{ id: string }>(
      `
        SELECT id
        FROM push_devices
        WHERE auth_subject = $1
          AND device_id = $2
          AND status = 'active'
        ORDER BY updated_at DESC
        LIMIT 1
      `,
      [input.authSubject, input.deviceId],
    );

    const device = deviceResult.rows[0];
    if (!device) {
      throw new BffError(404, 'NOTIFICATION_DEVICE_NOT_FOUND', 'Notification device registration is required.');
    }

    const upserted: NotificationSubscriptionRecord[] = [];

    for (const subscription of input.subscriptions) {
      const result = await this.client.query<NotificationSubscriptionRecord>(
        `
          INSERT INTO push_subscriptions (
            id,
            device_fk,
            scope_kind,
            scope_id,
            alert_type,
            enabled,
            created_at,
            updated_at
          ) VALUES (
            gen_random_uuid(),
            $1,
            $2,
            $3,
            $4,
            $5,
            NOW(),
            NOW()
          )
          ON CONFLICT (device_fk, scope_kind, scope_id, alert_type)
          DO UPDATE SET
            enabled = EXCLUDED.enabled,
            updated_at = NOW()
          RETURNING
            id,
            device_fk AS "deviceId",
            scope_kind AS "scopeKind",
            scope_id AS "scopeId",
            alert_type AS "alertType",
            enabled,
            created_at AS "createdAt",
            updated_at AS "updatedAt"
        `,
        [
          device.id,
          input.scopeKind,
          input.scopeId,
          subscription.alertType,
          subscription.enabled,
        ],
      );

      const row = result.rows[0];
      if (row) {
        upserted.push(row);
      }
    }

    return upserted;
  }

  async listSubscriptions(input: {
    authSubject: string;
    deviceId: string;
    scopeKind: NotificationScopeKind;
    scopeId: string;
  }): Promise<NotificationSubscriptionRecord[]> {
    const result = await this.client.query<NotificationSubscriptionRecord>(
      `
        SELECT
          s.id,
          s.device_fk AS "deviceId",
          s.scope_kind AS "scopeKind",
          s.scope_id AS "scopeId",
          s.alert_type AS "alertType",
          s.enabled,
          s.created_at AS "createdAt",
          s.updated_at AS "updatedAt"
        FROM push_subscriptions s
        JOIN push_devices d ON d.id = s.device_fk
        WHERE d.auth_subject = $1
          AND d.device_id = $2
          AND d.status = 'active'
          AND s.scope_kind = $3
          AND s.scope_id = $4
      `,
      [
        input.authSubject,
        input.deviceId,
        input.scopeKind,
        input.scopeId,
      ],
    );

    return result.rows;
  }

  async insertEventIfAbsent(eventPayload: NotificationEventPayload): Promise<{ event: StoredNotificationEvent; created: boolean }> {
    const inserted = await this.client.query<StoredNotificationEvent>(
      `
        INSERT INTO notification_events (
          id,
          source,
          external_event_id,
          alert_type,
          occurred_at,
          fixture_id,
          competition_id,
          team_ids,
          player_ids,
          title,
          body,
          payload,
          status,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7::jsonb,
          $8::jsonb,
          $9,
          $10,
          $11::jsonb,
          'received',
          NOW(),
          NOW()
        )
        ON CONFLICT (source, external_event_id)
        DO NOTHING
        RETURNING
          id,
          source,
          external_event_id AS "externalEventId",
          alert_type AS "alertType",
          occurred_at AS "occurredAt",
          fixture_id AS "fixtureId",
          competition_id AS "competitionId",
          team_ids AS "teamIds",
          player_ids AS "playerIds",
          title,
          body,
          payload,
          status,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [
        eventPayload.source,
        eventPayload.externalEventId,
        eventPayload.alertType,
        eventPayload.occurredAt,
        eventPayload.fixtureId,
        eventPayload.competitionId,
        JSON.stringify(eventPayload.teamIds),
        JSON.stringify(eventPayload.playerIds),
        eventPayload.title,
        eventPayload.body,
        JSON.stringify(eventPayload.payload),
      ],
    );

    if (inserted.rows[0]) {
      return {
        event: inserted.rows[0] as StoredNotificationEvent,
        created: true,
      };
    }

    const existing = await this.client.query<StoredNotificationEvent>(
      `
        SELECT
          id,
          source,
          external_event_id AS "externalEventId",
          alert_type AS "alertType",
          occurred_at AS "occurredAt",
          fixture_id AS "fixtureId",
          competition_id AS "competitionId",
          team_ids AS "teamIds",
          player_ids AS "playerIds",
          title,
          body,
          payload,
          status,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM notification_events
        WHERE source = $1
          AND external_event_id = $2
        LIMIT 1
      `,
      [eventPayload.source, eventPayload.externalEventId],
    );
    if (!existing.rows[0]) {
      throw new Error('Failed to resolve existing notification event after conflict.');
    }

    return {
      event: existing.rows[0],
      created: false,
    };
  }

  async markEventStatus(input: { eventId: string; status: NotificationEventStatus }): Promise<void> {
    await this.client.query(
      `
        UPDATE notification_events
        SET status = $2,
            updated_at = NOW()
        WHERE id = $1
      `,
      [input.eventId, input.status],
    );
  }

  async findEligibleDevicesForEvent(event: StoredNotificationEvent): Promise<NotificationDeviceProjection[]> {
    const params: unknown[] = [
      event.alertType,
      event.fixtureId,
      event.competitionId,
      event.teamIds,
      event.playerIds,
    ];

    const result = await this.client.query<NotificationDeviceProjection>(
      `
        SELECT DISTINCT
          d.id,
          d.device_id AS "deviceId",
          d.last_seen_at AS "lastSeenAt",
          d.token_ciphertext AS "tokenCiphertext"
        FROM push_subscriptions s
        JOIN push_devices d ON d.id = s.device_fk
        WHERE d.status = 'active'
          AND s.enabled = true
          AND s.alert_type = $1
          AND (
            (s.scope_kind = 'match' AND $2::text IS NOT NULL AND s.scope_id = $2::text)
            OR (s.scope_kind = 'competition' AND $3::text IS NOT NULL AND s.scope_id = $3::text)
            OR (s.scope_kind = 'team' AND s.scope_id = ANY($4::text[]))
            OR (s.scope_kind = 'player' AND s.scope_id = ANY($5::text[]))
          )
      `,
      params,
    );

    return result.rows;
  }

  async createDeliveries(input: {
    eventId: string;
    alertType: NotificationAlertType;
    deviceIds: string[];
    initialStatus?: DeliveryInitialStatus;
  }): Promise<void> {
    if (input.deviceIds.length === 0) {
      return;
    }

    await this.client.query(
      `
        INSERT INTO notification_deliveries (
          id,
          event_fk,
          device_fk,
          alert_type,
          status,
          attempts,
          provider_message_id,
          error_code,
          error_message,
          sent_at,
          opened_at,
          created_at,
          updated_at
        )
        SELECT
          gen_random_uuid(),
          $1,
          d.device_fk,
          $2,
          $3,
          0,
          NULL,
          NULL,
          NULL,
          NULL,
          NULL,
          NOW(),
          NOW()
        FROM UNNEST($4::uuid[]) AS d(device_fk)
        ON CONFLICT (event_fk, device_fk, alert_type)
        DO NOTHING
      `,
      [
        input.eventId,
        input.alertType,
        input.initialStatus ?? 'pending',
        input.deviceIds,
      ],
    );
  }

  async listPendingDeliveries(input: { eventId: string }): Promise<PendingDeliveryWithDevice[]> {
    const deliveries: PendingDeliveryWithDevice[] = [];
    let cursor: string | null = null;
    do {
      const page = await this.listPendingDeliveriesPage({
        eventId: input.eventId,
        limit: 500,
        cursor,
      });
      deliveries.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor);

    return deliveries;
  }

  async listPendingDeliveriesPage(input: {
    eventId: string;
    limit: number;
    cursor?: string | null;
  }): Promise<PendingDeliveriesPage> {
    const cursor = decodeDeliveriesCursor(input.cursor);
    const limit = Math.max(1, Math.floor(input.limit));
    const params: unknown[] = [input.eventId, limit + 1];
    const cursorClause = cursor
      ? `
          AND (nd.created_at, nd.id) > ($3::timestamptz, $4::uuid)
        `
      : '';
    if (cursor) {
      params.push(cursor.createdAt, cursor.deliveryId);
    }

    const result = await this.client.query<PendingDeliveryWithDevice>(
      `
        SELECT
          nd.id,
          nd.event_fk AS "eventId",
          nd.device_fk AS "deviceId",
          nd.alert_type AS "alertType",
          nd.status,
          nd.attempts,
          nd.provider_message_id AS "providerMessageId",
          nd.error_code AS "errorCode",
          nd.error_message AS "errorMessage",
          nd.sent_at AS "sentAt",
          nd.opened_at AS "openedAt",
          nd.created_at AS "createdAt",
          nd.updated_at AS "updatedAt",
          pd.token_ciphertext AS "tokenCiphertext"
        FROM notification_deliveries nd
        JOIN push_devices pd ON pd.id = nd.device_fk
        WHERE nd.event_fk = $1
          AND nd.status = 'pending'
          AND pd.status = 'active'
          ${cursorClause}
        ORDER BY nd.created_at ASC, nd.id ASC
        LIMIT $2
      `,
      params,
    );

    const hasMore = result.rows.length > limit;
    const pageRows = hasMore ? result.rows.slice(0, limit) : result.rows;
    const lastRow = pageRows[pageRows.length - 1];

    return {
      items: pageRows,
      nextCursor: hasMore && lastRow
        ? encodeDeliveriesCursor({
          createdAt: lastRow.createdAt,
          deliveryId: lastRow.id,
        })
        : null,
    };
  }

  async promoteDeferredDeliveries(input: {
    eventId: string;
    limit: number;
  }): Promise<string[]> {
    const limit = Math.max(1, Math.floor(input.limit));
    const result = await this.client.query<{ id: string }>(
      `
        WITH candidates AS (
          SELECT nd.id
          FROM notification_deliveries nd
          WHERE nd.event_fk = $1
            AND nd.status = 'deferred'
          ORDER BY nd.created_at ASC, nd.id ASC
          LIMIT $2
          FOR UPDATE SKIP LOCKED
        )
        UPDATE notification_deliveries nd
        SET status = 'pending',
            updated_at = NOW()
        FROM candidates
        WHERE nd.id = candidates.id
        RETURNING nd.id
      `,
      [input.eventId, limit],
    );

    return result.rows.map(row => row.id);
  }

  async countDeferredDeliveries(input: { eventId: string }): Promise<number> {
    const result = await this.client.query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count
        FROM notification_deliveries
        WHERE event_fk = $1
          AND status = 'deferred'
      `,
      [input.eventId],
    );

    const row = result.rows[0];
    return row ? Number.parseInt(row.count, 10) || 0 : 0;
  }

  async markDeliveryStatus(input: {
    deliveryId: string;
    status: NotificationDeliveryStatus;
    providerMessageId?: string | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    incrementAttempts?: boolean;
  }): Promise<void> {
    await this.client.query(
      `
        UPDATE notification_deliveries
        SET status = $2,
            provider_message_id = COALESCE($3, provider_message_id),
            error_code = $4,
            error_message = $5,
            attempts = CASE
              WHEN $6::boolean THEN attempts + 1
              ELSE attempts
            END,
            sent_at = CASE
              WHEN $2 = 'sent' THEN NOW()
              ELSE sent_at
            END,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        input.deliveryId,
        input.status,
        input.providerMessageId ?? null,
        input.errorCode ?? null,
        input.errorMessage ?? null,
        Boolean(input.incrementAttempts),
      ],
    );
  }

  async markDeliveryOpenedByEventAndDevice(input: {
    eventId: string;
    authSubject: string;
    deviceId: string;
  }): Promise<number> {
    const result = await this.client.query<{ id: string }>(
      `
        UPDATE notification_deliveries nd
        SET status = 'opened',
            opened_at = NOW(),
            updated_at = NOW()
        FROM push_devices pd
        WHERE nd.event_fk = $1
          AND nd.device_fk = pd.id
          AND pd.auth_subject = $2
          AND pd.device_id = $3
        RETURNING nd.id
      `,
      [input.eventId, input.authSubject, input.deviceId],
    );

    return result.rows.length;
  }

  async close(): Promise<void> {
    await this.client.end();
  }
}

export async function createNotificationsStore(options: {
  backend: 'memory' | 'postgres';
  databaseUrl: string | null;
}): Promise<NotificationsStore> {
  if (options.backend === 'memory') {
    return new InMemoryNotificationsStore();
  }

  if (!options.databaseUrl) {
    throw new Error('DATABASE_URL is required for postgres notifications backend.');
  }

  const moduleName = 'pg';
  const imported = await import(moduleName).catch(error => {
    throw new Error(`Failed to load pg module: ${String(error)}`);
  });
  const PoolConstructor = (imported as { Pool?: new (...args: unknown[]) => PostgresQueryable }).Pool;
  if (!PoolConstructor) {
    throw new Error('pg Pool constructor is unavailable.');
  }

  const pool = new PoolConstructor({
    connectionString: options.databaseUrl,
  }) as PostgresQueryable;

  await ensureNotificationsSchema(pool);

  return new PostgresNotificationsStore(pool);
}

async function ensureNotificationsSchema(client: PostgresQueryable): Promise<void> {
  await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

  await client.query(`
    CREATE TABLE IF NOT EXISTS push_devices (
      id UUID PRIMARY KEY,
      auth_subject TEXT NOT NULL,
      device_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      token_ciphertext TEXT NOT NULL,
      platform TEXT NOT NULL,
      provider TEXT NOT NULL,
      locale TEXT NOT NULL,
      timezone TEXT NOT NULL,
      app_version TEXT NOT NULL,
      status TEXT NOT NULL,
      last_seen_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_push_devices_subject_device_provider
    ON push_devices (auth_subject, device_id, provider);
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id UUID PRIMARY KEY,
      device_fk UUID NOT NULL REFERENCES push_devices(id) ON DELETE CASCADE,
      scope_kind TEXT NOT NULL,
      scope_id TEXT NOT NULL,
      alert_type TEXT NOT NULL,
      enabled BOOLEAN NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      UNIQUE (device_fk, scope_kind, scope_id, alert_type)
    );
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_scope_alert_enabled
    ON push_subscriptions (scope_kind, scope_id, alert_type, enabled);
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS notification_events (
      id UUID PRIMARY KEY,
      source TEXT NOT NULL,
      external_event_id TEXT NOT NULL,
      alert_type TEXT NOT NULL,
      occurred_at TIMESTAMPTZ NOT NULL,
      fixture_id TEXT,
      competition_id TEXT,
      team_ids JSONB NOT NULL,
      player_ids JSONB NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      payload JSONB NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      UNIQUE (source, external_event_id)
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS notification_deliveries (
      id UUID PRIMARY KEY,
      event_fk UUID NOT NULL REFERENCES notification_events(id) ON DELETE CASCADE,
      device_fk UUID NOT NULL REFERENCES push_devices(id) ON DELETE CASCADE,
      alert_type TEXT NOT NULL,
      status TEXT NOT NULL,
      attempts INTEGER NOT NULL,
      provider_message_id TEXT,
      error_code TEXT,
      error_message TEXT,
      sent_at TIMESTAMPTZ,
      opened_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      UNIQUE (event_fk, device_fk, alert_type)
    );
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_notification_deliveries_event_status_created
    ON notification_deliveries (event_fk, status, created_at);
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_notification_deliveries_device_status_created
    ON notification_deliveries (device_fk, status, created_at);
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_push_devices_status_last_seen
    ON push_devices (status, last_seen_at DESC);
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_notification_events_status_occurred
    ON notification_events (status, occurred_at DESC);
  `);
}
