import { useEffect, useState, useRef } from "react";
import { MessageCircle, Send, X, Image as ImageIcon, Loader2, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { QuoteInChatCard } from "./QuoteInChatCard";
import { CreateQuoteDialog } from "./CreateQuoteDialog";

interface Message {
  id: string;
  sender_id: string;
  message: string;
  image_url?: string | null;
  created_at: string;
  read: boolean;
  quote_id?: string | null;
}

interface Quote {
  id: string;
  description: string;
  estimated_hours: number;
  hourly_rate: number;
  total_cost: number;
  parts_cost: number | null;
  notes: string | null;
  status: string;
}

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  technicianName: string;
  isTechnician?: boolean;
  technicianId?: string | null;
  userId?: string;
}

export function ChatDialog({
  open,
  onOpenChange,
  jobId,
  technicianName,
  isTechnician = false,
  technicianId,
  userId,
}: ChatDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [jobData, setJobData] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadMessages();
      loadQuotes();
      loadJobData();
      getCurrentUser();
      subscribeToMessages();
      subscribeToQuotes();
    }

    return () => {
      supabase.channel(`chat-${jobId}`).unsubscribe();
      supabase.channel(`quotes-${jobId}`).unsubscribe();
    };
  }, [open, jobId]);

  const loadJobData = async () => {
    const { data, error } = await supabase
      .from("jobs")
      .select("id, user_id, diagnoses(problem_type)")
      .eq("id", jobId)
      .single();

    if (!error && data) {
      setJobData(data);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading messages:", error);
      return;
    }

    setMessages(data || []);
    markMessagesAsRead(data || []);
  };

  const loadQuotes = async () => {
    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .eq("job_id", jobId);

    if (error) {
      console.error("Error loading quotes:", error);
      return;
    }

    const quotesMap: Record<string, Quote> = {};
    data?.forEach(quote => {
      quotesMap[quote.id] = quote;
    });
    setQuotes(quotesMap);
  };

  const markMessagesAsRead = async (messagesToMark: Message[]) => {
    const unreadMessages = messagesToMark.filter(
      (msg) => !msg.read && msg.sender_id !== currentUserId
    );

    if (unreadMessages.length === 0) return;

    const { error } = await supabase
      .from("chat_messages")
      .update({ read: true })
      .in("id", unreadMessages.map((msg) => msg.id));

    if (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`chat-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          
          if (newMsg.sender_id !== currentUserId) {
            markMessagesAsRead([newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToQuotes = () => {
    const channel = supabase
      .channel(`quotes-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "quotes",
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const quote = payload.new as Quote;
            setQuotes((prev) => ({ ...prev, [quote.id]: quote }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Verifica la dimensione di ogni file
    const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        title: "Errore",
        description: "Ogni immagine deve essere inferiore a 5MB",
        variant: "destructive",
      });
      return;
    }

    // Limita a massimo 5 immagini
    if (files.length > 5) {
      toast({
        title: "Attenzione",
        description: "Puoi inviare massimo 5 immagini alla volta",
        variant: "destructive",
      });
      return;
    }

    setSelectedImages(files);
    
    // Crea anteprime per tutte le immagini
    const previews: string[] = [];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        previews.push(reader.result as string);
        if (previews.length === files.length) {
          setImagePreviews(previews);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    if (fileInputRef.current && selectedImages.length === 1) {
      fileInputRef.current.value = "";
    }
  };

  const removeAllImages = () => {
    setSelectedImages([]);
    setImagePreviews([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${currentUserId}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from("chat-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("chat-images")
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      return null;
    }
  };

  const handleSend = async (e?: React.FormEvent, messageText?: string) => {
    e?.preventDefault();

    const textToSend = messageText || newMessage;

    if ((!textToSend.trim() && selectedImages.length === 0) || isSending) return;

    setIsSending(true);

    // Upload tutte le immagini se presenti
    const imageUrls: string[] = [];
    if (selectedImages.length > 0) {
      for (const image of selectedImages) {
        const url = await uploadImage(image);
        if (url) {
          imageUrls.push(url);
        }
      }

      if (imageUrls.length === 0) {
        toast({
          title: "Errore",
          description: "Impossibile caricare le immagini",
          variant: "destructive",
        });
        setIsSending(false);
        return;
      }
    }

    // Se ci sono più immagini, inviale in messaggi separati
    if (imageUrls.length > 0) {
      for (let i = 0; i < imageUrls.length; i++) {
        const isLastImage = i === imageUrls.length - 1;
        const messageContent = isLastImage && textToSend.trim() 
          ? textToSend.trim() 
          : `📷 Immagine ${i + 1}/${imageUrls.length}`;

        const { error } = await supabase.from("chat_messages").insert({
          job_id: jobId,
          sender_id: currentUserId,
          message: messageContent,
          image_url: imageUrls[i],
        });

        if (error) {
          console.error("Error sending image:", error);
        }
      }
    } else if (textToSend.trim()) {
      // Solo testo senza immagini
      const { error } = await supabase.from("chat_messages").insert({
        job_id: jobId,
        sender_id: currentUserId,
        message: textToSend.trim(),
      });

      if (error) {
        toast({
          title: "Errore",
          description: "Impossibile inviare il messaggio",
          variant: "destructive",
        });
        setIsSending(false);
        return;
      }
    }

    setIsSending(false);
    setNewMessage("");
    removeAllImages();
  };


  const handleAcceptQuote = async (quoteId: string) => {
    const { error: quoteError } = await supabase
      .from("quotes")
      .update({ status: "accepted" })
      .eq("id", quoteId);

    if (quoteError) {
      toast({
        title: "Errore",
        description: "Impossibile accettare il preventivo",
        variant: "destructive",
      });
      return;
    }

    const { error: jobError } = await supabase
      .from("jobs")
      .update({ 
        status: "confermato",
        quote_id: quoteId 
      })
      .eq("id", jobId);

    if (jobError) {
      console.error("Error updating job:", jobError);
    }

    toast({
      title: "Preventivo accettato!",
      description: "Il tecnico verrà a casa tua come concordato",
    });

    await supabase.from("chat_messages").insert({
      job_id: jobId,
      sender_id: currentUserId,
      message: "✅ Ho accettato il preventivo",
      quote_id: quoteId,
    });
  };

  const handleRejectQuote = async (quoteId: string) => {
    const { error } = await supabase
      .from("quotes")
      .update({ status: "rejected" })
      .eq("id", quoteId);

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile rifiutare il preventivo",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Preventivo rifiutato",
      description: "Puoi richiedere un nuovo preventivo",
    });

    await supabase.from("chat_messages").insert({
      job_id: jobId,
      sender_id: currentUserId,
      message: "❌ Ho rifiutato il preventivo",
      quote_id: quoteId,
    });
  };

  const handleQuoteCreated = async () => {
    setQuoteDialogOpen(false);
    loadQuotes();
    toast({
      title: "Preventivo inviato!",
      description: "Il cliente riceverà il tuo preventivo nella chat",
    });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0">
        <DialogHeader className="p-4 pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <div>
                <DialogTitle>Chat con {technicianName}</DialogTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  💬 Messaggi in tempo reale
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isTechnician && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuoteDialogOpen(true)}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Crea Preventivo
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nessun messaggio ancora</p>
                <p className="text-xs mt-1">Inizia la conversazione!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwnMessage = msg.sender_id === currentUserId;
                const messageQuote = msg.quote_id ? quotes[msg.quote_id] : null;
                
                return (
                  <div key={msg.id} className="space-y-2">
                    <div
                      className={`flex ${
                        isOwnMessage ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          isOwnMessage
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {msg.image_url && (
                          <img
                            src={msg.image_url}
                            alt="Allegato"
                            className="rounded-lg mb-2 max-w-full cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(msg.image_url!, "_blank")}
                          />
                        )}
                        <p className="text-sm break-words">{msg.message}</p>
                        <p
                          className={`text-xs mt-1 ${
                            isOwnMessage
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          }`}
                        >
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    {messageQuote && (
                      <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                        <div className="max-w-[85%]">
                          <QuoteInChatCard
                            quote={messageQuote}
                            isOwnQuote={isOwnMessage}
                            onAccept={handleAcceptQuote}
                            onReject={handleRejectQuote}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          {imagePreviews.length > 0 && (
            <div className="mb-3 flex gap-2 flex-wrap">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative inline-block">
                  <img
                    src={preview}
                    alt={`Anteprima ${index + 1}`}
                    className="max-h-24 rounded-lg"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5"
                    onClick={() => removeImage(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          <form onSubmit={handleSend} className="flex gap-2 items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
              disabled={isSending}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Input
              placeholder="Scrivi un messaggio..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={isSending}
              className="flex-1"
            />
            <Button
              type="submit"
              size="icon"
              disabled={(!newMessage.trim() && selectedImages.length === 0) || isSending}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </DialogContent>

      <CreateQuoteDialog
        open={quoteDialogOpen}
        onOpenChange={setQuoteDialogOpen}
        job={jobData}
        technicianId={technicianId || null}
        onQuoteCreated={handleQuoteCreated}
      />
    </Dialog>
  );
}
