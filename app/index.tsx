import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AuroraBackground } from '../components/AuroraBackground';
import { CompatibilityChart } from '../components/CompatibilityChart';
import { DonorCard } from '../components/DonorCard';
import { DropletRefreshButton, PullToRefresh } from '../components/DropletRefresh';
import { RequestCard, UnitsBar } from '../components/RequestCard';
import { Chip, EmptyState, GlassCard, IconButton, PrimaryButton, SpringPress } from '../components/ui';
import { sortRequests } from '../lib/blood';
import { useApp } from '../lib/store';
import { palette, radii, spacing, type, useResponsive } from '../lib/theme';
import { BLOOD_GROUPS, type BloodGroup } from '../lib/types';

type BoardView = 'requests' | 'donors' | 'pledges' | 'chart';

const VIEWS: { key: BoardView; label: string }[] = [
  { key: 'requests', label: 'Requests' },
  { key: 'donors', label: 'Donors' },
  { key: 'pledges', label: 'My Pledges' },
  { key: 'chart', label: 'Chart' },
];

/**
 * Board (Home) — the lifeline board. A typographic poster hero, a
 * compatibility strip of blood-group pills, a dark stat strip, then
 * the board itself: urgency-sorted request cards, the donor directory,
 * your pledges, or the compatibility chart — switched by the chip row
 * under the header. A crimson floating action button writes a new
 * request. On ≥840dp the screen splits: board left, selected request
 * on the right. No photo hero — this is a community board.
 */
export default function BoardScreen() {
  const router = useRouter();
  const { requests, donors, pledges, openCount, unitsNeeded, user, guest, addPledge } = useApp();
  const r = useResponsive();
  const [view, setView] = useState<BoardView>('requests');
  const [groupFilter, setGroupFilter] = useState<BloodGroup | null>(null);
  const [donorFilter, setDonorFilter] = useState<BloodGroup | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const sorted = sortRequests(requests);
  const shown = groupFilter ? sorted.filter((q) => q.bloodGroup === groupFilter) : sorted;
  const selected = requests.find((q) => q.id === selectedId) ?? shown[0] ?? null;
  const donorsShown = donorFilter ? donors.filter((d) => d.bloodGroup === donorFilter) : donors;
  const activePledges = pledges.filter((p) => p.status === 'pledged');
  const pastPledges = pledges.filter((p) => p.status === 'completed');
  const hasDemo = requests.some((q) => q.isDemo);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // The board is local; refresh re-reads state and replays the droplet.
    setTimeout(() => setRefreshing(false), 900);
  }, []);

  const pledge = (requestId: string, patientName: string) => {
    const made = addPledge(requestId);
    setNotice(
      made
        ? `Thank you — your pledge for ${patientName} is saved in My Pledges.`
        : 'You already have an active pledge for this request.',
    );
  };

  const hero = (
    <>
      <Animated.View entering={FadeInDown.springify()}>
        <Text style={styles.kicker}>BLOODBOND</Text>
        <Text style={[styles.hero, r.display]}>Every drop counts.</Text>
        <Text style={styles.heroBody}>
          Open requests from people nearby, donors who match, and one
          pledge that turns a post into a donation.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).springify()}>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{openCount}</Text>
            <Text style={styles.statLabel}>open requests</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>{unitsNeeded}</Text>
            <Text style={styles.statLabel}>units still needed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>{activePledges.length}</Text>
            <Text style={styles.statLabel}>your pledges</Text>
          </View>
        </View>
      </Animated.View>
    </>
  );

  const switcher = (
    <View style={styles.switcher}>
      {VIEWS.map((v) => (
        <Chip
          key={v.key}
          label={v.label}
          selected={view === v.key}
          onPress={() => setView(v.key)}
        />
      ))}
    </View>
  );

  const requestsView = (
    <View>
      <Text style={styles.stripTitle}>Find your group — tap to filter</Text>
      <View style={styles.groups}>
        <Chip label="All" selected={groupFilter === null} onPress={() => setGroupFilter(null)} />
        {BLOOD_GROUPS.map((g) => (
          <Chip
            key={g}
            label={g}
            selected={groupFilter === g}
            onPress={() => setGroupFilter(groupFilter === g ? null : g)}
          />
        ))}
      </View>
      {hasDemo ? (
        <Text style={styles.demoNote}>
          Showing demo requests so you can see the board at work — clear them in Settings.
        </Text>
      ) : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {shown.length === 0 ? (
        <EmptyState
          glyph="💧"
          title="No requests match"
          body="Try another blood group, or write a request of your own — someone nearby may need exactly your group."
          actionLabel="Write a request"
          onAction={() => router.push('/write')}
        />
      ) : (
        shown.map((request, i) => (
          <View key={request.id}>
            {r.twoPane ? (
              <Pressable
                onPress={() => {
                  setSelectedId(request.id);
                  setNotice(`Showing ${request.patientName} on the right.`);
                }}
              >
                <RequestCard request={request} index={i} selected={selected?.id === request.id} />
              </Pressable>
            ) : (
              <Pressable onPress={() => router.push(`/request/${request.id}` as never)}>
                <RequestCard request={request} index={i} />
              </Pressable>
            )}
          </View>
        ))
      )}
    </View>
  );

  const donorsView = (
    <View>
      <Text style={styles.stripTitle}>Donors nearby — tap a group to filter</Text>
      <View style={styles.groups}>
        <Chip label="All" selected={donorFilter === null} onPress={() => setDonorFilter(null)} />
        {BLOOD_GROUPS.map((g) => (
          <Chip
            key={g}
            label={g}
            selected={donorFilter === g}
            onPress={() => setDonorFilter(donorFilter === g ? null : g)}
          />
        ))}
      </View>
      <Text style={styles.demoNote}>
        Demo donors with sample distances. A donor is listed as available
        only when their last donation was at least 56 days ago.
      </Text>
      {donorsShown.length === 0 ? (
        <EmptyState
          glyph="💧"
          title="No donors in this group"
          body="Try another blood group — or share the board so more donors join."
        />
      ) : (
        donorsShown.map((donor, i) => <DonorCard key={donor.id} donor={donor} index={i} />)
      )}
    </View>
  );

  const pledgesView = (
    <View>
      <Text style={styles.stripTitle}>Your promises, kept visible.</Text>
      {activePledges.length === 0 && pastPledges.length === 0 ? (
        <EmptyState
          glyph="♥"
          title="No pledges yet"
          body="Open a request and tap “I can donate”. Your pledge shows up here with a reminder the day before."
          actionLabel="See open requests"
          onAction={() => setView('requests')}
        />
      ) : (
        <>
          {activePledges.map((p) => (
            <GlassCard key={p.id} style={styles.pledgeCard}>
              <Text style={styles.pledgeTitle}>
                {p.patientName} · {p.bloodGroup} · 1 unit
              </Text>
              <Text style={styles.pledgeMeta}>
                {p.hospital} · {p.date}
              </Text>
              {p.reminder ? (
                <Text style={styles.pledgeReminder}>Reminder: {p.reminder}</Text>
              ) : null}
              <PrimaryButton
                label="Open the request"
                onPress={() => router.push(`/request/${p.requestId}` as never)}
              />
            </GlassCard>
          ))}
          {pastPledges.length > 0 ? (
            <>
              <Text style={styles.pastTitle}>Past pledges</Text>
              {pastPledges.map((p) => (
                <GlassCard key={p.id} style={styles.pledgeCard}>
                  <Text style={styles.pledgeTitle}>
                    {p.patientName} · {p.bloodGroup} · {p.date} — completed
                  </Text>
                  <Text style={styles.pledgeMeta}>{p.hospital}</Text>
                </GlassCard>
              ))}
            </>
          ) : null}
        </>
      )}
      <Text style={styles.demoNote}>
        Pledges are saved on your device and in your account when signed
        in. Clear them with the demo data in Settings.
      </Text>
    </View>
  );

  const chartView = <CompatibilityChart />;

  const board = (
    <>
      {switcher}
      {view === 'requests' ? requestsView : null}
      {view === 'donors' ? donorsView : null}
      {view === 'pledges' ? pledgesView : null}
      {view === 'chart' ? chartView : null}
    </>
  );

  const fab = (
    <SpringPress
      haptic
      onPress={() => router.push('/write')}
      style={styles.fab}
    >
      <View style={styles.fabCircle}>
        <Text style={styles.fabPlus}>+</Text>
      </View>
    </SpringPress>
  );

  if (r.twoPane) {
    return (
      <View style={styles.root}>
        <AuroraBackground />
        <View style={styles.twoPane}>
          <View style={styles.paneList}>
            <PullToRefresh refreshing={refreshing} onRefresh={onRefresh}>
              <View style={styles.paneScrollContent}>
                <View style={styles.topRow}>
                  <Text style={styles.greetingText}>
                    {user?.name ? `Hello, ${user.name.split(' ')[0]}` : guest ? 'Hello, guest' : 'Hello'}
                  </Text>
                  <IconButton label="⚙" onPress={() => router.push('/settings')} />
                </View>
                {hero}
                {board}
              </View>
            </PullToRefresh>
          </View>
          <View style={styles.paneDetail}>
            {selected ? (
              <GlassCard style={styles.detailCard}>
                <Text style={styles.detailKicker}>{selected.bloodGroup} · {selected.urgency.toUpperCase()}</Text>
                <Text style={styles.detailTitle}>{selected.patientName}</Text>
                <Text style={styles.detailSummary}>
                  {selected.hospital}, {selected.city}
                </Text>
                <UnitsBar request={selected} />
                <PrimaryButton
                  label="I can donate"
                  onPress={() => pledge(selected.id, selected.patientName)}
                />
                <PrimaryButton
                  label="Open the full request"
                  onPress={() => router.push(`/request/${selected.id}` as never)}
                />
              </GlassCard>
            ) : (
              <EmptyState glyph="💧" title="Nothing selected" body="Pick a request on the left to see it here." />
            )}
          </View>
        </View>
        {fab}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AuroraBackground />
      <PullToRefresh refreshing={refreshing} onRefresh={onRefresh}>
        <View style={styles.scroll}>
          <View style={styles.topRow}>
            <Text style={styles.greetingText}>
              {user?.name ? `Hello, ${user.name.split(' ')[0]}` : guest ? 'Hello, guest' : 'Hello'}
            </Text>
            <View style={styles.topActions}>
              {Platform.OS === 'web' ? (
                <Pressable onPress={onRefresh} hitSlop={8}>
                  <DropletRefreshButton refreshing={refreshing} />
                </Pressable>
              ) : null}
              <IconButton label="⚙" onPress={() => router.push('/settings')} />
            </View>
          </View>
          {hero}
          {board}
        </View>
      </PullToRefresh>
      {fab}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 120, paddingTop: 56 },
  topRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  topActions: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  greetingText: { ...type.subtitle, color: palette.ink },
  kicker: { ...type.label, color: palette.primary, marginBottom: 8 },
  hero: { color: palette.ink, marginBottom: 10 },
  heroBody: { ...type.body, color: palette.body, marginBottom: spacing.lg, maxWidth: 560 },
  stats: {
    alignItems: 'center',
    backgroundColor: palette.ink,
    borderRadius: radii.card,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
    paddingVertical: 16,
    width: '100%',
  },
  stat: { alignItems: 'center', flex: 1 },
  statNum: { color: '#FFFFFF', fontFamily: 'BebasNeue_400Regular', fontSize: 28, letterSpacing: 0.5, lineHeight: 30 },
  statLabel: { color: 'rgba(255, 249, 247, 0.65)', fontSize: 11, fontWeight: '700', marginTop: 2, textAlign: 'center' },
  statDivider: { backgroundColor: 'rgba(255,255,255,0.18)', height: 36, width: 1 },
  switcher: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.lg },
  stripTitle: { ...type.subtitle, color: palette.ink, marginBottom: spacing.sm },
  groups: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  demoNote: { ...type.body, color: palette.muted, marginBottom: spacing.md },
  notice: { ...type.bodyStrong, color: palette.success, marginBottom: spacing.md, textAlign: 'center' },
  pledgeCard: { gap: 8, marginBottom: spacing.md, padding: spacing.md },
  pledgeTitle: { ...type.subtitle, color: palette.ink },
  pledgeMeta: { ...type.body, color: palette.body },
  pledgeReminder: { ...type.bodyStrong, color: palette.success },
  pastTitle: { ...type.subtitle, color: palette.ink, marginBottom: spacing.sm, marginTop: spacing.md },
  fab: { bottom: 28, position: 'absolute', right: 20 },
  fabCircle: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: 32,
    height: 64,
    justifyContent: 'center',
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    width: 64,
    elevation: 8,
  },
  fabPlus: { color: '#FFFFFF', fontSize: 32, fontWeight: '300', lineHeight: 36 },
  twoPane: { flex: 1, flexDirection: 'row', gap: 24, padding: 28 },
  paneList: { flex: 1.1 },
  paneScrollContent: { paddingBottom: 32, paddingTop: 8 },
  paneDetail: { flex: 1, paddingTop: 120 },
  detailCard: { gap: 12, padding: spacing.lg },
  detailKicker: { ...type.label, color: palette.primary },
  detailTitle: { ...type.title, color: palette.ink },
  detailSummary: { ...type.body, color: palette.body },
});
