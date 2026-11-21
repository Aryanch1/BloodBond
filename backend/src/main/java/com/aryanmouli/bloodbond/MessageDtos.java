package com.aryanmouli.bloodbond;

/** Request/response shapes for the BloodBond message-writer service. */
public final class MessageDtos {
  private MessageDtos() {}

  public record MessageRequest(
      String patientName,
      String bloodGroup,
      int unitsNeeded,
      String hospital,
      String city,
      String urgency,
      String deadline,
      String contactName,
      String contactPhone,
      String notes) {}

  public record MessageResponse(String message, String title, String source) {}
}
