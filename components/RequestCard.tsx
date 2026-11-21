import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { GlassCard } from './ui';
import { daysUntil, unitsStillNeeded } from '../lib/blood';
import { palette, radii, spacing, type } from '../lib/theme';
import { URGENCY_LABELS, type BloodRequest } from '../lib/types';

/** Urgency ribbon — solid crimson for Critical, amber for Urgent, green for Routine. */
export function UrgencyRibbon({ urgency }: { urgency: BloodRequest['urgency'] }) {
  const color =
    urgency === 'critical' ? palette.critical : urgency === 'urgent' ? palette.urgent : palette.routine;
  return (
    <View style={[styles.ribbon, { backgroundColor: color }]}>
      <Text style={styles.ribbonText}>{URGENCY_LABELS[urgency].toUpperCase()}</Text>
    </View>
  );
}

/** Blood-group badge — crimson circle with the white group. */
export function BloodBadge({ group, size = 56 }: { group: string; size?: number }) {
  return (
    <View style={[styles.badge, { height: size, width: size, borderRadius: size / 2 }]}>
      <Text style={[styles.badgeText, { fontSize: size * 0.36 }]}>{group}</Text>
    </View>
  );
}

/** Progress strip: pledged units against units needed. */
export function UnitsBar({ request }: { request: BloodRequest }) {
  const pct =
    request.unitsNeeded > 0
      ? Math.min(100, Math.round((request.unitsPledged / request.unitsNeeded) * 100))
      : 0;
  const done = unitsStillNeeded(request) === 0;
  return (
    <View>
      <View style={styles.unitsRow}>
        <Text style={styles.unitsText}>
          {request.unitsPledged} of {request.unitsNeeded} units pledged
        </Text>
        <Text style={[styles.unitsText, done && styles.unitsDone]}>
          {done ? 'Covered' : `${unitsStillNeeded(request)} still needed`}
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${pct}%`, backgroundColor: done ? palette.success : palette.primary },
          ]}
        />
      </View>
    </View>
  );
}

/**
 * Request card — the board's feed row. Urgency ribbon top-right, blood
 * badge left, patient + hospital, units bar, deadline line. Tapping
 * opens the request detail.
 */
export function RequestCard({
  request,
  index,
  selected,
}: {
  request: BloodRequest;
  index: number;
  selected?: boolean;
}) {
  const days = daysUntil(request.deadline);
  const deadlineLabel =
    days < 0 ? `Overdue by ${-days} ${-days === 1 ? 'day' : 'days'}` : days === 0 ? 'Needed today' : `Needed in ${days} ${days === 1 ? 'day' : 'days'}`;
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <GlassCard style={[styles.card, selected && styles.cardSelected]}>
        <View style={styles.topRow}>
          <BloodBadge group={request.bloodGroup} />
          <View style={styles.main}>
            <Text style={styles.patient} numberOfLines={1}>
              {request.patientName} · {request.unitsNeeded} {request.unitsNeeded === 1 ? 'unit' : 'units'}
            </Text>
            <Text style={styles.hospital} numberOfLines={1}>
              {request.hospital}, {request.city}
            </Text>
          </View>
          <UrgencyRibbon urgency={request.urgency} />
        </View>
        <UnitsBar request={request} />
        <Text style={styles.deadline}>
          {deadlineLabel} · Contact: {request.contactName}
          {request.isDemo ? ' · Demo' : ''}
        </Text>
      </GlassCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, marginBottom: spacing.md, padding: spacing.md },
  cardSelected: { borderColor: palette.primary, borderWidth: 2 },
  topRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
  main: { flex: 1, minWidth: 0, paddingTop: 4 },
  patient: { ...type.subtitle, color: palette.ink },
  hospital: { ...type.body, color: palette.body, marginTop: 2 },
  badge: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    justifyContent: 'center',
    ...{ shadowColor: palette.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  },
  badgeText: { color: '#FFFFFF', fontFamily: 'BebasNeue_400Regular', letterSpacing: 0.5 },
  ribbon: {
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ribbonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  unitsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  unitsText: { ...type.caption, color: palette.body },
  unitsDone: { color: palette.success },
  track: {
    backgroundColor: palette.primaryPale,
    borderRadius: 6,
    height: 10,
    marginTop: 6,
    overflow: 'hidden',
  },
  fill: { borderRadius: 6, height: '100%' },
  deadline: { ...type.body, color: palette.muted },
});
