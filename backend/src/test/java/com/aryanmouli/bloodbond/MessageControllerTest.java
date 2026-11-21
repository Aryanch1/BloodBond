package com.aryanmouli.bloodbond;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Map;
import org.junit.jupiter.api.Test;

class MessageControllerTest {

  private MessageController controller() {
    // No API key configured, so the controller must take the demo path.
    GeminiClient gemini = new GeminiClient("", "gemini-3.5-flash-lite",
        "https://generativelanguage.googleapis.com/v1beta/openai/",
        HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build(),
        new ObjectMapper());
    return new MessageController(gemini, new MessageWriter());
  }

  private static MessageDtos.MessageRequest req() {
    return new MessageDtos.MessageRequest(
        "Ravi", "B+", 2, "City General Hospital", "Glassboro, NJ", "urgent",
        "2026-11-24", "Anil K.", "(856) 555-0142", "");
  }

  @Test
  void healthReturnsOk() {
    Map<String, String> health = controller().health();
    assertEquals("ok", health.get("status"));
    assertEquals("bloodbond", health.get("app"));
  }

  @Test
  void messageWithoutKeyReturnsDemoMessage() {
    MessageDtos.MessageResponse m = controller().message(req());
    assertEquals("demo", m.source());
    assertTrue(m.message().contains("2 units of B+"));
    assertTrue(m.message().contains("Ravi"));
    assertNotNull(m.title());
  }

  @Test
  void messageHandlesMissingNotesAndContact() {
    MessageDtos.MessageRequest bare = new MessageDtos.MessageRequest(
        "Lila", "AB-", 1, "Jefferson Hospital", "Philadelphia, PA", "urgent",
        "2026-11-26", "", "", "");
    MessageDtos.MessageResponse m = controller().message(bare);
    assertEquals("demo", m.source());
    assertTrue(m.message().contains("1 unit of AB-"));
  }

  @Test
  void messageDefaultsZeroUnitsToOne() {
    MessageDtos.MessageRequest zero = new MessageDtos.MessageRequest(
        "Jon", "A+", 0, "Cooper University Hospital", "Camden, NJ", "routine",
        "2026-11-27", "Sara M.", "(856) 555-0126", "");
    MessageDtos.MessageResponse m = controller().message(zero);
    assertTrue(m.message().contains("1 unit of A+"));
  }

  @Test
  void messageWithEmptyRequestStillAnswers() {
    MessageDtos.MessageRequest empty = new MessageDtos.MessageRequest(
        "", "", 0, "", "", "", "", "", "", "");
    MessageDtos.MessageResponse m = controller().message(empty);
    assertEquals("demo", m.source());
    assertNotNull(m.message());
    assertTrue(m.message().length() > 20);
  }
}
