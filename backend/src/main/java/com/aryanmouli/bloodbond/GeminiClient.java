package com.aryanmouli.bloodbond;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Calls Google Gemini (gemini-3.5-flash-lite) through the OpenAI-compatible
 * endpoint, asking for a clear, respectful blood-request message as
 * strict JSON.
 *
 * The API key comes from the GEMINI_API_KEY environment variable only —
 * it never appears in code, the repo, or the app. When no key is set, or
 * the call fails, the caller falls back to the rule-based demo writer
 * instead of failing the request.
 */
@Service
public class GeminiClient implements AiWriter {

  private static final String SYSTEM_PROMPT =
      "You write short, clear, respectful blood-donation request messages for a community "
          + "donor board. Reply with ONLY a JSON object, no markdown fences, no extra text, with exactly "
          + "these fields: message (the full shareable message, 3-5 short sentences), "
          + "title (one short line like \"B+ blood needed for Ravi · City General Hospital\"). "
          + "Use ONLY the details given: patient first name, blood group, units needed, hospital, city, "
          + "deadline, urgency, contact name and phone, and any notes. Never invent a name, place, date, "
          + "or medical fact. Be warm and respectful, never alarming. Use the urgency honestly: "
          + "\"critical\" means needed today, \"urgent\" within a few days, \"routine\" is planned. "
          + "End with a thank-you line. Do not add medical advice.";

  private final String apiKey;
  private final String model;
  private final String baseUrl;
  private final HttpClient http;
  private final ObjectMapper mapper;

  // @Autowired is required: the class also has a package-private
  // 5-arg constructor (used by unit tests), so without it Spring
  // falls back to looking for a no-arg constructor and boot fails.
  @Autowired
  public GeminiClient(
      @Value("${bloodbond.gemini.api-key:}") String apiKey,
      @Value("${bloodbond.gemini.model:gemini-3.5-flash-lite}") String model,
      @Value("${bloodbond.gemini.base-url:https://generativelanguage.googleapis.com/v1beta/openai/}")
          String baseUrl) {
    this(apiKey, model, baseUrl, HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build(),
        new ObjectMapper());
  }

  GeminiClient(String apiKey, String model, String baseUrl, HttpClient http, ObjectMapper mapper) {
    this.apiKey = apiKey == null ? "" : apiKey.trim();
    this.model = model;
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
    this.http = http;
    this.mapper = mapper;
  }

  public boolean isConfigured() {
    return !apiKey.isBlank();
  }

  @Override
  public MessageDtos.MessageResponse write(MessageDtos.MessageRequest req) throws Exception {
    if (!isConfigured()) {
      throw new IllegalStateException("GEMINI_API_KEY is not set");
    }
    StringBuilder userText = new StringBuilder();
    userText.append("Patient first name: ").append(MessageWriter.clean(req.patientName(), "a patient")).append("\n");
    userText.append("Blood group: ").append(MessageWriter.clean(req.bloodGroup(), "O-")).append("\n");
    userText.append("Units needed: ").append(Math.max(1, req.unitsNeeded())).append("\n");
    userText.append("Hospital: ").append(MessageWriter.clean(req.hospital(), "the hospital")).append("\n");
    userText.append("City: ").append(req.city() == null ? "" : req.city()).append("\n");
    userText.append("Urgency: ").append(req.urgency() == null ? "urgent" : req.urgency()).append("\n");
    userText.append("Needed by: ").append(MessageWriter.formatDeadline(req.deadline())).append("\n");
    userText.append("Contact: ").append(req.contactName() == null ? "" : req.contactName())
        .append(req.contactPhone() == null || req.contactPhone().isBlank() ? "" : " at " + req.contactPhone())
        .append("\n");
    if (req.notes() != null && !req.notes().isBlank()) {
      userText.append("Notes: ").append(req.notes()).append("\n");
    }
    String body = mapper.writeValueAsString(new ChatRequest(
        model,
        List.of(
            new ChatMessage("system", SYSTEM_PROMPT),
            new ChatMessage("user", userText.toString())),
        0.3));
    HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create(baseUrl + "chat/completions"))
        .header("Content-Type", "application/json")
        .header("Authorization", "Bearer " + apiKey)
        .timeout(Duration.ofSeconds(30))
        .POST(HttpRequest.BodyPublishers.ofString(body))
        .build();
    HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
    if (response.statusCode() < 200 || response.statusCode() >= 300) {
      throw new IllegalStateException("Gemini returned HTTP " + response.statusCode());
    }
    JsonNode root = mapper.readTree(response.body());
    JsonNode content = root.path("choices").path(0).path("message").path("content");
    if (!content.isTextual()) {
      throw new IllegalStateException("Gemini returned no text content");
    }
    String json = content.asText().trim();
    if (json.startsWith("```")) {
      json = json.replaceFirst("(?s)^```(?:json)?\\s*", "").replaceFirst("(?s)\\s*```$", "");
    }
    JsonNode data = mapper.readTree(json);
    String message = data.path("message").asText("");
    if (message.isBlank()) {
      throw new IllegalStateException("Gemini returned an empty message");
    }
    String group = MessageWriter.clean(req.bloodGroup(), "O-").toUpperCase();
    String name = MessageWriter.clean(req.patientName(), "a patient");
    String hospital = MessageWriter.clean(req.hospital(), "the hospital");
    String title = data.path("title").asText(group + " blood needed for " + name + " · " + hospital);
    return new MessageDtos.MessageResponse(message, title, "live");
  }

  private record ChatRequest(String model, List<ChatMessage> messages, double temperature) {}

  private record ChatMessage(String role, String content) {}
}
