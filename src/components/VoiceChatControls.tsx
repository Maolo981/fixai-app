import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface VoiceChatControlsProps {
  onTranscriptComplete: (text: string) => void;
  disabled?: boolean;
}

export function VoiceChatControls({ onTranscriptComplete, disabled }: VoiceChatControlsProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'it-IT';

    let finalTranscript = '';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
    };

    recognition.onend = () => {
      if (isRecording) {
        setIsRecording(false);
        setIsProcessing(true);
        
        if (finalTranscript.trim()) {
          onTranscriptComplete(finalTranscript.trim());
          toast({
            title: "Registrazione completata",
            description: "Il messaggio vocale è stato trascritto",
          });
        }
        
        finalTranscript = '';
        setIsProcessing(false);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      setIsProcessing(false);
      
      if (event.error !== 'no-speech') {
        toast({
          title: "Errore",
          description: "Impossibile registrare l'audio. Verifica i permessi del microfono.",
          variant: "destructive",
        });
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isRecording, onTranscriptComplete, toast]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Non supportato",
        description: "Il tuo browser non supporta il riconoscimento vocale",
        variant: "destructive",
      });
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
      toast({
        title: "Registrazione avviata",
        description: "Parla ora per registrare il messaggio",
      });
    }
  };

  return (
    <Button
      type="button"
      size="icon"
      variant={isRecording ? "destructive" : "outline"}
      onClick={toggleRecording}
      disabled={disabled || isProcessing}
      className={isRecording ? "animate-pulse" : ""}
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isRecording ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );
}
