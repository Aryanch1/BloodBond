package com.aryanmouli.bloodbond;

import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Message endpoints. POST /api/message answers with a live Gemini
 * message when GEMINI_API_KEY is set, and with the honest rule-based
 * demo message otherwise — the app always says which mode answered.
 */
@RestController
public class MessageController {

  private final GeminiClient gemini;
  private final MessageWriter writer;

  public MessageController(GeminiClient gemini, MessageWriter writer) {
    this.gemini = gemini;
    this.writer = writer;
  }

  @GetMapping("/api/health")
  public Map<String, String> health() {
    return Map.of("status", "ok", "app", "bloodbond");
  }

  @PostMapping(value = "/api/message", consumes = MediaType.APPLICATION_JSON_VALUE)
  public MessageDtos.MessageResponse message(@RequestBody MessageDtos.MessageRequest request) {
    if (gemini.isConfigured()) {
      try {
        return gemini.write(request);
      } catch (Exception e) {
        // Live failed — fall through to the demo writer, never fail the request.
      }
    }
    return writer.write(request);
  }
}
