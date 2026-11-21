import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AuroraBackground } from '../components/AuroraBackground';
import { Chip, DemoBadge, EmptyState, GlassCard, IconButton, LiveBadge, PrimaryButton, GhostButton, BouncingDots, Skeleton } from '../components/ui';
import { dayKey, formatDate, todayKey, writeMessage } from '../lib/blood';
import { useApp } from '../lib/store';
import { palette, radii, spacing, type, useResponsive } from '../lib/theme';
import { BLOOD_GROUPS, URGENCIES, URGENCY_LABELS, type BloodGroup, type MessageDraft, type Urgency } from '../lib/types';

/**
 * Write a request — the AI message writer. A few details in, a clear,
 * respectful, shareable message out. The badge says honestly whether
 * the answer came from the live backend (LIVE AI) or the on-device
 * demo writer (DEMO). Saving stores the message in history; posting
 * adds it to the board as a request.
 */
export default function WriteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addRequest, saveMessage, messages } = useApp();
  const r = useResponsive();

  const [patientName, setPatientName] = useState(
    typeof params.patientName === 'string' ? params.patientName : '',
  );
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>(
    BLOOD_GROUPS.includes(params.bloodGroup as BloodGroup)
      ? (params.bloodGroup as BloodGroup)
      : 'O-',
  );
  const [units, setUnits] = useState(
    typeof params.unitsNeeded === 'string' ? params.unitsNeeded : '2',
  );
  const [hospital, setHospital] = useState(
    typeof params.hospital === 'string' ? params.hospital : '',
  );
  const [city, setCity] = useState(
    typeof params.city === 'string' ? params.city : 'Glassboro, NJ',
  );
  const [urgency, setUrgency] = useState<Urgency>(
    URGENCIES.includes(params.urgency as Urgency) ? (params.urgency as Urgency) : 'urgent',
  );
  const [deadline, setDeadline] = useState(() =>
    typeof params.deadline === 'string' ? params.deadline : dayKey(new Date(Date.now() + 4 * 86400000)),
  );
  const [contactName, setContactName] = useState(
    typeof params.contactName === 'string' ? params.contactName : '',
  );
  const [contactPhone, setContactPhone] = useState(
    typeof params.contactPhone === 'string' ? params.contactPhone : '',
  );
  const [notes, setNotes] = useState(
    typeof params.notes === 'string' ? params.notes : '',
  );
  const [draft, setDraft] = useState<MessageDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = () => {
    if (!patientName.trim()) return setError('Please add the patient’s first name.');
    if (!hospital.trim()) return setError('Please add the hospital.');
    const unitsNum = Number.parseInt(units, 10);
    if (!Number.isFinite(unitsNum) || unitsNum < 1) {
      return setError('Units needed must be at least 1.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline.trim())) {
      return setError('Needed-by date must look like YYYY-MM-DD (for example, today is ' + todayKey() + ').');
    }
    setError(null);
    setNotice(null);
    setLoading(true);
    void writeMessage({
      patientName,
      bloodGroup,
      unitsNeeded: unitsNum,
      hospital,
      city,
      urgency,
      deadline: deadline.trim(),
      contactName,
      contactPhone,
      notes,
    }).then((m) => {
      setDraft(m);
      setLoading(false);
    });
  };

  const save = () => {
    if (!draft) return;
    saveMessage(draft);
    setNotice('Message saved — find it in Settings under History.');
  };

  const postAsRequest = () => {
    if (!draft) return;
    const unitsNum = Number.parseInt(units, 10);
    const request = addRequest({
      patientName,
      bloodGroup,
      unitsNeeded: unitsNum,
      hospital,
      city,
      urgency,
      deadline: deadline.trim(),
      contactName,
      contactPhone,
      notes,
    });
    saveMessage(draft);
    router.push(`/request/${request.id}` as never);
  };

  const reuse = (m: MessageDraft) => {
    setDraft(m);
    setNotice(`Showing “${m.title}” again — write a new one or post it as a request.`);
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
          <Text style={styles.headerTitle}>Write a request</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Animated.View entering={FadeInDown.springify()}>
          <Text style={styles.kicker}>AI MESSAGE WRITER</Text>
          <Text style={[styles.hero, r.display]}>Say it clearly, so help can find you.</Text>
          <Text style={styles.heroBody}>
            A few details in, a clear and respectful message out — ready to
            share with family, friends and donor groups.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).springify()}>
          <GlassCard style={styles.card}>
            <Text style={styles.fieldLabel}>Patient first name</Text>
            <TextInput
              style={styles.input}
              value={patientName}
              onChangeText={setPatientName}
              placeholder="First name (Ravi)"
              placeholderTextColor={palette.muted}
              autoCapitalize="words"
            />
            <Text style={styles.fieldLabel}>Blood group needed</Text>
            <View style={styles.chips}>
              {BLOOD_GROUPS.map((g) => (
                <Chip key={g} label={g} selected={bloodGroup === g} onPress={() => setBloodGroup(g)} />
              ))}
            </View>
            <Text style={styles.fieldLabel}>Units needed</Text>
            <View style={styles.stepper}>
              <Chip label="−" selected={false} onPress={() => setUnits(String(Math.max(1, (Number.parseInt(units, 10) || 1) - 1)))} />
              <Text style={styles.stepperValue}>{units} {Number.parseInt(units, 10) === 1 ? 'unit' : 'units'}</Text>
              <Chip label="+" selected={false} onPress={() => setUnits(String((Number.parseInt(units, 10) || 1) + 1))} />
            </View>
            <Text style={styles.fieldLabel}>Hospital</Text>
            <TextInput
              style={styles.input}
              value={hospital}
              onChangeText={setHospital}
              placeholder="City General Hospital"
              placeholderTextColor={palette.muted}
            />
            <Text style={styles.fieldLabel}>City</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="Glassboro, NJ"
              placeholderTextColor={palette.muted}
            />
            <Text style={styles.fieldLabel}>How urgent is it?</Text>
            <View style={styles.chips}>
              {URGENCIES.map((u) => (
                <Chip key={u} label={URGENCY_LABELS[u]} selected={urgency === u} onPress={() => setUrgency(u)} />
              ))}
            </View>
            <Text style={styles.fieldLabel}>Needed by (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={deadline}
              onChangeText={setDeadline}
              placeholder={todayKey()}
              placeholderTextColor={palette.muted}
              autoCapitalize="none"
            />
            <Text style={styles.fieldLabel}>Contact name</Text>
            <TextInput
              style={styles.input}
              value={contactName}
              onChangeText={setContactName}
              placeholder="Who should donors call?"
              placeholderTextColor={palette.muted}
              autoCapitalize="words"
            />
            <Text style={styles.fieldLabel}>Contact phone (optional)</Text>
            <TextInput
              style={styles.input}
              value={contactPhone}
              onChangeText={setContactPhone}
              placeholder="(856) 555-0100"
              placeholderTextColor={palette.muted}
              keyboardType="phone-pad"
            />
            <Text style={styles.fieldLabel}>Anything else? (optional)</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Surgery date, ward, or anything donors should know."
              placeholderTextColor={palette.muted}
              multiline
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label="Write my message" onPress={submit} loading={loading} />
          </GlassCard>
        </Animated.View>

        {loading ? (
          <GlassCard style={styles.card}>
            <Skeleton width="100%" height={18} />
            <Skeleton width="85%" height={18} />
            <BouncingDots />
          </GlassCard>
        ) : null}

        {draft && !loading ? (
          <Animated.View entering={FadeInDown.springify()}>
            <GlassCard style={styles.card}>
              <View style={styles.draftHeader}>
                <Text style={styles.draftKicker}>YOUR MESSAGE</Text>
                {draft.source === 'live' ? <LiveBadge /> : <DemoBadge />}
              </View>
              <Text style={styles.draftTitle}>{draft.title}</Text>
              <Text style={styles.draftBody}>{draft.message}</Text>
              <Text style={styles.draftMeta}>
                Needed by {formatDate(deadline.trim())} · {draft.source === 'live' ? 'Written by the live AI service.' : 'Written on-device (demo) — the live AI writes once the backend is connected.'}
              </Text>
              <PrimaryButton label="Save this message" onPress={save} />
              <PrimaryButton label="Post it as a request" onPress={postAsRequest} />
            </GlassCard>
          </Animated.View>
        ) : null}

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <Text style={styles.pastTitle}>Messages you wrote before</Text>
        {messages.length === 0 ? (
          <EmptyState
            glyph="✎"
            title="No messages yet"
            body="Write your first request above — it will show up here for one-tap re-use."
          />
        ) : (
          messages.map((m) => (
            <GlassCard key={m.id} style={styles.historyCard}>
              <Text style={styles.historyTitle} numberOfLines={2}>{m.title}</Text>
              <Text style={styles.historyMeta}>
                {m.bloodGroup} · {m.source === 'live' ? 'LIVE AI' : 'DEMO'}
              </Text>
              <GhostButton label="Use this message again" onPress={() => reuse(m)} />
            </GlassCard>
          ))
        )}
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
  kicker: { ...type.label, color: palette.primary, marginBottom: 8 },
  hero: { color: palette.ink, marginBottom: 10 },
  heroBody: { ...type.body, color: palette.body, marginBottom: spacing.lg, maxWidth: 560 },
  card: { gap: 12, marginBottom: spacing.lg, padding: spacing.md },
  fieldLabel: { ...type.caption, color: palette.body, marginTop: 4 },
  input: {
    backgroundColor: palette.primaryPale,
    borderRadius: radii.input,
    color: palette.ink,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 18,
  },
  notesInput: { minHeight: 84, paddingTop: 14, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stepper: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  stepperValue: { ...type.subtitle, color: palette.ink, minWidth: 80, textAlign: 'center' },
  error: { ...type.bodyStrong, color: palette.error, textAlign: 'center' },
  notice: { ...type.bodyStrong, color: palette.success, marginBottom: spacing.md, textAlign: 'center' },
  draftHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  draftKicker: { ...type.label, color: palette.primary },
  draftTitle: { ...type.subtitle, color: palette.ink },
  draftBody: { ...type.body, color: palette.ink, fontSize: 16, lineHeight: 24 },
  draftMeta: { ...type.body, color: palette.muted },
  pastTitle: { ...type.subtitle, color: palette.ink, marginBottom: spacing.sm, marginTop: spacing.md },
  historyCard: { gap: 8, marginBottom: spacing.md, padding: spacing.md },
  historyTitle: { ...type.bodyStrong, color: palette.ink },
  historyMeta: { ...type.caption, color: palette.muted },
});
