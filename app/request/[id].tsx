import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AuroraBackground } from '../../components/AuroraBackground';
import { ReceiveLine } from '../../components/CompatibilityChart';
import { BloodBadge, UnitsBar, UrgencyRibbon } from '../../components/RequestCard';
import { EmptyState, GlassCard, GhostButton, IconButton, PrimaryButton } from '../../components/ui';
import { daysUntil, demoMessage, formatDate, unitsStillNeeded } from '../../lib/blood';
import { useApp } from '../../lib/store';
import { palette, spacing, type, useResponsive } from '../../lib/theme';

/**
 * Request detail — one request, everything a donor needs to decide.
 * Big blood badge, urgency ribbon, units bar, who can donate, contact,
 * and the pledge flow: "I can donate" saves a pledge with a reminder
 * the day before, and confirms right here where the user is looking.
 */
export default function RequestDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { requestById, addPledge, pledges, completePledge, cancelPledge } = useApp();
  const r = useResponsive();
  const [notice, setNotice] = useState<string | null>(null);

  const request = requestById(typeof id === 'string' ? id : '');
  const activePledge = request
    ? pledges.find((p) => p.requestId === request.id && p.status === 'pledged')
    : undefined;

  if (!request) {
    return (
      <View style={styles.root}>
        <AuroraBackground />
        <View style={styles.center}>
          <EmptyState
            glyph="💧"
            title="Request not found"
            body="This request may have been cleared. The board always has the open requests."
            actionLabel="Back to the board"
            onAction={() => router.replace('/')}
          />
        </View>
      </View>
    );
  }

  const days = daysUntil(request.deadline);
  const deadlineLabel =
    days < 0 ? `Overdue by ${-days} ${-days === 1 ? 'day' : 'days'}` : days === 0 ? 'Needed today' : `Needed in ${days} ${days === 1 ? 'day' : 'days'}`;
  const covered = unitsStillNeeded(request) === 0;

  const pledge = () => {
    const made = addPledge(request.id);
    setNotice(
      made
        ? `Thank you — your pledge is saved in My Pledges, with a reminder on ${made.reminder}.`
        : 'You already have an active pledge for this request.',
    );
  };

  const share = () => {
    const draft = demoMessage({
      patientName: request.patientName,
      bloodGroup: request.bloodGroup,
      unitsNeeded: request.unitsNeeded,
      hospital: request.hospital,
      city: request.city,
      urgency: request.urgency,
      deadline: request.deadline,
      contactName: request.contactName,
      contactPhone: request.contactPhone,
      notes: request.notes,
    });
    void Share.share({ message: draft.message, title: draft.title });
  };

  const writeMessage = () => {
    router.push({
      pathname: '/write',
      params: {
        patientName: request.patientName,
        bloodGroup: request.bloodGroup,
        unitsNeeded: String(request.unitsNeeded),
        hospital: request.hospital,
        city: request.city,
        urgency: request.urgency,
        deadline: request.deadline,
        contactName: request.contactName,
        contactPhone: request.contactPhone,
        notes: request.notes,
      },
    } as never);
  };

  return (
    <View style={styles.root}>
      <AuroraBackground />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { maxWidth: r.contentMaxWidth, alignSelf: 'center' }]}
      >
        <View style={styles.header}>
          <IconButton label="←" onPress={() => router.back()} />
          <Text style={styles.headerTitle}>Request</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Animated.View entering={FadeInDown.springify()}>
          <GlassCard style={styles.heroCard}>
            <View style={styles.heroTop}>
              <BloodBadge group={request.bloodGroup} size={88} />
              <View style={styles.heroMain}>
                <Text style={styles.patient}>{request.patientName}</Text>
                <Text style={styles.hospital}>{request.hospital}</Text>
                <Text style={styles.hospital}>{request.city}</Text>
              </View>
              <UrgencyRibbon urgency={request.urgency} />
            </View>
            <UnitsBar request={request} />
            <Text style={styles.deadline}>
              {deadlineLabel} · Needed by {formatDate(request.deadline)}
            </Text>
            {request.notes ? <Text style={styles.notes}>{request.notes}</Text> : null}
            {request.isDemo ? (
              <Text style={styles.demoNote}>Demo request — clear demo data in Settings.</Text>
            ) : null}
          </GlassCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).springify()}>
          <GlassCard style={styles.card}>
            <Text style={styles.kicker}>WHO CAN DONATE</Text>
            <ReceiveLine group={request.bloodGroup} />
            <Text style={styles.body}>
              O- is the universal donor and can give to everyone. Always
              confirm with the hospital or blood bank before donating.
            </Text>
          </GlassCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).springify()}>
          <GlassCard style={styles.card}>
            <Text style={styles.kicker}>CONTACT</Text>
            <Text style={styles.contactName}>{request.contactName}</Text>
            <Text style={styles.body}>{request.contactPhone}</Text>
            <Text style={styles.body}>
              Reach out before heading over — hospitals confirm the timing
              and the exact unit count.
            </Text>
          </GlassCard>
        </Animated.View>

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        {activePledge ? (
          <Animated.View entering={FadeInDown.delay(160).springify()}>
            <GlassCard style={styles.card}>
              <Text style={styles.kicker}>YOUR PLEDGE</Text>
              <Text style={styles.body}>
                You pledged 1 unit for {formatDate(activePledge.date)}.
                {activePledge.reminder ? ` Reminder: ${activePledge.reminder}.` : ''}
              </Text>
              <PrimaryButton
                label="Mark donation done"
                onPress={() => {
                  completePledge(activePledge.id);
                  setNotice('Thank you — marked done. It now shows under Past pledges.');
                }}
              />
              <GhostButton
                label="Cancel this pledge"
                onPress={() => {
                  cancelPledge(activePledge.id);
                  setNotice('Pledge cancelled — the unit is open again on the board.');
                }}
              />
            </GlassCard>
          </Animated.View>
        ) : covered ? (
          <GlassCard style={styles.card}>
            <Text style={styles.kicker}>COVERED</Text>
            <Text style={styles.body}>
              All {request.unitsNeeded} {request.unitsNeeded === 1 ? 'unit' : 'units'} are pledged.
              Thank you to everyone who stepped up — look at the other open
              requests if you can still help.
            </Text>
            <PrimaryButton label="See open requests" onPress={() => router.replace('/')} />
          </GlassCard>
        ) : (
          <PrimaryButton label="♥  I can donate" onPress={pledge} />
        )}

        <GhostButton label="Share this request" onPress={share} />
        <GhostButton label="Write an AI message for it" onPress={writeMessage} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center' },
  scroll: { padding: 20, paddingBottom: 48, width: '100%' },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: spacing.md },
  headerTitle: { ...type.title, color: palette.ink, flex: 1 },
  headerSpacer: { width: 44 },
  heroCard: { gap: 12, marginBottom: spacing.lg, padding: spacing.lg },
  heroTop: { alignItems: 'flex-start', flexDirection: 'row', gap: 14 },
  heroMain: { flex: 1, minWidth: 0, paddingTop: 6 },
  patient: { ...type.title, color: palette.ink },
  hospital: { ...type.body, color: palette.body, marginTop: 2 },
  deadline: { ...type.body, color: palette.muted },
  notes: { ...type.body, color: palette.ink },
  demoNote: { ...type.body, color: palette.muted },
  card: { gap: 10, marginBottom: spacing.lg, padding: spacing.md },
  kicker: { ...type.label, color: palette.primary },
  body: { ...type.body, color: palette.body },
  contactName: { ...type.subtitle, color: palette.ink },
  notice: { ...type.bodyStrong, color: palette.success, marginBottom: spacing.md, textAlign: 'center' },
});
