import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GlassCard } from './ui';
import { CAN_DONATE_TO, canReceiveFrom } from '../lib/blood';
import { palette, spacing, type } from '../lib/theme';
import { BLOOD_GROUPS, type BloodGroup } from '../lib/types';

/**
 * Blood-type compatibility chart — the designed visual of the board.
 * A donor → recipient matrix: a filled crimson dot means the donor
 * group can give to the recipient group. Plus the two callouts every
 * donor should know: O- is the universal donor, AB+ the universal
 * recipient. Standard red-cell transfusion rules; the app always says
 * to confirm with the hospital or blood bank.
 */
export function CompatibilityChart({ highlight }: { highlight?: BloodGroup }) {
  return (
    <GlassCard style={styles.card}>
      <Text style={styles.title}>Who can give to whom</Text>
      <Text style={styles.sub}>
        Rows are donors, columns are recipients. A filled dot means that
        group can donate to that group.
      </Text>
      <View style={styles.matrix}>
        <View style={styles.row}>
          <View style={styles.corner} />
          {BLOOD_GROUPS.map((g) => (
            <Text key={g} style={[styles.head, highlight === g && styles.headHighlight]}>
              {g}
            </Text>
          ))}
        </View>
        {BLOOD_GROUPS.map((donor) => (
          <View key={donor} style={styles.row}>
            <Text style={[styles.rowLabel, highlight === donor && styles.headHighlight]}>
              {donor}
            </Text>
            {BLOOD_GROUPS.map((recipient) => {
              const can = CAN_DONATE_TO[donor].includes(recipient);
              const lit = highlight === donor || highlight === recipient;
              return (
                <View key={recipient} style={styles.cell}>
                  <View
                    style={[
                      styles.dot,
                      can ? styles.dotYes : styles.dotNo,
                      can && lit && styles.dotLit,
                    ]}
                  />
                </View>
              );
            })}
          </View>
        ))}
      </View>
      <View style={styles.callouts}>
        <View style={styles.callout}>
          <Text style={styles.calloutGroup}>O-</Text>
          <Text style={styles.calloutText}>Universal donor — can give to everyone.</Text>
        </View>
        <View style={styles.callout}>
          <Text style={styles.calloutGroup}>AB+</Text>
          <Text style={styles.calloutText}>Universal recipient — can receive from everyone.</Text>
        </View>
      </View>
      <Text style={styles.note}>
        Standard red-cell compatibility. Always confirm with the hospital
        or blood bank before donating.
      </Text>
    </GlassCard>
  );
}

/** Short line for a single group: who it can receive from. */
export function ReceiveLine({ group }: { group: BloodGroup }) {
  const donors = canReceiveFrom(group);
  return (
    <Text style={styles.receiveLine}>
      {group} can receive from: {donors.join(', ')}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, marginBottom: spacing.lg, padding: spacing.md },
  title: { ...type.title, color: palette.ink },
  sub: { ...type.body, color: palette.body },
  matrix: { gap: 4 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 2 },
  corner: { width: 34 },
  head: {
    color: palette.muted,
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  headHighlight: { color: palette.primary },
  rowLabel: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: '800',
    width: 34,
  },
  cell: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingVertical: 5 },
  dot: { borderRadius: 7, height: 14, width: 14 },
  dotYes: { backgroundColor: palette.primary },
  dotNo: { backgroundColor: palette.primaryPale },
  dotLit: { borderColor: palette.primaryDeep, borderWidth: 2, height: 18, width: 18 },
  callouts: { gap: 8, marginTop: 4 },
  callout: { alignItems: 'center', backgroundColor: palette.primaryPale, borderRadius: 16, flexDirection: 'row', gap: 10, padding: 12 },
  calloutGroup: { color: palette.primary, fontFamily: 'BebasNeue_400Regular', fontSize: 24, letterSpacing: 0.5 },
  calloutText: { ...type.body, color: palette.ink, flex: 1 },
  note: { ...type.caption, color: palette.muted },
  receiveLine: { ...type.bodyStrong, color: palette.ink },
});
