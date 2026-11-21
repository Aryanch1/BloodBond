package com.aryanmouli.bloodbond;

/** Writes a clear, shareable blood-request message from request details. */
public interface AiWriter {
  MessageDtos.MessageResponse write(MessageDtos.MessageRequest request) throws Exception;
}
