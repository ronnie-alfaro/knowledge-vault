import { useMutation } from "@tanstack/react-query";
import { processWhisper } from "./whisperServices";

export function useProcessWhisper() {
  return useMutation({
    mutationFn: processWhisper
  });
}
