import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Send, Image as ImageIcon, Loader2, Wrench, X, Video, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { MobileLayout } from "@/components/MobileLayout";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  imageFile?: File;
  videoFile?: File;
  mediaType?: "image" | "video";
}

const Diagnose = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Ciao! 👋 Sono l'assistente diagnostico di FIXO. Carica una foto del problema o descrivi cosa non funziona e ti aiuterò a capire cosa c'è da fare.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [videoPreview, setVideoPreview] = useState<string>("");
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [isCreatingDiagnosis, setIsCreatingDiagnosis] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const quickReplies = [
    { icon: "⚡", text: "Problema elettrico", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
    { icon: "💧", text: "Perdita acqua", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    { icon: "🔊", text: "Rumore anomalo", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
    { icon: "🔥", text: "Problema riscaldamento", color: "bg-red-500/10 text-red-600 border-red-500/20" },
    { icon: "❄️", text: "Problema raffreddamento", color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" },
    { icon: "🚪", text: "Problema porte/finestre", color: "bg-green-500/10 text-green-600 border-green-500/20" },
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast({
          title: "Autenticazione Richiesta",
          description: "Accedi per utilizzare la diagnosi AI",
        });
        navigate("/auth");
      }
    });
  }, [navigate, toast]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File troppo grande",
          description: "L'immagine deve essere inferiore a 10MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedVideo(null);
      setVideoPreview("");
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "Video troppo grande",
          description: "Il video deve essere inferiore a 50MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedImage(null);
      setImagePreview("");
      setSelectedVideo(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const uploadMedia = async (file: File, type: "image" | "video"): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('repair-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('repair-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const streamChat = async (userMessage: Message) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/diagnose-chat`;

    try {
      // Build messages for API - filter out blob URLs
      const messagesForAPI = messages
        .filter(m => {
          // Only include messages with valid public URLs or no media
          const hasValidImage = !m.imageUrl || m.imageUrl.startsWith('http');
          const hasValidVideo = !m.videoUrl || m.videoUrl.startsWith('http');
          return hasValidImage && hasValidVideo;
        })
        .map(m => ({
          role: m.role,
          content: m.content,
          imageUrl: m.imageUrl,
          videoUrl: m.videoUrl,
          mediaType: m.mediaType
        }));

      messagesForAPI.push({
        role: userMessage.role,
        content: userMessage.content,
        imageUrl: userMessage.imageUrl,
        videoUrl: userMessage.videoUrl,
        mediaType: userMessage.mediaType
      });

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: messagesForAPI }),
      });

      if (resp.status === 429) {
        toast({
          title: "Limite raggiunto",
          description: "Troppe richieste, riprova tra poco.",
          variant: "destructive",
        });
        return;
      }

      if (resp.status === 402) {
        toast({
          title: "Servizio non disponibile",
          description: "Servizio temporaneamente non disponibile.",
          variant: "destructive",
        });
        return;
      }

      if (!resp.ok || !resp.body) {
        throw new Error("Errore nella risposta del server");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";
      let streamDone = false;

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: "assistant",
                  content: assistantContent,
                };
                return newMessages;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore. Riprova.",
        variant: "destructive",
      });
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage && !selectedVideo) || isLoading) return;

    setShowQuickReplies(false);
    setIsLoading(true);
    
    try {
      let publicMediaUrl: string | undefined;
      let mediaType: "image" | "video" | undefined;

      // Upload media first and get public URL
      if (selectedImage) {
        toast({
          title: "Caricamento immagine...",
          description: "Sto caricando la tua foto",
        });
        publicMediaUrl = await uploadMedia(selectedImage, "image");
        mediaType = "image";
      } else if (selectedVideo) {
        toast({
          title: "Caricamento video...",
          description: "Sto caricando il tuo video (potrebbe richiedere qualche secondo)",
        });
        publicMediaUrl = await uploadMedia(selectedVideo, "video");
        mediaType = "video";
      }

      const userMessage: Message = {
        role: "user",
        content: input || (selectedVideo ? "Analizza questo video" : selectedImage ? "Analizza questa immagine" : ""),
        imageUrl: mediaType === "image" ? publicMediaUrl : undefined,
        videoUrl: mediaType === "video" ? publicMediaUrl : undefined,
        mediaType,
      };

      // Add message with public URL
      setMessages((prev) => [...prev, userMessage]);

      setInput("");
      setSelectedImage(null);
      setSelectedVideo(null);
      setImagePreview("");
      setVideoPreview("");

      await streamChat(userMessage);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Errore caricamento",
        description: "Impossibile caricare il file. Riprova.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleQuickReply = (text: string) => {
    setInput(text);
    setShowQuickReplies(false);
  };

  const handleCreateDiagnosis = async () => {
    if (messages.length < 2) {
      toast({
        title: "Conversazione troppo breve",
        description: "Descrivi il problema prima di prenotare un tecnico",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingDiagnosis(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Autenticazione necessaria",
          description: "Effettua l'accesso per continuare",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      const response = await supabase.functions.invoke('create-diagnosis', {
        body: { messages }
      });

      if (response.error) throw response.error;

      const diagnosisId = response.data.diagnosis.id;

      toast({
        title: "Diagnosi creata!",
        description: "Ti mostro i tecnici disponibili",
      });

      navigate(`/results/${diagnosisId}`);
    } catch (error) {
      console.error('Errore creazione diagnosi:', error);
      toast({
        title: "Errore",
        description: "Impossibile creare la diagnosi. Riprova.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingDiagnosis(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <MobileLayout>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="border-b bg-card sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-hero rounded-xl flex items-center justify-center">
                <Wrench className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Diagnosi AI</h1>
                <p className="text-xs text-muted-foreground">Assistente diagnostico FIXO</p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-6" ref={scrollRef}>
          <div className="container max-w-3xl mx-auto space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {msg.imageUrl && (
                    <img
                      src={msg.imageUrl}
                      alt="Uploaded"
                      className="rounded-lg mb-2 max-w-full"
                    />
                  )}
                  {msg.videoUrl && (
                    <video
                      src={msg.videoUrl}
                      controls
                      className="rounded-lg mb-2 max-w-full"
                    />
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            
            {/* Pulsante Prenota Tecnico - mostrato dopo almeno una risposta dell'assistente */}
            {messages.length >= 3 && messages[messages.length - 1].role === "assistant" && !isLoading && (
              <div className="flex justify-center animate-fade-in mt-4">
                <Button
                  onClick={handleCreateDiagnosis}
                  disabled={isCreatingDiagnosis}
                  size="lg"
                  className="gap-2 shadow-lg hover:scale-105 transition-transform"
                >
                  {isCreatingDiagnosis ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Calendar className="h-5 w-5" />
                  )}
                  {isCreatingDiagnosis ? "Creazione..." : "Prenota un Tecnico"}
                </Button>
              </div>
            )}
            
            {/* Quick Replies */}
            {showQuickReplies && messages.length === 1 && !isLoading && (
              <div className="space-y-4">
                <p className="text-base text-muted-foreground text-center font-medium animate-fade-in">
                  Oppure seleziona un tipo di problema:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {quickReplies.map((reply, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      className={cn(
                        "h-auto py-4 px-5 justify-start gap-3 text-left border-2 hover:scale-105 transition-all animate-slide-up-fade opacity-0",
                        reply.color
                      )}
                      style={{
                        animationDelay: `${idx * 100}ms`,
                        animationFillMode: 'forwards'
                      }}
                      onClick={() => handleQuickReply(reply.text)}
                    >
                      <span className="text-2xl">{reply.icon}</span>
                      <span className="text-base font-medium">{reply.text}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t bg-card sticky bottom-0">
          <div className="container max-w-3xl mx-auto px-4 py-4">
            {imagePreview && (
              <Card className="mb-3 p-2 relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-24 h-24 object-cover rounded-lg"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                  onClick={() => {
                    setSelectedImage(null);
                    setImagePreview("");
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Card>
            )}
            {videoPreview && (
              <Card className="mb-3 p-2 relative">
                <video
                  src={videoPreview}
                  className="w-32 h-24 object-cover rounded-lg"
                  controls
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                  onClick={() => {
                    setSelectedVideo(null);
                    setVideoPreview("");
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Card>
            )}
            <div className="flex gap-2">
              <input
                ref={imageInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={handleImageSelect}
              />
              <input
                ref={videoInputRef}
                type="file"
                className="hidden"
                accept="video/*"
                capture="environment"
                onChange={handleVideoSelect}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => imageInputRef.current?.click()}
                disabled={isLoading}
                title="Carica foto"
              >
                <ImageIcon className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => videoInputRef.current?.click()}
                disabled={isLoading}
                title="Carica video (max 50MB)"
              >
                <Video className="h-5 w-5" />
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Descrivi il problema..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && !selectedImage && !selectedVideo)}
                size="icon"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Diagnose;
