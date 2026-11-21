import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { GlassCard } from './ui';
import { BloodBadge } from './RequestCard';
import { daysSince } from '../lib/blood';
import { palette, spacing, type } from '../lib/theme';
import { type Donor } from '../lib/types';

/**
 * Donor card — initials avatar, name, blood group, distance and
 * availability. Unavailable donors (donated within the last 56 days)
 * show when they are next eligible instead of an invite.
 */
export function DonorCard({ donor, index }: { donor: Donor; index: number }) {
  const since = daysSince(donor.lastDonation);
  const lastLabel =
    since === null ? 'Never donated' : since === 0 ? 'Donated today' : `Last donated ${since} ${since === 1 ? 'day' : 'days'} ago`;
  const initials = donor.name
    .split(' ')
    .map((p) => p.slice(0, 1))
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <GlassCard style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.main}>
          <Text style={styles.name} numberOfLines={1}>
            {donor.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {donor.bloodGroup} · {donor.distanceKm.toFixed(1)} km · {donor.city}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {lastLabel}
            {donor.isDemo ? ' · Demo' : ''}
          </Text>
        </View>
        <View style={styles.right}>
          <BloodBadge group={donor.bloodGroup} size={48} />
          <Text style={[styles.avail, donor.available ? styles.availYes : styles.availNo]}>
            {donor.available ? 'Available' : 'Not yet eligible'}
          </Text>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: spacing.md, padding: spacing.md },
  avatar: {
    alignItems: 'center',
    backgroundColor: palette.primarySoft,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  avatarText: { color: palette.primary, fontSize: 18, fontWeight: '800' },
  main: { flex: 1, minWidth: 0 },
  name: { ...type.subtitle, color: palette.ink },
  meta: { ...type.body, color: palette.body, marginTop: 2 },
  right: { alignItems: 'center', gap: 6 },
  avail: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textAlign: 'center' },
  availYes: { color: palette.success },
  availNo: { color: palette.muted },
});
