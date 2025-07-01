
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Bot, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: number;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const AiAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: 'assistant',
      content: 'Hello! I can help you analyze your uploaded CSV data. Try asking questions like "How many records are there?", "What are the column names?", or "What is the average value in column X?"',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: messages.length + 1,
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentQuestion = inputValue;
    setInputValue("");
    setLoading(true);

    try {
      console.log('Sending question to AI assistant:', currentQuestion);
      
      const response = await fetch('https://kfdtbfksiwkyibqniauh.functions.supabase.co/ai-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: currentQuestion
        }),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('AI response:', data);
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      const assistantMessage: Message = {
        id: messages.length + 2,
        type: 'assistant',
        content: data.answer || 'I apologize, but I could not generate a response.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Assistant Error:', error);
      toast({
        title: "AI Assistant Error",
        description: `Could not get response from AI assistant: ${error.message}`,
        variant: "destructive",
      });
      
      // Add error message to chat
      const errorMessage: Message = {
        id: messages.length + 2,
        type: 'assistant',
        content: `Sorry, I encountered an error while processing your question: ${error.message}. Please try again.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {messages.map((message) => (
          <Card key={message.id} className={`${
            message.type === 'user' ? 'ml-12' : 'mr-12'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className={`rounded-full p-2 ${
                  message.type === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-secondary text-secondary-foreground'
                }`}>
                  {message.type === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {loading && (
          <Card className="mr-12">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="rounded-full p-2 bg-secondary text-secondary-foreground">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex space-x-2">
        <Input
          placeholder="Ask a question about your uploaded CSV data..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
        <Button
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || loading}
          size="sm"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <div className="text-xs text-gray-500">
        <p>Example questions:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>"How many records are in my dataset?"</li>
          <li>"What are the column names?"</li>
          <li>"What is the average value in the age column?"</li>
          <li>"Show me summary statistics for my data"</li>
          <li>"Are there any missing values?"</li>
        </ul>
      </div>
    </div>
  );
};
