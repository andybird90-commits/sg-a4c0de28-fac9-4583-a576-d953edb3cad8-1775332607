import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { messageService, MessageWithDetails } from "@/services/messageService";
import { Inbox, Send, Reply, Users, AtSign, Loader2, Trash2 } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { useStaffStatus } from "@/hooks/useStaffStatus";
import { renderTextWithMentions } from "@/lib/formatMentions";

export default function MessagesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, currentOrg } = useApp();
  const { isStaff } = useStaffStatus();
  
  // Map context values to match component expectations
  const profile = user;
  const organisation = currentOrg;
  
  const [inbox, setInbox] = useState<MessageWithDetails[]>([]);
  const [sent, setSent] = useState<MessageWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<MessageWithDetails | null>(null);
  const [activeTab, setActiveTab] = useState("inbox");
  const [selectedMessage, setSelectedMessage] = useState<MessageWithDetails | null>(null);
  const [selectedMessageType, setSelectedMessageType] = useState<"inbox" | "sent">("inbox");
  const [detailOpen, setDetailOpen] = useState(false);

  // Compose form state
  const [recipients, setRecipients] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  // Mention autocomplete
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionResults, setMentionResults] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [showMentions, setShowMentions] = useState(false);

  useEffect(() => {
    if (!profile) {
      router.push("/auth/login");
      return;
    }
    loadMessages();
  }, [profile]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const [inboxData, sentData] = await Promise.all([
        messageService.getInboxMessages(),
        messageService.getSentMessages(),
      ]);
      setInbox(inboxData);
      setSent(sentData);
    } catch (error) {
      console.error("Error loading messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompose = () => {
    setReplyTo(null);
    setRecipients("");
    setSubject("");
    setBody("");
    setComposeOpen(true);
  };

  const handleReply = (message: MessageWithDetails) => {
    setReplyTo(message);
    setSubject(`Re: ${message.subject}`);
    setBody("");
    setRecipients(message.sender?.id || "");
    setComposeOpen(true);
  };

  const handleSend = async () => {
    if (!organisation?.id) {
      toast({
        title: "Error",
        description: "Organization context required",
        variant: "destructive",
      });
      return;
    }

    if (!recipients.trim() || !subject.trim() || !body.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setSending(true);
      
      // Parse recipient IDs (comma-separated)
      const recipientIds = recipients.split(",").map(r => r.trim()).filter(Boolean);
      
      await messageService.sendMessage(
        organisation.id,
        recipientIds,
        subject,
        body,
        replyTo?.id
      );

      toast({
        title: "Success",
        description: "Message sent successfully",
      });

      setComposeOpen(false);
      loadMessages();
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    try {
      await messageService.markMessageAsRead(messageId);
      loadMessages();
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  // Handle @ mentions
  const handleBodyChange = async (value: string) => {
    setBody(value);
    
    // Check for @ symbol
    const lastAtIndex = value.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const textAfterAt = value.substring(lastAtIndex + 1);
      const spaceIndex = textAfterAt.indexOf(" ");
      const searchTerm = spaceIndex === -1 ? textAfterAt : textAfterAt.substring(0, spaceIndex);
      
      if (searchTerm.length > 0) {
        setMentionSearch(searchTerm);
        const results = await messageService.searchUsersForMention(searchTerm, organisation?.id);
        setMentionResults(results);
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (user: { id: string; name: string }) => {
    const lastAtIndex = body.lastIndexOf("@");
    const beforeAt = body.substring(0, lastAtIndex);
    const afterAt = body.substring(lastAtIndex + 1);
    const spaceIndex = afterAt.indexOf(" ");
    const remaining = spaceIndex === -1 ? "" : afterAt.substring(spaceIndex);
    
    const newBody = `${beforeAt}@[${user.name}](${user.id})${remaining} `;
    setBody(newBody);
    setShowMentions(false);
  };

  const MessageCard = ({
    message,
    type,
    onOpen,
  }: {
    message: MessageWithDetails;
    type: "inbox" | "sent";
    onOpen: () => void;
  }) => {
    const isUnread =
      type === "inbox" &&
      !message.recipients.find((r) => r.recipient_id === profile?.id)?.read_at;

    return (
      <Card
        className={`w-full max-w-full cursor-pointer hover:bg-gray-50 transition-colors ${
          isUnread ? "border-l-4 border-l-blue-500" : ""
        }`}
        onClick={() => {
          if (type === "inbox" && isUnread) {
            handleMarkAsRead(message.id);
          }
          onOpen();
        }}
      >
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar>
                <AvatarFallback>
                  {type === "inbox"
                    ? message.sender?.full_name?.[0] || "?"
                    : message.recipients[0]?.recipient?.full_name?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base break-words line-clamp-2">
                    {type === "inbox"
                      ? message.sender?.full_name || "Unknown"
                      : `To: ${message.recipients
                          .map((r) => r.recipient?.full_name)
                          .join(", ")}`}
                  </CardTitle>
                  {isUnread && (
                    <Badge variant="default" className="text-xs">
                      New
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-sm text-gray-600 break-words line-clamp-2">
                  {message.subject}
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-row items-center justify-between gap-2 sm:flex-col sm:items-end">
              <span className="text-xs text-gray-500">
                {new Date(message.created_at).toLocaleDateString()}
              </span>
              {type === "inbox" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReply(message);
                  }}
                >
                  <Reply className="h-4 w-4 mr-1" />
                  Reply
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 break-words line-clamp-2">
            {renderTextWithMentions(message.body)}
          </p>
          {message.mentions && message.mentions.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <AtSign className="h-3 w-3 text-blue-500" />
              <span className="text-xs text-blue-500 break-words">
                Mentioned:{" "}
                {message.mentions
                  .map((m) => m.mentioned_user?.full_name)
                  .join(", ")}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (!profile) return null;

  return (
    <>
      {isStaff ? (
        <StaffLayout>
          <div className="container mx-auto py-8 px-4 max-w-6xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold">Messages</h1>
                <p className="text-gray-600">Send and receive messages with staff and clients</p>
              </div>
              <Button onClick={handleCompose}>
                <Send className="h-4 w-4 mr-2" />
                Compose
              </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="inbox" className="flex items-center gap-2">
                  <Inbox className="h-4 w-4" />
                  Inbox ({inbox.filter(m => !m.recipients.find(r => r.recipient_id === profile?.id)?.read_at).length})
                </TabsTrigger>
                <TabsTrigger value="sent" className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Sent ({sent.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="inbox" className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                  </div>
                ) : inbox.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Inbox className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600">No messages in your inbox</p>
                    </CardContent>
                  </Card>
                ) : (
                  inbox.map(message => (
                    <MessageCard
                      key={message.id}
                      message={message}
                      type="inbox"
                      onOpen={() => {
                        setSelectedMessage(message);
                        setSelectedMessageType("inbox");
                        setDetailOpen(true);
                      }}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="sent" className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                  </div>
                ) : sent.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Send className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600">No sent messages</p>
                    </CardContent>
                  </Card>
                ) : (
                  sent.map(message => (
                    <MessageCard
                      key={message.id}
                      message={message}
                      type="sent"
                      onOpen={() => {
                        setSelectedMessage(message);
                        setSelectedMessageType("sent");
                        setDetailOpen(true);
                      }}
                    />
                  ))
                )}
              </TabsContent>
            </Tabs>

            {/* Compose Dialog */}
            <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{replyTo ? "Reply to Message" : "Compose Message"}</DialogTitle>
                  <DialogDescription>
                    Send a message to staff or clients. Use @mentions to notify specific users.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Recipients (User IDs, comma-separated)</label>
                    <Input
                      placeholder="Enter user IDs..."
                      value={recipients}
                      onChange={(e) => setRecipients(e.target.value)}
                      disabled={!!replyTo}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Tip: Use the search feature to find user IDs
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Subject</label>
                    <Input
                      placeholder="Enter subject..."
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>

                  <div className="relative">
                    <label className="text-sm font-medium mb-1 block">Message</label>
                    <Textarea
                      placeholder="Type your message... Use @ to mention someone"
                      value={body}
                      onChange={(e) => handleBodyChange(e.target.value)}
                      rows={8}
                    />
                    
                    {/* Mention Autocomplete */}
                    {showMentions && mentionResults.length > 0 && (
                      <Card className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto">
                        <CardContent className="p-0">
                          {mentionResults.map(user => (
                            <button
                              key={user.id}
                              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                              onClick={() => insertMention(user)}
                            >
                              <AtSign className="h-4 w-4 text-blue-500" />
                              <span>{user.name}</span>
                              <Badge variant="outline" className="ml-auto text-xs">{user.role}</Badge>
                            </button>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setComposeOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSend} disabled={sending}>
                    {sending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </StaffLayout>
      ) : (
        <Layout>
          <div className="container mx-auto py-8 px-4 max-w-6xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold">Messages</h1>
                <p className="text-gray-600">Send and receive messages with staff and clients</p>
              </div>
              <Button onClick={handleCompose}>
                <Send className="h-4 w-4 mr-2" />
                Compose
              </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="inbox" className="flex items-center gap-2">
                  <Inbox className="h-4 w-4" />
                  Inbox ({inbox.filter(m => !m.recipients.find(r => r.recipient_id === profile?.id)?.read_at).length})
                </TabsTrigger>
                <TabsTrigger value="sent" className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Sent ({sent.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="inbox" className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                  </div>
                ) : inbox.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Inbox className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600">No messages in your inbox</p>
                    </CardContent>
                  </Card>
                ) : (
                  inbox.map(message => (
                    <MessageCard
                      key={message.id}
                      message={message}
                      type="inbox"
                      onOpen={() => {
                        setSelectedMessage(message);
                        setSelectedMessageType("inbox");
                        setDetailOpen(true);
                      }}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="sent" className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                  </div>
                ) : sent.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Send className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600">No sent messages</p>
                    </CardContent>
                  </Card>
                ) : (
                  sent.map(message => (
                    <MessageCard
                      key={message.id}
                      message={message}
                      type="sent"
                      onOpen={() => {
                        setSelectedMessage(message);
                        setSelectedMessageType("sent");
                        setDetailOpen(true);
                      }}
                    />
                  ))
                )}
              </TabsContent>
            </Tabs>

            {/* Compose Dialog */}
            <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{replyTo ? "Reply to Message" : "Compose Message"}</DialogTitle>
                  <DialogDescription>
                    Send a message to staff or clients. Use @mentions to notify specific users.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Recipients (User IDs, comma-separated)</label>
                    <Input
                      placeholder="Enter user IDs..."
                      value={recipients}
                      onChange={(e) => setRecipients(e.target.value)}
                      disabled={!!replyTo}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Tip: Use the search feature to find user IDs
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Subject</label>
                    <Input
                      placeholder="Enter subject..."
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>

                  <div className="relative">
                    <label className="text-sm font-medium mb-1 block">Message</label>
                    <Textarea
                      placeholder="Type your message... Use @ to mention someone"
                      value={body}
                      onChange={(e) => handleBodyChange(e.target.value)}
                      rows={8}
                    />
                    
                    {/* Mention Autocomplete */}
                    {showMentions && mentionResults.length > 0 && (
                      <Card className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto">
                        <CardContent className="p-0">
                          {mentionResults.map(user => (
                            <button
                              key={user.id}
                              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                              onClick={() => insertMention(user)}
                            >
                              <AtSign className="h-4 w-4 text-blue-500" />
                              <span>{user.name}</span>
                              <Badge variant="outline" className="ml-auto text-xs">{user.role}</Badge>
                            </button>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setComposeOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSend} disabled={sending}>
                    {sending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </Layout>
      )}

      {/* Message Detail Dialog (shared for both staff and non-staff views) */}
      <Dialog
        open={detailOpen && !!selectedMessage}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setSelectedMessage(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm text-gray-500">
                  {selectedMessage
                    ? selectedMessage.sender?.full_name || "Unknown sender"
                    : ""}
                </span>
                <span>{selectedMessage?.subject}</span>
              </div>
              {selectedMessage && (
                <span className="text-xs text-gray-400">
                  {new Date(selectedMessage.created_at).toLocaleString()}
                </span>
              )}
            </DialogTitle>
            {selectedMessage?.entity_type && selectedMessage?.entity_id && (
              <DialogDescription>
                Linked to {selectedMessage.entity_type} –{" "}
                <span className="font-mono text-xs">
                  {selectedMessage.entity_id}
                </span>
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md bg-gray-50 p-4 text-sm text-gray-800 whitespace-pre-wrap">
              {renderTextWithMentions(selectedMessage?.body || "")}
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between">
            <div className="flex gap-2">
              {selectedMessageType === "inbox" && selectedMessage && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex items-center gap-1"
                  onClick={async () => {
                    try {
                      await messageService.deleteMessageForCurrentUser(
                        selectedMessage.id
                      );
                      toast({
                        title: "Message deleted",
                        description: "The message has been removed from your inbox.",
                      });
                      setDetailOpen(false);
                      setSelectedMessage(null);
                      loadMessages();
                    } catch (error) {
                      console.error("Error deleting message:", error);
                      toast({
                        title: "Error",
                        description: "Failed to delete message",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {selectedMessage && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    handleReply(selectedMessage);
                    setDetailOpen(false);
                  }}
                >
                  <Reply className="h-4 w-4 mr-1" />
                  Reply
                </Button>
              )}
              <Button type="button" onClick={() => setDetailOpen(false)}>
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}