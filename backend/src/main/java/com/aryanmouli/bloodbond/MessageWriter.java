package com.aryanmouli.bloodbond;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

/**
 * Rule-based message writer: builds a clear, respectful, shareable
 * blood-request message from exactly the details given — nothing
 * invented. Used as the honest demo fallback when no Gemini key is set
 * (source "demo"), and as the safety net when the live call fails.
 *
 * Compatibility facts are the standard red-cell transfusion rules:
 * O- is the universal donor, AB+ the universal recipient.
 */
@Service
public class MessageWriter implements AiWriter {

  static final Map<String, List<String>> CAN_RECEIVE_FROM = Map.of(
      "O-", List.of("O-"),
      "O+", List.of("O-", "O+"),
      "A-", List.of("O-", "A-"),
      "A+", List.of("O-", "O+", "A-", "A+"),
      "B-", List.of("O-", "B-"),
      "B+", List.of("O-", "O+", "B-", "B+"),
      "AB-", List.of("O-", "A-", "B-", "AB-"),
      "AB+", List.of("O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"));

  static List<String> canReceiveFrom(String group) {
    if (group == null) return List.of();
    return CAN_RECEIVE_FROM.getOrDefault(group.trim().toUpperCase(), List.of());
  }

  static String formatDeadline(String deadline) {
    if (deadline == null || deadline.isBlank()) return "soon";
    try {
      return LocalDate.parse(deadline.trim()).format(DateTimeFormatter.ofPattern("MMM d, yyyy"));
    } catch (Exception e) {
      return deadline.trim();
    }
  }

  static String clean(String value, String fallback) {
    return value == null || value.isBlank() ? fallback : value.trim();
  }

  @Override
  public MessageDtos.MessageResponse write(MessageDtos.MessageRequest req) {
    String group = clean(req.bloodGroup(), "O-").toUpperCase();
    int units = req.unitsNeeded() < 1 ? 1 : req.unitsNeeded();
    String unitWord = units == 1 ? "unit" : "units";
    String name = clean(req.patientName(), "a patient");
    String hospital = clean(req.hospital(), "the hospital");
    String city = req.city() == null ? "" : req.city().trim();
    String where = city.isEmpty() ? hospital : hospital + ", " + city;
    String by = formatDeadline(req.deadline());
    String urgency = req.urgency() == null ? "urgent" : req.urgency().trim().toLowerCase();
    String contact = req.contactName() == null ? "" : req.contactName().trim();
    String phone = req.contactPhone() == null ? "" : req.contactPhone().trim();
    String notes = req.notes() == null ? "" : req.notes().trim();

    String opening;
    String urgencyLine;
    if ("critical".equals(urgency)) {
      opening = "Urgent: blood needed today.";
      urgencyLine = "This is urgent — every hour matters.";
    } else if ("routine".equals(urgency)) {
      opening = "Blood needed — a planned donation would help.";
      urgencyLine = "This is a planned request, so there is time to arrange a donation.";
    } else {
      opening = "Blood needed soon — please help if you can.";
      urgencyLine = "The hospital is asking within the next few days.";
    }

    String contactLine;
    if (!contact.isEmpty() && !phone.isEmpty()) {
      contactLine = "If you can donate, please contact " + contact + " at " + phone + ".";
    } else if (!contact.isEmpty()) {
      contactLine = "If you can donate, please contact " + contact + ".";
    } else {
      contactLine = "If you can donate, please reply to this message.";
    }

    String donors = String.join(", ", canReceiveFrom(group));
    StringBuilder message = new StringBuilder();
    message.append(opening).append(" ")
        .append(units).append(" ").append(unitWord).append(" of ").append(group)
        .append(" blood needed for ").append(name)
        .append(" at ").append(where).append(" by ").append(by).append(".\n\n")
        .append(urgencyLine).append(" ").append(group)
        .append(" patients can receive from: ").append(donors).append(". ")
        .append("Please share this with anyone nearby who may be able to help.\n\n")
        .append(contactLine);
    if (!notes.isEmpty()) {
      message.append("\n\nNote: ").append(notes);
    }
    message.append("\n\nThank you for considering it — one donation can help more than one person.");

    String title = group + " blood needed for " + name + " · " + hospital;
    return new MessageDtos.MessageResponse(message.toString(), title, "demo");
  }
}
