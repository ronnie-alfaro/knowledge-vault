import { useMutation } from "@tanstack/react-query";
import { generateWhisperSuggestions } from "./whisperServices";

export function useGenerateWhisperSuggestions() {
  return useMutation({
    mutationFn: generateWhisperSuggestions
  });
}
