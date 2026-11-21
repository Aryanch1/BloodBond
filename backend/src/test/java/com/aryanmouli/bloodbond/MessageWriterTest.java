package com.aryanmouli.bloodbond;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

class MessageWriterTest {

  private final MessageWriter writer = new MessageWriter();

  private static MessageDtos.MessageRequest req(String group, int units, String urgency) {
    return new MessageDtos.MessageRequest(
        "Ravi", group, units, "City General Hospital", "Glassboro, NJ", urgency,
        "2026-11-24", "Anil K.", "(856) 555-0142", "Surgery scheduled Nov 25, 8:00 AM.");
  }

  @Test
  void demoMessageUsesOnlyGivenDetails() {
    MessageDtos.MessageResponse m = writer.write(req("B+", 2, "urgent"));
    assertEquals("demo", m.source());
    assertTrue(m.message().contains("2 units of B+"));
    assertTrue(m.message().contains("Ravi"));
    assertTrue(m.message().contains("City General Hospital"));
    assertTrue(m.message().contains("Glassboro, NJ"));
    assertTrue(m.message().contains("Nov 24, 2026"));
    assertTrue(m.message().contains("Anil K."));
    assertTrue(m.message().contains("(856) 555-0142"));
    assertTrue(m.message().contains("Surgery scheduled Nov 25"));
    assertTrue(m.title().contains("B+"));
  }

  @Test
  void criticalUrgencySaysNeededToday() {
    MessageDtos.MessageResponse m = writer.write(req("O-", 1, "critical"));
    assertTrue(m.message().contains("blood needed today"));
    assertTrue(m.message().contains("1 unit of O-"));
  }

  @Test
  void routineUrgencyIsPlanned() {
    MessageDtos.MessageResponse m = writer.write(req("A+", 3, "routine"));
    assertTrue(m.message().contains("planned"));
    assertTrue(m.message().contains("3 units of A+"));
  }

  @Test
  void universalDonorListsAllGroups() {
    List<String> donors = MessageWriter.canReceiveFrom("AB+");
    assertEquals(8, donors.size());
    assertTrue(donors.contains("O-"));
    assertTrue(donors.contains("AB+"));
  }

  @Test
  void universalRecipientListsOnlySelf() {
    List<String> donors = MessageWriter.canReceiveFrom("O-");
    assertEquals(List.of("O-"), donors);
  }

  @Test
  void deadlineFormatsToReadableDate() {
    assertEquals("Nov 24, 2026", MessageWriter.formatDeadline("2026-11-24"));
    assertEquals("soon", MessageWriter.formatDeadline(""));
    assertEquals("soon", MessageWriter.formatDeadline(null));
  }

  @Test
  void missingContactFallsBackToReplyLine() {
    MessageDtos.MessageRequest noContact = new MessageDtos.MessageRequest(
        "Meera", "O-", 1, "St. Mary Medical Center", "Camden, NJ", "urgent",
        "2026-11-25", "", "", "");
    MessageDtos.MessageResponse m = writer.write(noContact);
    assertTrue(m.message().contains("please reply to this message"));
    assertTrue(m.message().contains("1 unit of O-"));
    assertEquals("demo", m.source());
  }
}
