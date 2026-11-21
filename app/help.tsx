import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AuroraBackground } from '../components/AuroraBackground';
import { GhostButton, GlassCard, IconButton, SectionHeader } from '../components/ui';
import { palette, spacing, type, useResponsive } from '../lib/theme';

/** Help & about — how the board, pledges and message writer work, privacy. */
export default function HelpScreen() {
  const router = useRouter();
  const r = useResponsive();

  return (
    <View style={styles.root}>
      <AuroraBackground />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { maxWidth: r.contentMaxWidth, alignSelf: 'center' }]}
      >
        <View style={styles.header}>
          <IconButton label="←" onPress={() => router.back()} />
          <Text style={styles.headerTitle}>Help</Text>
          <View style={styles.headerSpacer} />
        </View>

        <SectionHeader kicker="How it works" title="One drop, in four steps" />
        <GlassCard style={styles.card}>
          <Text style={styles.step}>1 · See the board</Text>
          <Text style={styles.body}>
            Open requests are sorted by urgency — Critical first — with the
            blood group, hospital and deadline on every card. Tap a group
            pill to filter by your blood type.
          </Text>
          <Text style={styles.step}>2 · Check who can give</Text>
          <Text style={styles.body}>
            The Chart view shows who can donate to whom. O- is the
            universal donor and can give to everyone; AB+ can receive from
            everyone. Always confirm with the hospital or blood bank.
          </Text>
          <Text style={styles.step}>3 · Pledge a donation</Text>
          <Text style={styles.body}>
            Open a request and tap “I can donate”. Your pledge shows up in
            My Pledges with a reminder the day before, and the request’s
            units bar moves by one.
          </Text>
          <Text style={styles.step}>4 · Write a clear message</Text>
          <Text style={styles.body}>
            The Write screen turns a few details into a respectful,
            shareable request message — ready to send to family, friends
            and donor groups.
          </Text>
        </GlassCard>

        <SectionHeader kicker="Important" title="What BloodBond is not" />
        <GlassCard style={styles.card}>
          <Text style={styles.body}>
            BloodBond is a community board that connects people who need
            blood with people who can give it. It is not medical advice and
            does not arrange donations itself — hospitals and blood banks
            decide who can donate and when. If someone needs blood urgently,
            call the hospital or emergency services directly.
          </Text>
        </GlassCard>

        <SectionHeader kicker="Demo mode" title="Live AI vs on-device" />
        <GlassCard style={styles.card}>
          <Text style={styles.body}>
            When the live Java backend is connected, request messages come
            from Gemini and carry a LIVE AI badge. Until then, the app writes
            on-device with a rule-based writer and marks it DEMO — it only
            uses the details you actually typed, and never invents a fact.
          </Text>
        </GlassCard>

        <SectionHeader kicker="Your data" title="Privacy" />
        <GlassCard style={styles.card}>
          <Text style={styles.body}>
            Requests, pledges and messages live on your device, and sync to
            your account when you sign in. Nothing is shared with anyone
            else. The demo requests and donors are sample data; clear them
            from Settings when you are ready. Only share a patient’s first
            name — never a full name or medical record.
          </Text>
        </GlassCard>

        <SectionHeader kicker="About" title="BloodBond" />
        <GlassCard style={styles.card}>
          <Text style={styles.body}>
            BloodBond is a community blood-donor and request board — built by
            Aryanmouli Cherupalli. Designed in Figma; React Native + Expo +
            TypeScript, Gemini AI for the message writer (Java Spring Boot
            service), Firebase for accounts and sync.
          </Text>
        </GlassCard>

        <GhostButton label="Back to the board" onPress={() => router.replace('/')} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 48, width: '100%' },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: spacing.md },
  headerTitle: { ...type.title, color: palette.ink, flex: 1 },
  headerSpacer: { width: 44 },
  card: { gap: 10, marginBottom: spacing.xl, padding: spacing.md },
  step: { ...type.subtitle, color: palette.ink },
  body: { ...type.body, color: palette.body },
});
