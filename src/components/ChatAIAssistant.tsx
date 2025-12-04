import { useState, useRef, useEffect } from "react";
import { Bot, Send, X, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

interface JobContext {
  problemType?: string;
  possibleCause?: string;
  urgencyLevel?: string;
  aiAnalysis?: string;
  estimatedCostMin?: number;
  estimatedCostMax?: number;
  estimatedHours?: number;
}

interface ChatAIAssistantProps {
  jobContext: JobContext;
  isTechnician: boolean;
  onSuggestion?: (text: string) => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-ai-assistant`;

export function ChatAIAssistant({ jobContext, isTechnician, onSuggestion }: ChatAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = async (userMessage: string) => {
    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);
    setInput("");

    let assistantContent = "";

    try {
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          jobContext,
          userType: isTechnician ? "technician" : "customer",
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to start stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      // Add assistant message placeholder
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
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
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                return updated;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("AI chat error:", error);
      toast({
        title: "Errore",
        description: "Impossibile contattare l'assistente AI",
        variant: "destructive",
      });
      // Remove failed message
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    streamChat(input.trim());
  };

  const quickPrompts = isTechnician
    ? [
        "Suggerisci un preventivo",
        "Consigli tecnici",
        "Come comunicare il costo",
      ]
    : [
        "Cosa significa questa diagnosi?",
        "Domande da fare al tecnico",
        "È giusto questo prezzo?",
      ];

  return (
    <>
      {/* AI Assistant Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-500/30 hover:border-violet-500/50"
      >
        <Sparkles className="h-4 w-4 text-violet-500" />
        <span className="hidden sm:inline">AI Assistant</span>
      </Button>

      {/* AI Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed inset-4 sm:absolute sm:inset-auto sm:right-0 sm:top-0 sm:bottom-0 sm:w-80 bg-background border rounded-lg shadow-xl flex flex-col z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-violet-500/10 to-purple-500/10">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-sm">AI Assistant</p>
                  <p className="text-xs text-muted-foreground">
                    {isTechnician ? "Supporto tecnico" : "Aiuto cliente"}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-3" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="text-center py-8 space-y-4">
                  <Bot className="h-12 w-12 mx-auto text-violet-500/50" />
                  <div>
                    <p className="text-sm font-medium">Ciao! Sono il tuo assistente AI</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isTechnician
                        ? "Posso aiutarti con consigli tecnici e preventivi"
                        : "Posso aiutarti a capire la diagnosi e i costi"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {quickPrompts.map((prompt, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => streamChat(prompt)}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {msg.content || (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Use suggestion button */}
            {messages.length > 0 && messages[messages.length - 1].role === "assistant" && onSuggestion && (
              <div className="px-3 pb-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    const lastAssistant = messages.filter(m => m.role === "assistant").pop();
                    if (lastAssistant) {
                      onSuggestion(lastAssistant.content);
                      toast({
                        title: "Suggerimento copiato",
                        description: "Puoi modificarlo prima di inviare",
                      });
                    }
                  }}
                >
                  Usa questo testo nella chat
                </Button>
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Chiedi all'AI..."
                  disabled={isLoading}
                  className="text-sm"
                />
                <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
